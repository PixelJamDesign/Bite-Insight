-- Allow any authenticated user to read the profile of a user who has
-- published at least one public recipe. Scoped tightly via EXISTS so
-- we don't accidentally open profile data for private users.
--
-- The community feed and viewer-mode recipe detail use this to show
-- the author's display name and avatar_url alongside their recipes.

drop policy if exists "Authors of public recipes are visible" on public.profiles;
create policy "Authors of public recipes are visible"
  on public.profiles for select
  using (
    exists (
      select 1 from public.recipes r
      where r.user_id = profiles.id
        and r.visibility = 'public'
    )
  );
