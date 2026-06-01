-- Daily cron for the finish-your-profile reminder email.
--
-- Runs at 07:00 UTC = 08:00 UK time during BST (in winter / GMT this is
-- 07:00 local — accept the DST drift or adjust the hour twice a year).
--
-- The function is idempotent (only emails verified, incomplete,
-- not-yet-reminded users, and only those who signed up >24h ago), so a
-- daily run sends to the current backlog once, then catches new
-- stragglers each morning. cron.schedule upserts by job name, so
-- re-applying this migration just refreshes the schedule.
select cron.schedule(
  'send-onboarding-reminders-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://bfkxjgbvsygvenmciasg.supabase.co/functions/v1/send-onboarding-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
        ''
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
