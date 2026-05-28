-- v1.7.0 — In-app notification inbox.
--
-- Every push the app sends server-side also writes a row here so users
-- can revisit notifications they missed via banner. The inbox is a
-- read-receipt-tracked log of what the app has told each user.
--
-- Service role inserts (no RLS bypass needed since it bypasses by
-- default). Authenticated users can SELECT + UPDATE their own rows
-- (for marking read / dismissed).

BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Stable string identifying the push category. Used for icons,
  -- grouping, and routing logic. Examples:
  --   'trial_welcome', 'trial_day3_midway', 'trial_day6_reminder',
  --   'trial_converted', 'inactivity_5d', 'review_request', etc.
  type         text        NOT NULL,
  title        text        NOT NULL CHECK (length(title) > 0),
  body         text        NOT NULL CHECK (length(body) > 0),
  -- The biteinsight:// URL the row should route to when tapped.
  -- Optional — taps fall through to /dashboard when null.
  deep_link    text        NULL,
  -- The full data payload the push was sent with — useful for
  -- forensic debugging and for rendering type-specific UI later.
  data         jsonb       NULL,
  sent_at      timestamptz NOT NULL DEFAULT now(),
  read_at      timestamptz NULL,
  dismissed_at timestamptz NULL
);

-- Inbox query: "give me the user's notifications, newest first."
CREATE INDEX IF NOT EXISTS notifications_user_sent_idx
  ON public.notifications (user_id, sent_at DESC);

-- Unread count query: "how many unread (and not dismissed) does this
-- user have?" Partial index keeps the index tiny — only rows that
-- contribute to the count are stored.
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON public.notifications (user_id)
  WHERE read_at IS NULL AND dismissed_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their own notifications.
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can mark their own notifications read / dismissed via UPDATE.
-- They can't change user_id, type, title, body, deep_link, data — the
-- check enforces that they only touch the lifecycle columns.
DROP POLICY IF EXISTS "Users can mark their own notifications read or dismissed" ON public.notifications;
CREATE POLICY "Users can mark their own notifications read or dismissed"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No INSERT or DELETE policy for end users — pushes are inserted by
-- the service role (Edge Functions), and we never hard-delete.
-- Dismissals are a soft-delete via the dismissed_at column.

COMMIT;
