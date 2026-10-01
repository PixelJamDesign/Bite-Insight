-- Security fix: forbid_direct_family_link_writes let every write through.
--
-- The function is SECURITY DEFINER and owned by postgres, so inside it
-- current_user is always 'postgres'. The Studio/psql escape hatch
-- (`current_user in ('postgres', 'supabase_admin')`) therefore matched for
-- every caller, and any signed-in user could set linked_user_id on their own
-- family_profiles row to someone else's account, which get_family_members()
-- then mirrors (name, photo, health conditions, allergies, pregnancy).
--
-- session_user is NOT changed by SECURITY DEFINER: it's the role that opened
-- the connection. App traffic arrives through PostgREST as 'authenticator';
-- Studio / psql connect as postgres or supabase_admin.
--
-- Service role is detected with auth.role(), which reads the current
-- request.jwt.claims (and falls back to the older per-claim setting).

create or replace function public.forbid_direct_family_link_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role (Edge Functions: accept / unlink) is allowed.
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Direct database sessions (Studio, psql) for manual fixes.
  if session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.linked_user_id is not null or new.linked_at is not null then
      raise exception 'linked_user_id can only be set through the invite flow';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.linked_user_id is distinct from old.linked_user_id
       or new.linked_at   is distinct from old.linked_at then
      raise exception 'linked_user_id can only be changed through the invite flow';
    end if;
  end if;

  return new;
end;
$$;
