-- Tracks when we last sent the "please verify your email" follow-up
-- so the cron never sends the same user twice.
alter table public.profiles
  add column if not exists verify_reminder_sent_at timestamptz;

comment on column public.profiles.verify_reminder_sent_at is
  'When the verify-email follow-up email was sent. Null = never sent. Set by the send-verify-reminders edge function. Cron filters on this so a user is nudged at most once.';
