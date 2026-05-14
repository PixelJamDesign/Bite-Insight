// supabase/functions/send-trial-reminders/index.ts
//
// Day-6 trial reminder cron job.
//
// Triggered daily by pg_cron (see migration: schedule_trial_reminders).
// Finds users whose trial ends in the next 22–26 hours and hasn't been
// notified yet, then sends a single push notification per user via the
// Expo Push API.
//
// The 22–26 hour window means even if the cron is delayed by an hour
// from its 09:00 UTC slot, every user still gets exactly one reminder.
// The `trial_reminder_sent_at IS NULL` guard makes the function
// idempotent — running it twice in a day is harmless.
//
// Push payload includes a `data.deepLink` pointing at the in-app
// Day-6 reminder sheet. Client-side notification handler (in
// app/_layout.tsx) reads this and routes accordingly.
//
// Endpoint:
//   POST https://<ref>.supabase.co/functions/v1/send-trial-reminders
//   Authorization: Bearer <service-role-key>
//
// Required Supabase secrets:
//   SUPABASE_URL              — injected
//   SUPABASE_SERVICE_ROLE_KEY — injected (used for RLS-bypassed reads/writes)
//
// Expo Push API requires no auth for receipts-style sends; we POST
// directly to https://exp.host/--/api/v2/push/send.

import { createClient } from 'npm:@supabase/supabase-js@2';

interface ProfileRow {
  id: string;
  expo_push_token: string;
  trial_ends_at: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Expo allows up to 100 notifications per request. We're well below
// that for a daily Day-6 cohort but keep the chunk size sensible.
const CHUNK_SIZE = 100;

Deno.serve(async (req) => {
  // Auth: accept either
  //  - SUPABASE_SERVICE_ROLE_KEY (used for manual testing via curl)
  //  - CRON_AUTH_TOKEN (used by the daily pg_cron job; stored in
  //    vault as `cron_auth_token` and passed in Authorization header)
  const authHeader = req.headers.get('authorization') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const cronAuthToken = Deno.env.get('CRON_AUTH_TOKEN');
  const expectedAuths = [
    serviceRoleKey ? `Bearer ${serviceRoleKey}` : null,
    cronAuthToken ? `Bearer ${cronAuthToken}` : null,
  ].filter(Boolean) as string[];
  if (!expectedAuths.includes(authHeader)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Window: trial_ends_at between now+22h and now+26h. Centred on 24h
  // out so we catch each user roughly on Day-6-evening / Day-7-morning.
  const now = Date.now();
  const windowStart = new Date(now + 22 * 3600 * 1000).toISOString();
  const windowEnd = new Date(now + 26 * 3600 * 1000).toISOString();

  const { data: targets, error: queryErr } = await supabase
    .from('profiles')
    .select('id, expo_push_token, trial_ends_at')
    .gte('trial_ends_at', windowStart)
    .lte('trial_ends_at', windowEnd)
    .is('trial_reminder_sent_at', null)
    .not('expo_push_token', 'is', null)
    .returns<ProfileRow[]>();

  if (queryErr) {
    console.error('[send-trial-reminders] query failed:', queryErr);
    return new Response(JSON.stringify({ error: queryErr.message }), { status: 500 });
  }

  if (!targets || targets.length === 0) {
    return new Response(
      JSON.stringify({ sent: 0, message: 'No users due for Day-6 reminder' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Build Expo push messages. The `data.deepLink` is what the client
  // notification handler reads to know where to route.
  const messages = targets.map((row) => ({
    to: row.expo_push_token,
    title: 'Your free trial ends tomorrow',
    body: "If Bite Insight+ isn't a fit, cancel today and you won't be charged.",
    sound: 'default',
    priority: 'high',
    data: {
      deepLink: 'biteinsight://trial-day6-reminder',
      type: 'trial_day6_reminder',
    },
  }));

  // POST in chunks to the Expo Push API.
  const sentUserIds: string[] = [];
  const failures: { userId: string; message: string }[] = [];

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE);
    const chunkTargets = targets.slice(i, i + CHUNK_SIZE);

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`[send-trial-reminders] Expo API ${res.status}: ${text}`);
        chunkTargets.forEach((t) => failures.push({ userId: t.id, message: `HTTP ${res.status}` }));
        continue;
      }

      const json: { data: ExpoPushTicket[] } = await res.json();
      json.data.forEach((ticket, idx) => {
        const target = chunkTargets[idx];
        if (ticket.status === 'ok') {
          sentUserIds.push(target.id);
        } else {
          failures.push({
            userId: target.id,
            message: ticket.message ?? 'unknown error',
          });
        }
      });
    } catch (err) {
      console.error('[send-trial-reminders] chunk send failed:', err);
      chunkTargets.forEach((t) => failures.push({ userId: t.id, message: String(err) }));
    }
  }

  // Mark successful sends so we don't notify them again tomorrow.
  if (sentUserIds.length > 0) {
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ trial_reminder_sent_at: new Date().toISOString() })
      .in('id', sentUserIds);
    if (updateErr) {
      console.error('[send-trial-reminders] flag update failed:', updateErr);
    }
  }

  return new Response(
    JSON.stringify({
      sent: sentUserIds.length,
      failed: failures.length,
      failures,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
