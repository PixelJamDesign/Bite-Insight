// supabase/functions/detect-country/index.ts
//
// Detects the requesting client's country from their IP address and
// returns a normalised result the mobile app can persist to
// profiles.home_country_code at signup.
//
// Why server-side?
//   The device's locale ("en-GB", "en-US") is trivially user-set in
//   iOS/Android settings and can't be trusted to gate paid features.
//   The IP source-address can't be changed by a user without taking
//   active measures (VPN/proxy), so it's a meaningfully stronger
//   signal of "this person is genuinely in the UK".
//
// Detection chain (cheapest first):
//   1. cf-ipcountry — set by Cloudflare in front of every Supabase
//      Edge Function. Free, instant, requires no external lookup.
//   2. ipapi.co fallback — only if (1) is missing or 'XX'/'T1' (Tor).
//      Free tier is 30 req/min anonymously which is plenty for
//      signup volume; switch to a paid key if abuse appears.
//
// Response:
//   { country_code: 'gb' | 'us' | ... | 'world', supported: true|false }
//
//   `supported` is true for the seven regions we have a dedicated OFF
//   subdomain / offline DB for. Everyone else gets `world`.
//
// Endpoint:
//   GET https://<ref>.supabase.co/functions/v1/detect-country
//   Authorization: Bearer <anon-key>   (Supabase requires this; we
//   don't gate further — anyone with the public anon key may call it)
//
// Performance:
//   p50 < 5 ms when the cf-ipcountry header is present (no
//   network lookup). Worst case ~250 ms when ipapi fallback runs.

const SUPPORTED = new Set(['gb', 'us', 'fr', 'de', 'it', 'es', 'in', 'au']);

interface DetectResult {
  country_code: string;
  supported: boolean;
  source: 'cloudflare' | 'ipapi' | 'fallback';
}

// CORS for the mobile app and the (eventual) web build. The Edge
// Function lives on a different origin so we have to advertise
// permissive CORS — the Authorization-header anon-key + Supabase
// JWT verification act as the real access control.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const result = await detect(req);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('[detect-country] failed:', err);
    // Never block signup on geo-detection failure — fall back to
    // 'world' so the user can complete account creation. They'll
    // land on the Global region and get the standard upsell on
    // every dedicated scanner.
    const safe: DetectResult = {
      country_code: 'world',
      supported: false,
      source: 'fallback',
    };
    return new Response(JSON.stringify(safe), {
      status: 200,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }
});

async function detect(req: Request): Promise<DetectResult> {
  // 1. Cloudflare header — fastest path, no external call needed.
  const cf = req.headers.get('cf-ipcountry')?.toLowerCase() ?? '';
  if (cf && cf.length === 2 && cf !== 'xx' && cf !== 't1') {
    return normalise(cf, 'cloudflare');
  }

  // 2. Fall back to ipapi.co lookup.
  const ip = clientIp(req);
  if (!ip) return { country_code: 'world', supported: false, source: 'fallback' };

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 1500);
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'BiteInsight/edge-detect-country' },
    });
    if (!res.ok) {
      return { country_code: 'world', supported: false, source: 'fallback' };
    }
    const text = (await res.text()).trim().toLowerCase();
    if (text.length !== 2) {
      return { country_code: 'world', supported: false, source: 'fallback' };
    }
    return normalise(text, 'ipapi');
  } finally {
    clearTimeout(timeout);
  }
}

function clientIp(req: Request): string | null {
  // Cloudflare puts the original visitor IP in cf-connecting-ip.
  // x-forwarded-for is the standard fallback (first entry).
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return null;
}

function normalise(code: string, source: DetectResult['source']): DetectResult {
  return {
    country_code: SUPPORTED.has(code) ? code : 'world',
    supported: SUPPORTED.has(code),
    source,
  };
}
