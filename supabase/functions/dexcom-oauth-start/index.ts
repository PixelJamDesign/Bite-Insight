// supabase/functions/dexcom-oauth-start/index.ts
//
// Step 1 of connecting Dexcom. The signed-in app calls this (verify_jwt)
// and gets back the Dexcom login URL to open in a browser.
//
// Input:  { return_url: string }  — where to land after the callback
//                                   (e.g. biteinsight://dexcom)
// Output: { url: string }         — Dexcom's login page for this attempt
//
// A one-time `state` row ties the eventual callback to this user, since
// the callback arrives from Dexcom's page without a Supabase session.

import {
  apiBaseFor,
  clientCredentials,
  corsHeaders,
  dexcomEnv,
  isAllowedReturnUrl,
  jsonRes,
  redirectUri,
  serviceClient,
  userFromRequest,
} from '../_shared/dexcom.ts';

function newState(): string {
  // 64 hex chars — unguessable.
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await userFromRequest(req);
  if (!user) return jsonRes({ error: 'Not signed in' }, 401);

  const creds = clientCredentials();
  if (!creds) return jsonRes({ error: 'Dexcom is not configured yet' }, 503);

  let body: { return_url?: string };
  try {
    body = await req.json();
  } catch {
    return jsonRes({ error: 'Invalid JSON' }, 400);
  }
  const returnUrl = body.return_url ?? '';
  if (!isAllowedReturnUrl(returnUrl)) return jsonRes({ error: 'Return URL not allowed' }, 400);

  const svc = serviceClient();
  const env = dexcomEnv();

  const { data: profile } = await svc
    .from('profiles')
    .select('home_country_code')
    .eq('id', user.id)
    .maybeSingle();
  const apiBase = apiBaseFor(env, (profile?.home_country_code as string | null) ?? null);

  // Clear out this user's stale attempts before starting a new one.
  await svc.from('dexcom_oauth_states').delete().eq('user_id', user.id);

  const state = newState();
  const { error } = await svc.from('dexcom_oauth_states').insert({
    state,
    user_id: user.id,
    environment: env,
    api_base: apiBase,
    return_url: returnUrl,
  });
  if (error) return jsonRes({ error: `Could not start Dexcom login: ${error.message}` }, 500);

  const url =
    `${apiBase}/v3/oauth2/login?` +
    new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: redirectUri(),
      response_type: 'code',
      scope: 'offline_access',
      state,
    }).toString();

  return jsonRes({ url });
});
