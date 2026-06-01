// supabase/functions/unlink-family-member/index.ts
//
// Severs a family link. Either side can call it:
//   - Owner:  { family_profile_id }        — unlink that member from my family
//   - Member: { mode: 'leave' }            — leave every family I'm linked into
//
// Runs a service-role client so it can clear linked_user_id/linked_at
// (the forbid_direct_family_link_writes trigger only allows service role).
//
// Clearing the link reverts the owner's view to the pre-link managed data —
// the static family_profiles columns were never overwritten while linked.

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

  let body: { family_profile_id?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return jsonRes({ error: 'Invalid JSON' }, 400);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) return jsonRes({ error: 'Not signed in' }, 401);
  const caller = userData.user;

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);

  // Member leaving every family they're linked into.
  if (body.mode === 'leave') {
    const { data: rows, error } = await svc
      .from('family_profiles')
      .update({ linked_user_id: null, linked_at: null })
      .eq('linked_user_id', caller.id)
      .select('id');
    if (error) return jsonRes({ error: error.message }, 500);
    return jsonRes({ unlinked: rows?.length ?? 0 });
  }

  // Owner unlinking a specific member.
  const familyProfileId = body.family_profile_id;
  if (!familyProfileId) return jsonRes({ error: 'Missing family_profile_id' }, 400);

  const { data: famRow } = await svc
    .from('family_profiles')
    .select('id, user_id, linked_user_id')
    .eq('id', familyProfileId)
    .maybeSingle();
  if (!famRow) return jsonRes({ error: 'Family member not found' }, 404);
  if (famRow.user_id !== caller.id) return jsonRes({ error: 'Not your family member' }, 403);
  if (!famRow.linked_user_id) return jsonRes({ error: 'Not linked' }, 409);

  const { error: updErr } = await svc
    .from('family_profiles')
    .update({ linked_user_id: null, linked_at: null })
    .eq('id', familyProfileId);
  if (updErr) return jsonRes({ error: updErr.message }, 500);

  return jsonRes({ unlinked: 1 });
});
