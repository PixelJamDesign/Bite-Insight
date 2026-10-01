// supabase/functions/dexcom-oauth-callback/index.ts
//
// Step 2 of connecting Dexcom. This is the redirect URI registered in the
// Dexcom developer portal:
//   https://<project>.supabase.co/functions/v1/dexcom-oauth-callback
//
// Dexcom's login page sends the user's browser here with ?code&state
// (or ?error). There is no Supabase session on this request, so it must
// be deployed with verify_jwt = false. The `state` row created by
// dexcom-oauth-start is what proves who the user is.
//
// On success the code is swapped for tokens (server side — the client
// secret never leaves Supabase), the tokens are stored, and the browser
// is sent back to the app: <return_url>?status=connected. Failures go
// back as ?status=error&reason=<short code>.

import {
  jsonRes,
  redirectUri,
  requestTokens,
  serviceClient,
} from '../_shared/dexcom.ts';

function backToApp(returnUrl: string, params: Record<string, string>): Response {
  const sep = returnUrl.includes('?') ? '&' : '?';
  return new Response(null, {
    status: 302,
    headers: { location: `${returnUrl}${sep}${new URLSearchParams(params).toString()}` },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const dexcomError = url.searchParams.get('error');

  // Without a state we don't know who this is or where to send them.
  if (!state) return jsonRes({ error: 'Missing state' }, 400);

  const svc = serviceClient();

  // Look up and consume the state in one go — it's single use.
  const { data: row } = await svc
    .from('dexcom_oauth_states')
    .delete()
    .eq('state', state)
    .select('user_id, environment, api_base, return_url, expires_at')
    .maybeSingle();
  if (!row) return jsonRes({ error: 'Unknown or already used state' }, 400);

  const returnUrl = row.return_url as string;
  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    return backToApp(returnUrl, { status: 'error', reason: 'expired' });
  }
  // The user cancelled or declined on Dexcom's page.
  if (dexcomError || !code) {
    return backToApp(returnUrl, { status: 'error', reason: dexcomError ?? 'no_code' });
  }

  try {
    const tokens = await requestTokens(row.api_base as string, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
    });

    const { error } = await svc.from('dexcom_connections').upsert({
      user_id: row.user_id,
      environment: row.environment,
      api_base: row.api_base,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      access_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      connected_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[dexcom-oauth-callback] token exchange failed:', err);
    return backToApp(returnUrl, { status: 'error', reason: 'token_exchange' });
  }

  return backToApp(returnUrl, { status: 'connected' });
});
