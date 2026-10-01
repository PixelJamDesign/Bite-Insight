// supabase/functions/dexcom-disconnect/index.ts
//
// Forgets the signed-in user's Dexcom tokens (verify_jwt). Dexcom has no
// token revocation endpoint, so this is a local delete; the user can
// also remove Bite Insight from their Dexcom account settings.
//
// Output: { disconnected: true }

import { corsHeaders, jsonRes, serviceClient, userFromRequest } from '../_shared/dexcom.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await userFromRequest(req);
  if (!user) return jsonRes({ error: 'Not signed in' }, 401);

  const svc = serviceClient();
  const { error } = await svc.from('dexcom_connections').delete().eq('user_id', user.id);
  if (error) return jsonRes({ error: error.message }, 500);
  await svc.from('dexcom_oauth_states').delete().eq('user_id', user.id);

  return jsonRes({ disconnected: true });
});
