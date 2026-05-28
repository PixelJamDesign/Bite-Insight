-- v1.7.0 — Day-0 trial welcome push idempotency flag.
--
-- The revenuecat-webhook function sends a welcome push when it
-- detects INITIAL_PURCHASE with period_type=TRIAL. We stamp
-- trial_welcome_sent_at after a successful send so RC re-deliveries
-- of the same event don't fire the push twice.
--
-- Reset to NULL whenever a fresh trial starts (mirrors the existing
-- trial_reminder_sent_at pattern in the webhook).

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_welcome_sent_at timestamptz NULL;

COMMIT;
