// supabase/functions/dexcom-egvs/index.ts
//
// Returns the signed-in user's Dexcom glucose readings (estimated glucose
// values, "EGVs") for a time window. verify_jwt; the app never sees a
// Dexcom token — this function refreshes it as needed.
//
// Input:  { start: ISO string, end: ISO string }  — max 30 days apart
// Output: { connected: false }
//       | { connected: true, unit: string, readings: Array<{ time, value, trend }> }
//
// Readings are delayed by Dexcom: about 1 hour in the US and 3 hours
// elsewhere. `time` is Dexcom's systemTime (UTC).

import {
  corsHeaders,
  freshAccessToken,
  jsonRes,
  serviceClient,
  userFromRequest,
} from '../_shared/dexcom.ts';

const MAX_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** Dexcom wants 'YYYY-MM-DDThh:mm:ss' with no zone or milliseconds. */
function dexcomTime(d: Date): string {
  return d.toISOString().slice(0, 19);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await userFromRequest(req);
  if (!user) return jsonRes({ error: 'Not signed in' }, 401);

  let body: { start?: string; end?: string };
  try {
    body = await req.json();
  } catch {
    return jsonRes({ error: 'Invalid JSON' }, 400);
  }
  const start = new Date(body.start ?? '');
  const end = new Date(body.end ?? '');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return jsonRes({ error: 'start and end must be valid ISO times, start before end' }, 400);
  }
  if (end.getTime() - start.getTime() > MAX_WINDOW_MS) {
    return jsonRes({ error: 'Window is longer than 30 days' }, 400);
  }

  const svc = serviceClient();

  let access: { token: string; apiBase: string } | null;
  try {
    access = await freshAccessToken(svc, user.id);
  } catch (err) {
    // Dexcom refused the refresh — the user revoked access or the
    // refresh token expired (one year). Forget it so the app offers
    // to reconnect.
    console.error('[dexcom-egvs] refresh failed, disconnecting:', err);
    await svc.from('dexcom_connections').delete().eq('user_id', user.id);
    return jsonRes({ connected: false, reason: 'reauth_required' });
  }
  if (!access) return jsonRes({ connected: false });

  const res = await fetch(
    `${access.apiBase}/v3/users/self/egvs?` +
      new URLSearchParams({ startDate: dexcomTime(start), endDate: dexcomTime(end) }).toString(),
    { headers: { authorization: `Bearer ${access.token}` } },
  );
  const text = await res.text();
  if (!res.ok) {
    console.error('[dexcom-egvs] Dexcom returned', res.status, text.slice(0, 300));
    return jsonRes({ error: 'Dexcom request failed', status: res.status }, 502);
  }

  const data = JSON.parse(text) as {
    unit?: string;
    records?: Array<{ systemTime: string; value: number | null; trend?: string; unit?: string }>;
  };
  const records = data.records ?? [];

  await svc
    .from('dexcom_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', user.id);

  return jsonRes({
    connected: true,
    unit: data.unit ?? records[0]?.unit ?? 'mg/dL',
    readings: records
      .filter((r) => r.value != null)
      .map((r) => ({ time: `${r.systemTime}Z`, value: r.value, trend: r.trend ?? null })),
  });
});
