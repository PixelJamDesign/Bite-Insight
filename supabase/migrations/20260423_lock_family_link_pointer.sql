-- 1.5.0 — Lock the family_profiles.linked_user_id column against direct writes.
--
-- The column was added by 20260423_family_ingredient_prefs.sql as a
-- forward-compat pointer. Until the invite-and-accept flow ships, no
-- client-side write should be able to populate or change it.
--
-- This trigger rejects any INSERT or UPDATE that attempts to set
-- linked_user_id (or linked_at) unless the caller is the service role —
-- i.e. only a trusted backend Edge Function running with the service key
-- can link a family_profiles row to a real account. Authenticated end
-- users writing via the anon key will be blocked with a clear error.
--
-- When the invite flow is built, the accept-invite Edge Function will
-- run as service role and this trigger's is-service-role check will
-- allow its write through.

BEGIN;

CREATE OR REPLACE FUNCTION public.forbid_direct_family_link_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- The service role is allowed to set the link (used by the future
  -- invite-accept Edge Function). Everyone else must leave these columns
  -- as NULL on INSERT and unchanged on UPDATE.
  IF caller_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.linked_user_id IS NOT NULL OR NEW.linked_at IS NOT NULL THEN
      RAISE EXCEPTION 'linked_user_id can only be set through the invite flow';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.linked_user_id IS DISTINCT FROM OLD.linked_user_id
       OR NEW.linked_at   IS DISTINCT FROM OLD.linked_at THEN
      RAISE EXCEPTION 'linked_user_id can only be changed through the invite flow';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS family_profiles_forbid_direct_link
  ON public.family_profiles;

CREATE TRIGGER family_profiles_forbid_direct_link
  BEFORE INSERT OR UPDATE ON public.family_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.forbid_direct_family_link_writes();

COMMIT;
