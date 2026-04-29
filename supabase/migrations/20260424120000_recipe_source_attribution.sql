-- Track which public recipe a "saved" or "duplicated" recipe came from
-- so we can show attribution ("Inspired by Glenn's Spaghetti Bolognese")
-- and later power "my remixes" / "trending" signals without needing a
-- separate join table.
alter table public.recipes
  add column if not exists source_recipe_id uuid references public.recipes(id) on delete set null;

create index if not exists recipes_source_recipe_id_idx on public.recipes(source_recipe_id);
