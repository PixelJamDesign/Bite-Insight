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

  // 2. Look up every device token for this user from push_tokens.
  //    Falls back to the legacy profiles.expo_push_token column if no
  //    rows exist yet (e.g. backfill hadn't caught a brand-new sign-up).
  //    No tokens = no push, just log.
  const { data: tokenRows } = await supabase
    .from('push_tokens')
    .select('expo_push_token')
    .eq('user_id', userId);

  let tokens: string[] = Array.isArray(tokenRows)
    ? tokenRows
        .map((r: { expo_push_token: string | null }) => r.expo_push_token)
        .filter((t: string | null): t is string => !!t)
    : [];

  if (tokens.length === 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', userId)
      .single();
    if (profile?.expo_push_token) tokens = [profile.expo_push_token];
  }

  if (tokens.length === 0) {
    return {
      sent: 0,
      failed: 0,
      receiptIds: [],
      errors: ['no push token — user logged-only'],
      logged,
    };
  }

  // sendPush already handles `to` as string | string[] and chunks at
  // 100, so passing every device for this user in one call is fine.
  const result = await sendPush({ ...payload, to: tokens });
  return { ...result, logged };
}
