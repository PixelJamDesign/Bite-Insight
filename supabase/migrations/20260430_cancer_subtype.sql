-- Add cancer_subtype to profiles + family_profiles for v1.6.0.
--
-- Mirrors the existing ibs_subtype column. Only meaningful when the
-- corresponding health_conditions array contains 'cancer'. Stored as
-- a free-form text column so we can extend the subtype set without
-- another migration; the application enforces the allowed values
-- (CancerSubtypeKey: colorectal, breast, prostate, stomach, other).

alter table public.profiles
  add column if not exists cancer_subtype text;

alter table public.family_profiles
  add column if not exists cancer_subtype text;

comment on column public.profiles.cancer_subtype is
  'Cancer subtype (colorectal | breast | prostate | stomach | other). '
  'Only meaningful when health_conditions contains ''cancer''. '
  'Drives subtype-specific ingredient flags and nutrient threshold overrides.';

comment on column public.family_profiles.cancer_subtype is
  'Cancer subtype for this family member. Same semantics as profiles.cancer_subtype.';
