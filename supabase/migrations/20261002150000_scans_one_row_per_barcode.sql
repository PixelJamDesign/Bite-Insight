-- One scan-history row per product per user.
--
-- Opening a product used to save it twice at once (scanner/search and the
-- product page), so some barcodes ended up in history twice. The app now
-- queues those saves (lib/scanHistory.ts); this merges the duplicates that
-- already exist and stops older app versions adding more.

-- For each user + barcode, keep the most recently scanned row.
create temporary table scan_dupes on commit drop as
select id, keep_id
from (
  select id,
         first_value(id) over (
           partition by user_id, barcode
           order by scanned_at desc, id
         ) as keep_id
  from public.scans
  where barcode is not null
) ranked
where id <> keep_id;

-- Point anything that used a duplicate at the row we keep, so no recipe
-- ingredient or planned meal loses its link.
update public.meal_plan_entries m
set scan_id = d.keep_id
from scan_dupes d
where m.scan_id = d.id;

update public.recipe_ingredients r
set scan_id = d.keep_id
from scan_dupes d
where r.scan_id = d.id;

delete from public.scans s
using scan_dupes d
where s.id = d.id;

-- From now on the database refuses a second row for the same product.
-- An older app's racing second insert just fails (and is logged); the
-- first one has already saved the scan.
create unique index if not exists scans_user_barcode_key
  on public.scans (user_id, barcode)
  where barcode is not null;
