-- Persist home_country_code on signup via the auth trigger.
--
-- Background:
--   The previous flow detected country client-side AFTER calling
--   supabase.auth.signUp() and then upserted profiles.home_country_code.
--   When email confirmation is enabled the client has no session at
--   that point (data.session === null), so the upsert is silently
--   rejected by the "Users can insert own profile" RLS policy
--   (auth.uid() returns NULL without a JWT). Result: every fresh
--   signup landed with home_country_code = NULL and got bumped to
--   Global by regionContext, regardless of where they actually were.
--
-- Fix:
--   The mobile client now passes the detected country code through
--   options.data.home_country_code on signUp, which Supabase stores
--   on auth.users.raw_user_meta_data. This trigger reads it from
--   there and writes it directly into profiles. Trigger runs as
--   security definer so RLS doesn't apply.
--
--   Falls back to NULL if the metadata key isn't present (e.g.
--   older clients still on the previous flow). Those rows can still
--   be patched by the existing post-signup upsert when the session
--   IS present (no email confirmation).

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, home_country_code)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    -- Lowercased for the profiles_home_country_code_format check
    -- constraint. NULL is allowed, so missing metadata is safe.
    nullif(lower(new.raw_user_meta_data ->> 'home_country_code'), '')
  );
  return new;
end;
$$;
