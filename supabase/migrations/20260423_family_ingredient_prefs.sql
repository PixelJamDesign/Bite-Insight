-- 1.5.0 — Per-family-member ingredient preferences + forward-compat link pointer.
--
-- Adds:
--   • liked_ingredients / disliked_ingredients / flagged_ingredients arrays
--     to family_profiles so each managed family member has their own lists.
--   • linked_user_id + linked_at on family_profiles. Nullable pointer that
--     lets a family row be "upgraded" to a linked member (a real account
--     holder) in a future release — NULL means the current managed-profile
--     behaviour is unchanged.
--   • category text on ingredients so the preferences panel can filter
--     by Fruit / Vegetables / Grains / ... (populated via a later seed).
--   • family_profile_id on ingredient_flag_reasons with a per-scope unique
--     index so both the account owner and each family member can have their
--     own reason rows for the same ingredient.
--
-- Safe to re-run: every ALTER uses IF NOT EXISTS / IF EXISTS guards.

BEGIN;

-- ── family_profiles: ingredient preferences + link pointer ────────────────
ALTER TABLE public.family_profiles
  ADD COLUMN IF NOT EXISTS liked_ingredients    uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS disliked_ingredients uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS flagged_ingredients  uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS linked_user_id uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_at timestamptz NULL;

-- Ensure existing rows have empty arrays rather than NULL (RLS-safe).
UPDATE public.family_profiles
   SET liked_ingredients    = COALESCE(liked_ingredients,    '{}'::uuid[]),
       disliked_ingredients = COALESCE(disliked_ingredients, '{}'::uuid[]),
       flagged_ingredients  = COALESCE(flagged_ingredients,  '{}'::uuid[])
 WHERE liked_ingredients    IS NULL
    OR disliked_ingredients IS NULL
    OR flagged_ingredients  IS NULL;

-- ── ingredients: category for filter tabs ─────────────────────────────────
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS category text;

-- ── ingredient_flag_reasons: per-member scope ─────────────────────────────
ALTER TABLE public.ingredient_flag_reasons
  ADD COLUMN IF NOT EXISTS family_profile_id uuid
    REFERENCES public.family_profiles(id) ON DELETE CASCADE;

-- The old unique constraint was (user_id, ingredient_id) — now we need
-- uniqueness per (owner, target-scope, ingredient), where target-scope is
-- either the owner themselves (family_profile_id IS NULL) or a specific
-- family member. The COALESCE expression makes NULL act like an empty
-- string for index purposes so the constraint still fires for owner rows.
ALTER TABLE public.ingredient_flag_reasons
  DROP CONSTRAINT IF EXISTS ingredient_flag_reasons_user_id_ingredient_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS ingredient_flag_reasons_scope_unique
  ON public.ingredient_flag_reasons (
    user_id,
    ingredient_id,
    COALESCE(family_profile_id::text, '')
  );

COMMIT;
