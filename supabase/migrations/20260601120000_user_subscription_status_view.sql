-- Admin-only visibility view classifying every user's subscription state.
-- Computed live from profiles, so it stays accurate as the RevenueCat
-- webhook feeds is_plus / trial dates / renewal dates.
--
-- status values:
--   vip           — is_vip (lifetime comp, highest precedence)
--   in_trial      — plus, trial not expired, not yet converted to paid
--   paid_active   — plus from a real paid subscription
--   trial_expired — trialed in the past but lapsed without converting
--   free          — never plus, never trialed
--
-- NOT exposed to anon / authenticated — revoked below so app users
-- can't read other people's emails / subscription state through it.
create or replace view public.user_subscription_status as
select
  p.id as user_id,
  u.email,
  p.is_plus,
  p.is_vip,
  p.trial_started_at,
  p.trial_ends_at,
  p.subscription_renewal_date,
  (p.trial_started_at is not null) as has_trialed,
  case
    when p.is_vip then 'vip'
    when p.is_plus
         and p.trial_ends_at is not null
         and p.trial_ends_at > now()
         and (p.subscription_renewal_date is null
              or p.subscription_renewal_date <= p.trial_ends_at)
      then 'in_trial'
    when p.is_plus then 'paid_active'
    when (not p.is_plus) and p.trial_started_at is not null then 'trial_expired'
    else 'free'
  end as status,
  case
    when p.trial_ends_at is not null and p.trial_ends_at > now()
      then ceil(extract(epoch from (p.trial_ends_at - now())) / 86400.0)::int
    else null
  end as trial_days_remaining
from public.profiles p
join auth.users u on u.id = p.id;

revoke all on public.user_subscription_status from anon, authenticated;
