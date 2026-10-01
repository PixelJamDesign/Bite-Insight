/**
 * dexcom — shared helpers for the dexcom-* edge functions.
 *
 * Config (Supabase → Project Settings → Edge Functions → Secrets):
 *   DEXCOM_CLIENT_ID      — from the Dexcom developer portal
 *   DEXCOM_CLIENT_SECRET  — from the Dexcom developer portal (never ships in the app)
 *   DEXCOM_ENV            — 'sandbox' (default) or 'production'
 *
 * The redirect URI registered in the Dexcom portal must match
 * redirectUri() below exactly.
 *
 * Dexcom docs: https://developer.dexcom.com/docs/dexcom/authentication
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

export type DexcomEnv = 'sandbox' | 'production';

export const SANDBOX_BASE = 'https://sandbox-api.dexcom.com';
const PRODUCTION_BASE_US = 'https://api.dexcom.com';
const PRODUCTION_BASE_EU = 'https://api.dexcom.eu';
const PRODUCTION_BASE_JP = 'https://api.dexcom.jp';

export function dexcomEnv(): DexcomEnv {
  return Deno.env.get('DEXCOM_ENV') === 'production' ? 'production' : 'sandbox';
}

export function redirectUri(): string {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/dexcom-oauth-callback`;
}

export function clientCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = Deno.env.get('DEXCOM_CLIENT_ID');
  const clientSecret = Deno.env.get('DEXCOM_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * Which Dexcom host a user's account lives on. Production is split by
 * region; the sandbox is a single host. Uses the country captured at
 * signup (profiles.home_country_code).
 */
export function apiBaseFor(env: DexcomEnv, homeCountryCode: string | null): string {
  if (env === 'sandbox') return SANDBOX_BASE;
  const cc = (homeCountryCode ?? '').toLowerCase();
  if (cc === 'us') return PRODUCTION_BASE_US;
  if (cc === 'jp') return PRODUCTION_BASE_JP;
  return PRODUCTION_BASE_EU;
}

export function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

/** Resolves the signed-in user from the request's bearer token. */
export async function userFromRequest(req: Request): Promise<{ id: string } | null> {
  const match = (req.headers.get('authorization') ?? '').match(/^Bearer\s+(.+)$/);
  if (!match) return null;
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${match[1].trim()}` } },
  });
  const { data, error } = await asUser.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id };
}

export const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

export function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders },
  });
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * POSTs to Dexcom's token endpoint. Used for both the initial code swap
 * and refreshes. Throws with Dexcom's error text on failure.
 */
export async function requestTokens(
  apiBase: string,
  params: Record<string, string>,
): Promise<TokenResponse> {
  const creds = clientCredentials();
  if (!creds) throw new Error('Dexcom client credentials are not configured');
  const res = await fetch(`${apiBase}/v3/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      ...params,
    }).toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Dexcom token request failed (${res.status}): ${text.slice(0, 300)}`);
  const data = JSON.parse(text) as TokenResponse;
  if (!data.access_token || !data.refresh_token) throw new Error('Dexcom token response was incomplete');
  return data;
}

export interface Connection {
  user_id: string;
  environment: DexcomEnv;
  api_base: string;
  access_token: string;
  refresh_token: string;
  access_expires_at: string;
}

/** Refresh a minute early so a request never races the expiry. */
const EXPIRY_MARGIN_MS = 60_000;

/**
 * Returns a usable access token for the user's connection, refreshing
 * (and saving the new single-use refresh token) when it's about to
 * expire. Returns null when the user isn't connected. Throws if Dexcom
 * rejects the refresh — the caller should treat the user as disconnected.
 */
export async function freshAccessToken(
  svc: ReturnType<typeof serviceClient>,
  userId: string,
): Promise<{ token: string; apiBase: string } | null> {
  const { data } = await svc
    .from('dexcom_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  const conn = data as Connection | null;
  if (!conn) return null;

  if (new Date(conn.access_expires_at).getTime() - Date.now() > EXPIRY_MARGIN_MS) {
    return { token: conn.access_token, apiBase: conn.api_base };
  }

  let tokens: TokenResponse;
  try {
    tokens = await requestTokens(conn.api_base, {
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
      redirect_uri: redirectUri(),
    });
  } catch (err) {
    // Refresh tokens are single use. If another request refreshed first,
    // ours was already spent — pick up the token that request saved.
    const { data: again } = await svc
      .from('dexcom_connections')
      .select('access_token, refresh_token, access_expires_at, api_base')
      .eq('user_id', userId)
      .maybeSingle();
    if (again && again.refresh_token !== conn.refresh_token) {
      return { token: again.access_token as string, apiBase: again.api_base as string };
    }
    throw err;
  }

  // Only write if nobody else has refreshed in the meantime.
  await svc
    .from('dexcom_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      access_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq('user_id', userId)
    .eq('refresh_token', conn.refresh_token);
  return { token: tokens.access_token, apiBase: conn.api_base };
}

/**
 * Where the callback may send the user afterwards. Anything else is
 * refused so the callback can't be used as an open redirect.
 */
export function isAllowedReturnUrl(url: string): boolean {
  return (
    url.startsWith('biteinsight://') ||
    url.startsWith('exp://') || // Expo Go during development
    url.startsWith('https://biteinsight.app/') ||
    /^http:\/\/localhost:\d+\//.test(url) // web build during development
  );
}
