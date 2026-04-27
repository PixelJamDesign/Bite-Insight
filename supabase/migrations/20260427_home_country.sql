-- Add home_country_code to profiles.
--
-- Captured ONCE at signup from the user's IP-based geolocation
-- (see supabase/functions/detect-country). This is the authoritative
-- "where the user actually is" value used to gate region-locked
-- features on the freemium plan — UK signups get the UK barcode
-- scanner free, US signups get the US scanner free, and so on. All
-- other regions stay Plus-gated.
--
-- Format: ISO 3166-1 alpha-2, lowercase ('gb', 'us', 'fr', ...).
-- A special value of 'world' means the user signed up from a
-- country we don't yet support a dedicated scanner for, so they
-- default to the OFF Global database.
--
-- Not user-editable from the app — we don't want users self-claiming
-- a country they're not in to unlock that scanner. If a genuine
-- traveller signs up in the wrong country we'll handle that via a
-- 24-hour grace-period link on the success screen (Phase 3).

alter table public.profiles
  add column if not exists home_country_code text;

-- Backfill every existing row to 'gb'. Up to and including this
-- migration the entire user base signed up while the app was a
-- UK-only soft launch, so the only correct answer is GB. This
-- avoids leaving any historical user without a region (which
-- would otherwise default them to 'world' in Phase 2 and lock
-- them out of the UK scanner they were already using).
update public.profiles
  set home_country_code = 'gb'
  where home_country_code is null;

-- Constraint: ISO 3166-1 alpha-2 lowercase, or the sentinel 'world'.
alter table public.profiles
  add constraint profiles_home_country_code_format
  check (
    home_country_code is null
    or home_country_code = 'world'
    or home_country_code ~ '^[a-z]{2}$'
  );

comment on column public.profiles.home_country_code is
  'ISO 3166-1 alpha-2 country code (lowercase) detected at signup via IP geo. Used to gate the freemium region-scoped features. Set once, not user-editable from the app.';
