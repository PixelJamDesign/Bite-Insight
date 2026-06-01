// supabase/functions/create-family-invite/index.ts
//
// The family owner (e.g. Glenn) calls this with their JWT to create an
// invitation for one of their managed family members.
//
// Input:  { family_profile_id: string, method: 'email' | 'link', email?: string }
// Output: { token, link, emailed }  (link is always returned so the client
//          can show the copy-link sheet; emailed=true when method='email').
//
// NOTE: the invite email HTML below is provisional — it reuses the
// transactional style but will be replaced with Glenn's design once it's
// in. Logic is final.

import { createClient } from 'npm:@supabase/supabase-js@2';

const LANDING_BASE = 'https://biteinsight.co.uk/family-invite.html';
const RESEND_URL = 'https://api.resend.com/emails';
const FROM = 'Bite Insight <hello@auth.biteinsight.app>';

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function newToken(): string {
  // 64 hex chars — two UUIDs of entropy, unguessable.
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
}

// Provisional invite email — swap for the final design later.
function inviteEmailHtml(opts: { inviterName: string; memberName: string; link: string }): string {
  return `<!DOCTYPE html><html><body style="margin:0;background:#e2f1ee;font-family:Figtree,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#e2f1ee;padding:40px 16px;"><tr><td align="center">
    <table width="100%" style="max-width:520px;background:#fff;border:1px solid #aad4cd;border-radius:16px;"><tr><td style="padding:32px;">
      <p style="font-size:24px;font-weight:700;color:#023432;margin:0 0 12px;letter-spacing:-0.48px;">${opts.inviterName} wants to add you on Bite Insight</p>
      <p style="font-size:16px;font-weight:300;color:#023432;line-height:24px;margin:0 0 28px;">Join their family and your preferences and photo will show up in their family view. You stay in control and can leave whenever you like.</p>
      <a href="${opts.link}" style="display:inline-block;background:linear-gradient(180deg,#00c8b3,#00776f);color:#fff;font-weight:700;font-size:16px;padding:16px 24px;border-radius:8px;text-decoration:none;">Open Bite Insight to join</a>
      <p style="font-size:12px;font-weight:300;color:#00776f;margin:28px 0 0;">If you didn't expect this, you can ignore this email.</p>
    </td></tr></table>
  </td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) return jsonRes({ error: 'Not signed in' }, 401);
  const jwt = match[1].trim();

  let body: { family_profile_id?: string; method?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return jsonRes({ error: 'Invalid JSON' }, 400);
  }
  const familyProfileId = body.family_profile_id;
  const method = body.method === 'email' ? 'email' : 'link';
  const email = body.email?.trim();
  if (!familyProfileId) return jsonRes({ error: 'Missing family_profile_id' }, 400);
  if (method === 'email' && !email) return jsonRes({ error: 'Email required for email invites' }, 400);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) return jsonRes({ error: 'Not signed in' }, 401);
  const owner = userData.user;

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  // Verify the caller owns this family row and it isn't already linked.
  const { data: famRow } = await svc
    .from('family_profiles')
    .select('id, name, user_id, linked_user_id')
    .eq('id', familyProfileId)
    .maybeSingle();
  if (!famRow) return jsonRes({ error: 'Family member not found' }, 404);
  if (famRow.user_id !== owner.id) return jsonRes({ error: 'Not your family member' }, 403);
  if (famRow.linked_user_id) return jsonRes({ error: 'Already linked to an account' }, 409);

  const token = newToken();
  const link = `${LANDING_BASE}?token=${token}`;

  const { error: insErr } = await svc.from('family_invites').insert({
    family_profile_id: familyProfileId,
    inviter_user_id: owner.id,
    target_email: method === 'email' ? email!.toLowerCase() : null,
    token,
  });
  if (insErr) return jsonRes({ error: `Could not create invite: ${insErr.message}` }, 500);

  let emailed = false;
  if (method === 'email') {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
      const inviterName =
        (owner.user_metadata?.full_name as string | undefined)?.split(' ')[0] || 'A Bite Insight user';
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject: `${inviterName} wants to add you on Bite Insight`,
          html: inviteEmailHtml({ inviterName, memberName: famRow.name, link }),
        }),
      });
      emailed = res.ok;
    }
  }

  return jsonRes({ token, link, emailed });
});
