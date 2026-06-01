// supabase/functions/accept-family-invite/index.ts
//
// The accepting user (e.g. Lacie) calls this with their own JWT and the
// invite token. It runs a service-role client internally so it can set
// family_profiles.linked_user_id — the only path allowed past the
// forbid_direct_family_link_writes trigger.
//
// Deployed WITH jwt verification (default): the gateway requires a valid
// Supabase JWT, so only a signed-in user can call it. We read their id
// from that JWT and do the privileged write with the service key.
//
// Input:  { token: string }
// Output: { status, inviter_name, member_name } on success; { error } on failure.

import { createClient } from 'npm:@supabase/supabase-js@2';

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) return jsonRes({ error: 'Not signed in' }, 401);
  const jwt = match[1].trim();

  let body: { token?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return jsonRes({ error: 'Invalid JSON' }, 400);
  }
  const token = body.token?.trim();
  const action = body.action === 'decline' ? 'decline' : 'accept';
  if (!token) return jsonRes({ error: 'Missing token' }, 400);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Identify the accepting user from their JWT (validates the token too).
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) return jsonRes({ error: 'Not signed in' }, 401);
  const accepter = userData.user;
  const accepterEmail = (accepter.email ?? '').toLowerCase();

  // Privileged client for the lookups + the link write.
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. Look up the invite.
  const { data: invite } = await svc
    .from('family_invites')
    .select('id, family_profile_id, inviter_user_id, target_email, status, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!invite) return jsonRes({ error: 'This invite link is not valid.' }, 404);

  if (invite.status === 'accepted') {
    return jsonRes({ error: 'This invite has already been used.' }, 409);
  }
  if (invite.status === 'revoked') {
    return jsonRes({ error: 'This invite was cancelled.' }, 409);
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await svc.from('family_invites').update({ status: 'expired' }).eq('id', invite.id);
    return jsonRes({ error: 'This invite has expired. Ask them to send a new one.' }, 410);
  }

  // 2. Email-bound invites: the accepter's email must match.
  if (invite.target_email && invite.target_email.toLowerCase() !== accepterEmail) {
    return jsonRes(
      { error: 'This invite was sent to a different email address.' },
      403,
    );
  }

  // ── Decline ────────────────────────────────────────────────────────────────
  // Member said "No, thank you". Revoke the invite and let the owner know.
  // No link is created.
  if (action === 'decline') {
    await svc
      .from('family_invites')
      .update({ status: 'revoked' })
      .eq('id', invite.id);

    const declinerName =
      (accepter.user_metadata?.full_name as string | undefined)?.split(' ')[0] || 'They';
    await svc.from('notifications').insert({
      user_id: invite.inviter_user_id,
      type: 'family_link_declined',
      title: 'Invite declined',
      body: `${declinerName} declined your family invite.`,
      data: { type: 'family_link_declined', family_profile_id: invite.family_profile_id },
    });
    return jsonRes({ status: 'declined' });
  }

  // 3. The family row must not already be linked.
  const { data: famRow } = await svc
    .from('family_profiles')
    .select('id, name, user_id, linked_user_id')
    .eq('id', invite.family_profile_id)
    .maybeSingle();

  if (!famRow) return jsonRes({ error: 'That family member no longer exists.' }, 404);
  if (famRow.linked_user_id) {
    return jsonRes({ error: 'This family member is already linked to an account.' }, 409);
  }

  // 4. Link it — service role passes the trigger.
  const { error: linkErr } = await svc
    .from('family_profiles')
    .update({ linked_user_id: accepter.id, linked_at: new Date().toISOString() })
    .eq('id', famRow.id);
  if (linkErr) return jsonRes({ error: `Could not link: ${linkErr.message}` }, 500);

  // 5. Mark the invite accepted.
  await svc
    .from('family_invites')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by_user_id: accepter.id,
    })
    .eq('id', invite.id);

  // 6. Notify the inviter (inbox row; push if they have a token — the
  //    notifications table + realtime surface it in-app).
  const { data: inviter } = await svc
    .from('profiles')
    .select('full_name')
    .eq('id', invite.inviter_user_id)
    .maybeSingle();

  const accepterName =
    (accepter.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    famRow.name ||
    'Someone';

  await svc.from('notifications').insert({
    user_id: invite.inviter_user_id,
    type: 'family_link_accepted',
    title: 'Family member linked',
    body: `${accepterName} joined your family. Their preferences now show in your family view.`,
    data: { type: 'family_link_accepted', family_profile_id: famRow.id },
  });

  return jsonRes({
    status: 'accepted',
    inviter_name: inviter?.full_name?.split(' ')[0] ?? 'your family',
    member_name: famRow.name,
  });
});
