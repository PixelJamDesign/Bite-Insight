-- Tracks the outcome of the finish-your-profile nudge. Because we only
-- email users who were incomplete at send time (and stamp
-- onboarding_reminder_sent_at), anyone now 'complete' converted AFTER
-- the nudge — clean attribution with no extra instrumentation.
--
-- Admin-only (revoked from anon/authenticated).
create or replace view public.onboarding_reminder_outcomes as
select
  p.id as user_id,
  u.email,
  p.onboarding_reminder_sent_at as reminded_at,
  p.onboarding_step as current_step,
  (p.onboarding_step = 'complete') as completed_after_reminder,
  case
    when p.onboarding_step = 'complete' then 'completed'
    when p.onboarding_step = 'app_tour' then 'advanced_to_app_tour'
    when p.onboarding_step = 'disclaimer' then 'advanced_to_disclaimer'
    else 'still_at_create_profile'
  end as outcome,
  ceil(extract(epoch from (now() - p.onboarding_reminder_sent_at)) / 86400.0)::int as days_since_reminder
from public.profiles p
join auth.users u on u.id = p.id
where p.onboarding_reminder_sent_at is not null;

revoke all on public.onboarding_reminder_outcomes from anon, authenticated;
