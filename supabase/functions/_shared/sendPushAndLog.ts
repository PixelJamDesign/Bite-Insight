/**
 * sendPushAndLog — looks up the user's push token, fires the push,
 * and writes a row to the notifications inbox so users see it
 * in-app even when:
 *   - they didn't grant push permission
 *   - they were active in the app when it arrived (banner suppressed)
 *   - they missed the banner / cleared NC without tapping
 *   - the OS dropped the push for any reason
 *
 * Always logs first, sends second. The log is the source of truth for
 * "what the app has told this user." Push delivery is a best-effort
 * notification mechanism on top.
 *
 * Idempotency: callers should still track their own "did we send this
 * already?" flag (like trial_welcome_sent_at on profiles) before
 * calling — this function doesn't dedupe, it just sends + logs.
 */
import { sendPush, type PushPayload, type SendPushResult } from './sendPush.ts';

// Minimal Supabase client shape we use here. Using `any` keeps us
// untangled from a specific @supabase/supabase-js version.
type AnyClient = {
  from: (table: string) => any;
};

export interface SendAndLogResult extends SendPushResult {
  /** True if the notifications row was successfully written. */
  logged: boolean;
}

/**
 * Send a push and log it to the notifications inbox for a single user.
 *
 *   - `userId`: the Supabase user UUID (matches profiles.id)
 *   - `payload`: the push payload sans `to` — we look up the token
 *
 * The payload's `data.type` (string) and `data.deepLink` (string) are
 * mirrored into the inbox row for filtering and tap-routing.
 */
export async function sendPushAndLog(
  supabase: AnyClient,
  userId: string,
  payload: Omit<PushPayload, 'to'>,
): Promise<SendAndLogResult> {
  const data = payload.data ?? {};
  const type =
    typeof (data as Record<string, unknown>).type === 'string'
      ? ((data as Record<string, unknown>).type as string)
      : 'unknown';
  const deepLink =
    typeof (data as Record<string, unknown>).deepLink === 'string'
      ? ((data as Record<string, unknown>).deepLink as string)
      : null;

  // 1. Log first — even if push fails, the user sees it in-app.
  const { error: logError } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title: payload.title,
    body: payload.body,
    deep_link: deepLink,
    data: data,
  });
  const logged = !logError;
  if (logError) {
    console.warn('[sendPushAndLog] notifications insert failed:', logError.message);
  }

  // 2. Look up the user's push token. No token = no push, just log.
  const { data: profile } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .single();

  if (!profile?.expo_push_token) {
    return {
      sent: 0,
      failed: 0,
      receiptIds: [],
      errors: ['no push token — user logged-only'],
      logged,
    };
  }

  const result = await sendPush({ ...payload, to: profile.expo_push_token });
  return { ...result, logged };
}
