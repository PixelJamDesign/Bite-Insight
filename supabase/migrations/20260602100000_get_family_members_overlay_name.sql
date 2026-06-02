-- Extend get_family_members() to also overlay the member's name from
-- their linked account. The invite path creates a placeholder name (the
-- email local-part, or "New member" for a link invite); once the person
-- links, their real account name shows. Falls back to the owner's managed
-- label when the linked account has no name set.
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
    case when fp.linked_user_id is not null then coalesce(nullif(lp.full_name, ''), fp.name) else fp.name end,
    case when fp.linked_user_id is not null then lp.avatar_url else fp.avatar_url end,
    case when fp.linked_user_id is not null then lp.health_conditions else fp.health_conditions end,
    case when fp.linked_user_id is not null then lp.allergies else fp.allergies end,
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
