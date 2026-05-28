/**
 * sendPush — shared helper for posting to the Expo Push API.
 *
 * Every push-sending Edge Function (revenuecat-webhook for trial
 * welcome + conversion, send-trial-reminders for Day-6, future
 * functions for inactivity / midway / etc.) calls this so we have
 * one canonical implementation of:
 *
 *   - Chunking requests at the 100-message Expo limit
 *   - JSON error handling
 *   - Per-ticket success / failure parsing
 *   - Useful return value for logging + idempotency markers
 *
 * Expo Push API docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_API = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

export interface PushPayload {
  /** ExponentPushToken[...] or array of tokens for the same content. */
  to: string | string[];
  title: string;
  body: string;
  /** Arbitrary JSON delivered to the app when the push is tapped. */
  data?: Record<string, unknown>;
  /** 'default' or null. Defaults to 'default' if omitted. */
  sound?: 'default' | null;
  /** iOS badge count to set on the app icon. */
  badge?: number;
  /** Expo priority hint. 'high' = immediate, 'default'/'normal' = batched. */
  priority?: 'default' | 'normal' | 'high';
  /** Seconds before Expo drops an undeliverable push. */
  ttl?: number;
  /** Android-only notification channel ID. */
  channelId?: string;
  /** iOS interactive-notification category ID. */
  categoryId?: string;
}

export interface SendPushResult {
  /** Tickets Expo returned as status="ok". */
  sent: number;
  /** Tickets Expo returned as status="error", OR transport failures. */
  failed: number;
  /** Receipt IDs you can poll later via /push/getReceipts. */
  receiptIds: string[];
  /** Human-readable error messages, one per failed ticket / chunk. */
  errors: string[];
}

export async function sendPush(messages: PushPayload | PushPayload[]): Promise<SendPushResult> {
  const arr = Array.isArray(messages) ? messages : [messages];
  if (arr.length === 0) {
    return { sent: 0, failed: 0, receiptIds: [], errors: [] };
  }

  let sent = 0;
  let failed = 0;
  const receiptIds: string[] = [];
  const errors: string[] = [];

  // Chunk so we stay under Expo's per-request limit. Each chunk is one
  // POST; tickets come back in the same order as the messages.
  for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
    const chunk = arr.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetch(EXPO_API, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        failed += chunk.length;
        const errText = await res.text().catch(() => '');
        errors.push(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
        continue;
      }

      const payload = await res.json().catch(() => null);
      const tickets = payload?.data;
      if (!Array.isArray(tickets)) {
        failed += chunk.length;
        errors.push(`Unexpected Expo response shape: ${JSON.stringify(payload).slice(0, 200)}`);
        continue;
      }

      for (const ticket of tickets) {
        if (ticket?.status === 'ok') {
          sent++;
          if (typeof ticket.id === 'string') receiptIds.push(ticket.id);
        } else {
          failed++;
          errors.push(`Expo ticket error: ${ticket?.message ?? ticket?.details?.error ?? 'unknown'}`);
        }
      }
    } catch (err) {
      failed += chunk.length;
      errors.push(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { sent, failed, receiptIds, errors };
}
