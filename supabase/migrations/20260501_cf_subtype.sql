-- Add cf_subtype to profiles + family_profiles for v1.6.0.
--
-- Mirrors ibs_subtype and cancer_subtype. Only meaningful when the
-- corresponding health_conditions array contains 'cf'. Free-form text;
-- the application enforces the allowed values (CfSubtypeKey:
-- standard | modulator | cfrd).
--
-- Subtype semantics:
--   standard   — high calorie/fat needed; salt is a boost
--   modulator  — CFTR modulator therapy has normalised absorption
--   cfrd       — CF-Related Diabetes; high-fat maintained but carb-aware

alter table public.profiles
  add column if not exists cf_subtype text;

alter table public.family_profiles
  add column if not exists cf_subtype text;

comment on column public.profiles.cf_subtype is
  'Cystic Fibrosis subtype (standard | modulator | cfrd). Only meaningful '
  'when health_conditions contains ''cf''. Drives subtype-specific '
  'ingredient flags and inverted-logic nutrient threshold overrides.';

comment on column public.family_profiles.cf_subtype is
  'Cystic Fibrosis subtype for this family member. Same semantics as profiles.cf_subtype.';
