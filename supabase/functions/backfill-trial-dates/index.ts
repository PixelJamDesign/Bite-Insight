// supabase/functions/backfill-trial-dates/index.ts
//
// One-shot backfill for users where is_plus=true but the trial date
// columns (trial_started_at, trial_ends_at) are null. The bug was in
// the client-side subscriptionContext.tsx which only treated
// periodType='trial' (Apple) as a trial — missing periodType='intro'
// (Google Play). Patched in v1.7.1, but the rows already written
// without trial dates need fixing.
//
// For each affected user:
//   1. Look up their RC subscriber record via the REST API
//   2. Find the active entitlement (typically 'pro')
//   3. Extract original_purchase_date → trial_started_at
//      and expires_date → trial_ends_at
//   4. UPDATE the profiles row
//
// Safe to re-run — only touches rows where trial_started_at is null.
//
// Required secrets:
//   REVENUECAT_API_KEY        — v1 secret key from RC dashboard (sk_*)
//   SUPABASE_SERVICE_ROLE_KEY — injected
//   SUPABASE_URL              — injected
//
// Endpoint:
//   POST https://<ref>.supabase.co/functions/v1/backfill-trial-dates
//     ?dry_run=true|false   (default false — actually write)
//   Authorization: Bearer <service-role-key>
//
// Response:
//   {
//     dry_run: bool,
//     candidates: [{ user_id, email }],
//     updated: [{ user_id, email, trial_started_at, trial_ends_at }],
//     skipped: [{ user_id, email, reason }]
//   }

import { createClient } from 'npm:@supabase/supabase-js@2';

const RC_API_BASE = 'https://api.revenuecat.com/v1';

interface ProfileRow {
  id: string;
  email: string;
}

interface RCSubscriber {
  subscriber?: {
    entitlements?: Record<string, {
      product_identifier?: string;
      purchase_date?: string;
      expires_date?: string;
    }>;
    subscriptions?: Record<string, {
      original_purchase_date?: string;
      purchase_date?: string;
      expires_date?: string;
      period_type?: string;
      store?: string;
    }>;
    original_purchase_date?: string;
  };
}

Deno.serve(async (req) => {
  // Auth — same pattern as our other admin functions.
  const authHeader = req.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) return new Response('Unauthorized: missing bearer', { status: 401 });
  const jwt = match[1].trim();
  const parts = jwt.split('.');
  if (parts.length !== 3) return new Response('Unauthorized: malformed JWT', { status: 401 });
  let claims: Record<string, unknown>;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    claims = JSON.parse(atob(padded));
  } catch {
    return new Response('Unauthorized: undecodable JWT', { status: 401 });
  }
  if (claims.role !== 'service_role') {
    return new Response('Unauthorized: insufficient role', { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dry_run') === 'true';

  const RC_KEY = Deno.env.get('REVENUECAT_API_KEY');
  if (!RC_KEY) {
    return new Response(
      JSON.stringify({ error: 'REVENUECAT_API_KEY secret not set' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 1. Find affected users: is_plus=true with missing trial dates.
  //    Pull email from auth.users via a join through a view or RPC —
  //    we use the profiles table + admin listUsers for the join.
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_plus', true)
    .is('trial_started_at', null);

  if (profErr) {
    return new Response(
      JSON.stringify({ error: `profiles query failed: ${profErr.message}` }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  // Get emails alongside ids so the response is human-readable.
  const candidates: ProfileRow[] = [];
  for (const p of profiles ?? []) {
    const { data: u } = await supabase.auth.admin.getUserById(p.id);
    candidates.push({ id: p.id, email: u.user?.email ?? '(no email)' });
  }

  const updated: Array<{
    user_id: string;
    email: string;
    trial_started_at: string;
    trial_ends_at: string;
    source: string;
  }> = [];
  const skipped: Array<{ user_id: string; email: string; reason: string }> = [];

  // 2. For each candidate, ask RC what it knows about them.
  for (const c of candidates) {
    try {
      const res = await fetch(`${RC_API_BASE}/subscribers/${c.id}`, {
        headers: { Authorization: `Bearer ${RC_KEY}` },
      });
      if (!res.ok) {
        skipped.push({
          user_id: c.id,
          email: c.email,
          reason: `RC API returned ${res.status}: ${await res.text()}`,
        });
        continue;
      }
      const data = (await res.json()) as RCSubscriber;
      const subs = data.subscriber?.subscriptions ?? {};
      const entitlements = data.subscriber?.entitlements ?? {};

      // Pick the entitlement (usually 'pro' or 'plus') and the
      // corresponding subscription record. We prefer the entitlement
      // since its product_identifier ties back to the subscription.
      const entKey = Object.keys(entitlements)[0];
      const ent = entKey ? entitlements[entKey] : undefined;
      const subKey = ent?.product_identifier ?? Object.keys(subs)[0];
      const sub = subKey ? subs[subKey] : undefined;

      if (!sub) {
        skipped.push({ user_id: c.id, email: c.email, reason: 'no subscription found in RC' });
        continue;
      }

      // original_purchase_date is when the trial / paid period began.
      // expires_date is when it (current cycle) ends.
      const startedAt = sub.original_purchase_date ?? sub.purchase_date;
      const endsAt = sub.expires_date ?? ent?.expires_date;

      if (!startedAt || !endsAt) {
        skipped.push({
          user_id: c.id,
          email: c.email,
          reason: `missing dates on RC sub (started=${startedAt}, ends=${endsAt})`,
        });
        continue;
      }

      // Format to ISO (RC returns "YYYY-MM-DD HH:MM:SS" UTC; convert
      // to proper ISO with the Z suffix so Postgres parses it cleanly).
      const toIso = (s: string) =>
        s.includes('T') ? s : s.replace(' ', 'T').replace(/(\.\d+)?$/, 'Z');

      const tStarted = toIso(startedAt);
      const tEnds = toIso(endsAt);

      if (!dryRun) {
        const { error: updErr } = await supabase
          .from('profiles')
          .update({
            trial_started_at: tStarted,
            trial_ends_at: tEnds,
          })
          .eq('id', c.id);
        if (updErr) {
          skipped.push({ user_id: c.id, email: c.email, reason: `update failed: ${updErr.message}` });
          continue;
        }
      }

      updated.push({
        user_id: c.id,
        email: c.email,
        trial_started_at: tStarted,
        trial_ends_at: tEnds,
        source: `RC sub ${subKey} (${sub.store ?? 'unknown'} / ${sub.period_type ?? 'unknown'})`,
      });
    } catch (err) {
      skipped.push({
        user_id: c.id,
        email: c.email,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return new Response(
    JSON.stringify({
      dry_run: dryRun,
      candidates_count: candidates.length,
      updated_count: updated.length,
      skipped_count: skipped.length,
      updated,
      skipped,
    }, null, 2),
    { headers: { 'content-type': 'application/json' } },
  );
});
