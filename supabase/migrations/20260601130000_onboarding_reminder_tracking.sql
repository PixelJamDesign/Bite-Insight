alter table public.profiles
  add column if not exists onboarding_reminder_sent_at timestamptz;

comment on column public.profiles.onboarding_reminder_sent_at is
  'When the finish-your-profile reminder email was sent. Null = never sent. Set by the send-onboarding-reminders edge function so a user is nudged at most once.';
