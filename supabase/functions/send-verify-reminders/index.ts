// supabase/functions/send-verify-reminders/index.ts
//
// Verify-email follow-up cron.
//
// Re-sends the Supabase "Confirm signup" email to users who signed up
// more than 48 hours ago and still haven't tapped the verification
// link. The original email may have fallen into spam — the resend
// nudges them politely without breaking the auth flow.
//
// Single send per user, ever. Tracked via profiles.verify_reminder_sent_at.
//
// Why an edge function instead of just a SQL cron:
//   - Supabase's resend endpoint requires HTTP, not SQL
//   - We want to filter out test accounts, the Apple reviewer login,
//     and obviously-broken emails before firing — easier in TS than SQL
//   - We want a dry-run mode for sanity-checking the recipient list
//
// Triggered daily by pg_cron (see migration: schedule_verify_reminders).
// Also callable manually with ?dry_run=true to preview without sending.
//
// Endpoint:
//   POST https://<ref>.supabase.co/functions/v1/send-verify-reminders
//     ?dry_run=true|false      (default false — actually send)
//     &include_old=true|false  (default false — caps at 60 days old)
//   Authorization: Bearer <service-role-key>
//
// Response (JSON):
//   {
//     candidates: [{ email, created_at, age_days }],
//     skipped:    [{ email, reason }],
//     sent:       [{ email, status: 'ok' | 'failed', error?: string }],
//     dry_run:    boolean
//   }

import { createClient } from 'npm:@supabase/supabase-js@2';

// Don't email these — they're test accounts, the Apple reviewer
// login, or anything else we don't want to spam in a batch send.
const EMAIL_BLOCKLIST = new Set<string>([
  'test@example.com',
  'john.doe@example.com',
  'apple-review@biteinsight.app',
]);

// Domain patterns that suggest typos / bogus addresses.
// `.comb` is from a real account in the wild (extra `b`).
const EMAIL_TLD_BLOCKLIST = ['.comb', '.con', '.cmo', '.ocm'];

function isLikelyBogus(email: string): boolean {
  const lower = email.toLowerCase();
  return EMAIL_TLD_BLOCKLIST.some((tld) => lower.endsWith(tld));
}

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  verify_reminder_sent_at: string | null;
}

Deno.serve(async (req) => {
  // Auth — same pattern as send-trial-reminders.
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
  const includeOld = url.searchParams.get('include_old') === 'true';

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Pull unverified users >48h old.
  //    auth.users isn't directly queryable from the JS client even
  //    with service role; use a SQL RPC fallback or the admin API.
  //    Admin listUsers paginates at 50 per page — plenty for our scale.
  const allUsers: Array<{
    id: string;
    email?: string;
    created_at: string;
    email_confirmed_at?: string | null;
  }> = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      return new Response(
        JSON.stringify({ error: `listUsers failed: ${error.message}` }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      );
    }
    allUsers.push(...data.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      email_confirmed_at: u.email_confirmed_at ?? null,
    })));
    if (data.users.length < perPage) break;
    page++;
    if (page > 50) break; // safety
  }

  // 2. Filter to candidates: unverified, >48h old, <60 days old.
  const now = Date.now();
  const minAgeMs = 48 * 3600 * 1000;
  const maxAgeMs = (includeOld ? 365 : 60) * 24 * 3600 * 1000;

  const candidates: UserRow[] = [];
  const skipped: Array<{ email: string; reason: string }> = [];

  // Need to join with profiles to read verify_reminder_sent_at.
  const userIds = allUsers
    .filter((u) => !u.email_confirmed_at && u.email)
    .map((u) => u.id);

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, verify_reminder_sent_at')
    .in('id', userIds);

  const profileMap = new Map<string, string | null>(
    (profileRows ?? []).map((p: { id: string; verify_reminder_sent_at: string | null }) => [
      p.id,
      p.verify_reminder_sent_at,
    ]),
  );

  for (const u of allUsers) {
    if (u.email_confirmed_at) continue;
    if (!u.email) {
      skipped.push({ email: '(no email)', reason: 'no email on user record' });
      continue;
    }
    const ageMs = now - new Date(u.created_at).getTime();
    if (ageMs < minAgeMs) {
      skipped.push({ email: u.email, reason: 'under 48h old' });
      continue;
    }
    if (ageMs > maxAgeMs) {
      skipped.push({ email: u.email, reason: `older than ${includeOld ? '365' : '60'} days` });
      continue;
    }
    if (EMAIL_BLOCKLIST.has(u.email.toLowerCase())) {
      skipped.push({ email: u.email, reason: 'blocklisted (test / reviewer)' });
      continue;
    }
    if (isLikelyBogus(u.email)) {
      skipped.push({ email: u.email, reason: 'looks like a typo (bogus TLD)' });
      continue;
    }
    if (profileMap.get(u.id)) {
      skipped.push({ email: u.email, reason: 'already nudged' });
      continue;
    }
    candidates.push({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      email_confirmed_at: null,
      verify_reminder_sent_at: null,
    });
  }

  // 3. Dry run — return the plan without sending.
  if (dryRun) {
    return new Response(
      JSON.stringify({
        dry_run: true,
        candidates: candidates.map((c) => ({
          email: c.email,
          created_at: c.created_at,
          age_days: Math.floor((now - new Date(c.created_at).getTime()) / (24 * 3600 * 1000)),
        })),
        skipped,
        sent: [],
      }, null, 2),
      { headers: { 'content-type': 'application/json' } },
    );
  }

  // 4. Send. Supabase Auth's /auth/v1/resend endpoint triggers a
  //    fresh "Confirm signup" email using the configured template.
  //    Rate limit is generous when called with service role.
  const sent: Array<{ email: string; status: 'ok' | 'failed'; error?: string }> = [];
  for (const c of candidates) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ type: 'signup', email: c.email }),
      });
      if (!res.ok) {
        const text = await res.text();
        sent.push({ email: c.email, status: 'failed', error: `${res.status} ${text}` });
        continue;
      }
      // Mark as sent.
      await supabase
        .from('profiles')
        .update({ verify_reminder_sent_at: new Date().toISOString() })
        .eq('id', c.id);
      sent.push({ email: c.email, status: 'ok' });
    } catch (err) {
      sent.push({
        email: c.email,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return new Response(
    JSON.stringify({ dry_run: false, candidates: [], skipped, sent }, null, 2),
    { headers: { 'content-type': 'application/json' } },
  );
});
