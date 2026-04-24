-- ── Recipe Likes ──────────────────────────────────────────────────────
--
-- Plus members (and anyone who can see a public recipe) can "like" a
-- community-shared recipe. This file introduces:
--
--   • public.recipe_likes         — one row per (user, recipe) like
--   • public.recipes.like_count   — denormalised counter so list views
--                                   don't need an aggregate on every read
--   • A trigger to keep like_count in sync with recipe_likes
--   • RLS policies so:
--       - users can only see likes for recipes they can already see
--         (their own, or public ones)
--       - users can only insert likes attributed to themselves, on
--         recipes that are currently public
--       - users can only delete their own likes
-- ─────────────────────────────────────────────────────────────────────

-- 1. Denormalised counter on recipes
alter table public.recipes
  add column if not exists like_count int default 0 not null;

-- 2. Likes table
create table if not exists public.recipe_likes (
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  user_id   uuid references public.profiles(id) on delete cascade not null,
  liked_at  timestamptz default now() not null,
  primary key (recipe_id, user_id)
);

create index if not exists recipe_likes_recipe_id_idx on public.recipe_likes(recipe_id);
create index if not exists recipe_likes_user_id_idx on public.recipe_likes(user_id);

-- 3. Trigger to maintain recipes.like_count
create or replace function public.bump_recipe_like_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    update public.recipes
    set like_count = like_count + 1
    where id = new.recipe_id;
  elsif tg_op = 'DELETE' then
    update public.recipes
    set like_count = greatest(0, like_count - 1)
    where id = old.recipe_id;
  end if;
  return null;
end;
$$;

drop trigger if exists recipe_likes_count_trigger on public.recipe_likes;
create trigger recipe_likes_count_trigger
  after insert or delete on public.recipe_likes
  for each row execute function public.bump_recipe_like_count();

-- 4. RLS
alter table public.recipe_likes enable row level security;

drop policy if exists "Users can see public recipe likes" on public.recipe_likes;
create policy "Users can see public recipe likes"
  on public.recipe_likes for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (r.visibility = 'public' or r.user_id = auth.uid())
    )
  );

drop policy if exists "Users can like public recipes" on public.recipe_likes;
create policy "Users can like public recipes"
  on public.recipe_likes for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and r.visibility = 'public'
    )
  );

drop policy if exists "Users can unlike their own likes" on public.recipe_likes;
create policy "Users can unlike their own likes"
  on public.recipe_likes for delete
  using (user_id = auth.uid());
