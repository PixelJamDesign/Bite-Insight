// supabase/functions/send-onboarding-reminders/index.ts
//
// Lifecycle email: nudges users who signed up, verified, but never
// finished onboarding (onboarding_step != 'complete') to come back and
// wrap it up.
//
// Sent via Resend (a custom lifecycle email, not a Supabase Auth event).
//
// Audience filter — all must hold:
//   - onboarding_step in ('create_profile','disclaimer','app_tour')
//   - email_confirmed_at IS NOT NULL   (unverified users can't sign in,
//     so a "finish your profile" nudge would dead-end — they get the
//     verify-email reminder instead)
//   - onboarding_reminder_sent_at IS NULL   (single send, ever)
//
// Single send per user, tracked via profiles.onboarding_reminder_sent_at.
//
// Endpoint:
//   POST https://<ref>.supabase.co/functions/v1/send-onboarding-reminders
//     ?dry_run=true|false              (default false — actually send)
//     &action_url=<url>                (overrides the CTA target)
//   Authorization: Bearer <service-role-key>
//
// Required secrets:
//   RESEND_API_KEY            — Resend API key (re_...)
//   SUPABASE_URL              — injected
//   SUPABASE_SERVICE_ROLE_KEY — injected
// Optional secrets / env:
//   ONBOARDING_FROM           — From header (default below)
//   ONBOARDING_ACTION_URL     — CTA link (default below; can override via ?action_url)
//
// Response (JSON): { dry_run, candidates, skipped, sent }

import { createClient } from 'npm:@supabase/supabase-js@2';
import { renderOnboardingEmail } from './template.ts';

const INCOMPLETE_STEPS = ['create_profile', 'disclaimer', 'app_tour'];
const SUBJECT = 'Finish setting up your Bite Insight profile';
// Must be on a Resend-verified domain. Only auth.biteinsight.app is
// verified, so we send from there (same domain the auth emails use).
// The email *content* still links to biteinsight.co.uk for assets —
// that's fine, only the sending domain has to be verified.
const DEFAULT_FROM = 'Bite Insight <hello@auth.biteinsight.app>';
const DEFAULT_ACTION_URL = 'https://biteinsight.co.uk/continue.html';
const RESEND_URL = 'https://api.resend.com/emails';

interface ProfileRow {
  id: string;
  full_name: string | null;
  display_name: string | null;
  onboarding_step: string | null;
}

function firstNameFrom(p: ProfileRow): string {
  const raw = (p.display_name || p.full_name || '').trim();
  const first = raw.split(/\s+/)[0];
  if (!first || first.length === 0) return 'there';
  // Capitalise the first letter so a lowercase-stored name ("sophie")
  // doesn't render as "Hey sophie,". Leaves the rest of the name as-is
  // (preserves McX / O'X casing).
  return first.charAt(0).toUpperCase() + first.slice(1);
}

Deno.serve(async (req) => {
  // Auth — decode the JWT and require service_role (same pattern as our
  // other admin functions).
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
  const actionUrl =
    url.searchParams.get('action_url') ||
    Deno.env.get('ONBOARDING_ACTION_URL') ||
    DEFAULT_ACTION_URL;
  const fromAddress = Deno.env.get('ONBOARDING_FROM') || DEFAULT_FROM;

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY && !dryRun) {
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY secret not set' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 0. Test mode — ?test_email=someone@example.com sends a single real
  //    email to that address so we can preview the rendered result in an
  //    inbox. Does NOT query the audience, does NOT mark anyone as sent.
  //    first_name defaults to the capitalised local-part, or override
  //    with ?first_name=Glenn.
  const testEmail = url.searchParams.get('test_email');
  if (testEmail) {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY secret not set' }),
        { status: 500, headers: { 'content-type': 'application/json' } },
      );
    }
    const local = testEmail.split('@')[0];
    const firstName =
      url.searchParams.get('first_name') ||
      (local.charAt(0).toUpperCase() + local.slice(1));
    const html = renderOnboardingEmail({ firstName, actionUrl });
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from: fromAddress, to: [testEmail], subject: SUBJECT, html }),
    });
    const body = await res.text();
    return new Response(
      JSON.stringify(
        {
          test_email: testEmail,
          first_name: firstName,
          from: fromAddress,
          action_url: actionUrl,
          status: res.ok ? 'ok' : 'failed',
          resend_response: body,
        },
        null,
        2,
      ),
      { status: res.ok ? 200 : 502, headers: { 'content-type': 'application/json' } },
    );
  }

  // 1. Pull incomplete, not-yet-reminded profiles.
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, onboarding_step')
    .in('onboarding_step', INCOMPLETE_STEPS)
    .is('onboarding_reminder_sent_at', null);

  if (profErr) {
    return new Response(
      JSON.stringify({ error: `profiles query failed: ${profErr.message}` }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  const candidates: Array<{ id: string; email: string; first_name: string; step: string }> = [];
  const skipped: Array<{ id: string; email: string; reason: string }> = [];

  // 2. For each, fetch the auth user to check verification + get email.
  for (const p of (profiles ?? []) as ProfileRow[]) {
    const { data: u } = await supabase.auth.admin.getUserById(p.id);
    const email = u.user?.email;
    const confirmed = !!u.user?.email_confirmed_at;
    if (!email) {
      skipped.push({ id: p.id, email: '(no email)', reason: 'no email on user' });
      continue;
    }
    if (!confirmed) {
      skipped.push({ id: p.id, email, reason: 'unverified — gets verify reminder instead' });
      continue;
    }
    // Don't nudge anyone within 24h of signup — they may still be
    // actively onboarding. Matters for the recurring daily cron; the
    // initial batch of stuck users are all well past this.
    const createdAt = u.user?.created_at;
    const ageMs = createdAt ? Date.now() - new Date(createdAt).getTime() : Infinity;
    if (ageMs < 24 * 3600 * 1000) {
      skipped.push({ id: p.id, email, reason: 'signed up < 24h ago — too soon' });
      continue;
    }
    candidates.push({
      id: p.id,
      email,
      first_name: firstNameFrom(p),
      step: p.onboarding_step ?? 'unknown',
    });
  }

  // 3. Dry run — return the plan without sending.
  if (dryRun) {
    return new Response(
      JSON.stringify({ dry_run: true, action_url: actionUrl, from: fromAddress, candidates, skipped, sent: [] }, null, 2),
      { headers: { 'content-type': 'application/json' } },
    );
  }

  // 4. Send via Resend, one per recipient, marking each as we go.
  const sent: Array<{ email: string; status: 'ok' | 'failed'; error?: string }> = [];
  for (const c of candidates) {
    try {
      const html = renderOnboardingEmail({ firstName: c.first_name, actionUrl });
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [c.email],
          subject: SUBJECT,
          html,
        }),
      });
      if (!res.ok) {
        sent.push({ email: c.email, status: 'failed', error: `${res.status} ${await res.text()}` });
        continue;
      }
      await supabase
        .from('profiles')
        .update({ onboarding_reminder_sent_at: new Date().toISOString() })
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
    JSON.stringify({ dry_run: false, action_url: actionUrl, from: fromAddress, candidates: [], skipped, sent }, null, 2),
    { headers: { 'content-type': 'application/json' } },
  );
});
