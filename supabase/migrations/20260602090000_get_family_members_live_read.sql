-- Live-read for linked family members.
--
-- Returns the caller's family members. For LINKED members (linked_user_id
-- set), the health/preference fields are overlaid live from the linked
-- account's own profiles row — the owner sees the member's real, current
-- data instead of the static managed columns.
--
-- Security-definer + filtered to auth.uid()'s own family rows, so an owner
-- can only ever see linked-member data for members they own. No blanket
-- cross-account profile reads. Identity fields (name, relationship,
-- sort_order) stay as the owner's managed values.
create or replace function public.get_family_members()
returns setof public.family_profiles
language sql
security definer
set search_path = public
stable
as $$
  select
    fp.id,
    fp.user_id,
    fp.name,
    case when fp.linked_user_id is not null then lp.avatar_url else fp.avatar_url end,
    case when fp.linked_user_id is not null then lp.health_conditions else fp.health_conditions end,
    case when fp.linked_user_id is not null then lp.allergies else fp.allergies end,
    -- profiles.dietary_preferences is text[]; family_profiles' is jsonb. Cast.
    case when fp.linked_user_id is not null then to_jsonb(lp.dietary_preferences) else fp.dietary_preferences end,
    fp.created_at,
    fp.updated_at,
    fp.relationship,
    fp.sort_order,
    case when fp.linked_user_id is not null then lp.nutrient_watchlist else fp.nutrient_watchlist end,
    case when fp.linked_user_id is not null then lp.ibs_subtype else fp.ibs_subtype end,
    case when fp.linked_user_id is not null then lp.pregnancy_due_date else fp.pregnancy_due_date end,
    case when fp.linked_user_id is not null then lp.pregnancy_status else fp.pregnancy_status end,
    case when fp.linked_user_id is not null then lp.liked_ingredients else fp.liked_ingredients end,
    case when fp.linked_user_id is not null then lp.disliked_ingredients else fp.disliked_ingredients end,
    case when fp.linked_user_id is not null then lp.flagged_ingredients else fp.flagged_ingredients end,
    fp.linked_user_id,
    fp.linked_at,
    case when fp.linked_user_id is not null then lp.cancer_subtype else fp.cancer_subtype end,
    case when fp.linked_user_id is not null then lp.cf_subtype else fp.cf_subtype end
  from public.family_profiles fp
  left join public.profiles lp on lp.id = fp.linked_user_id
  where fp.user_id = auth.uid()
  order by fp.sort_order nulls last, fp.created_at;
$$;

grant execute on function public.get_family_members() to authenticated;
