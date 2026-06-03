// supabase/functions/off-contribute/index.ts
//
// Server-side proxy for contributing a missing/incomplete product back to
// Open Food Facts. Writes need the app account's password, which must never
// ship in the client — so the app sends product fields + photos here and this
// function performs the authenticated write.
//
// Input (JSON, from a signed-in user):
//   {
//     code: string,                 // barcode
//     app_uuid: string,             // anonymous per-user id (moderation trace)
//     app_version?: string,         // app version, for the User-Agent
//     product_name?, brands?, quantity?, categories?: string,
//     images?: { front?, ingredients?, nutrition?: string }  // base64 (jpeg)
//   }
// Output: { ok: true, code } | { error }
//
// Secrets (Supabase): OFF_USER_ID, OFF_PASSWORD, OFF_TARGET ('staging'|'prod').
// Staging writes to world.openfoodfacts.net (HTTP Basic off:off) so we never
// pollute production while testing.

import { createClient } from 'npm:@supabase/supabase-js@2';

const APP_NAME = 'BiteInsight';
const CONTACT_EMAIL = 'hello@biteinsight.app';

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type Target = 'staging' | 'prod';

function offBase(target: Target): string {
  return target === 'prod'
    ? 'https://world.openfoodfacts.org'
    : 'https://world.openfoodfacts.net';
}

/** Extra headers OFF requires/expects: custom UA, plus Basic auth on staging. */
function offHeaders(target: Target, appVersion: string): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent': `${APP_NAME}/${appVersion} (${CONTACT_EMAIL})`,
  };
  // Staging server (.net) sits behind HTTP Basic auth off:off.
  if (target !== 'prod') h['Authorization'] = `Basic ${btoa('off:off')}`;
  return h;
}

/** Decode a base64 (optionally data-URL) string to bytes. */
function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  // ── Auth: only signed-in Bite Insight users may contribute ──────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (!match) return jsonRes({ error: 'Not signed in' }, 401);
  const jwt = match[1].trim();

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData.user) return jsonRes({ error: 'Not signed in' }, 401);

  // ── OFF credentials ─────────────────────────────────────────────────────
  const OFF_USER_ID = Deno.env.get('OFF_USER_ID');
  const OFF_PASSWORD = Deno.env.get('OFF_PASSWORD');
  const target: Target = Deno.env.get('OFF_TARGET') === 'prod' ? 'prod' : 'staging';
  if (!OFF_USER_ID || !OFF_PASSWORD) {
    return jsonRes({ error: 'Open Food Facts account is not configured' }, 500);
  }

  // ── Input ───────────────────────────────────────────────────────────────
  let body: {
    code?: string;
    app_uuid?: string;
    app_version?: string;
    product_name?: string;
    brands?: string;
    quantity?: string;
    categories?: string;
    images?: { front?: string; ingredients?: string; nutrition?: string };
  };
  try {
    body = await req.json();
  } catch {
    return jsonRes({ error: 'Invalid JSON' }, 400);
  }

  const code = (body.code ?? '').trim();
  if (!/^\d{6,14}$/.test(code)) return jsonRes({ error: 'A valid barcode is required' }, 400);
  const appUuid = (body.app_uuid ?? '').trim() || 'unknown';
  const appVersion = (body.app_version ?? '0.0.0').trim();

  const base = offBase(target);
  const headers = offHeaders(target, appVersion);

  // Auth + app-identification params attached to every write.
  const authParams: Record<string, string> = {
    user_id: OFF_USER_ID,
    password: OFF_PASSWORD,
    app_name: APP_NAME,
    app_version: appVersion,
    app_uuid: appUuid,
  };

  // ── 1) Write the product fields ─────────────────────────────────────────
  // cgi/product_jqm2.pl is the long-standing write endpoint; it accepts
  // form-encoded fields and returns { status, status_verbose }.
  const fields: Record<string, string> = {
    code,
    ...authParams,
    comment: `Added via the ${APP_NAME} app`,
  };
  if (body.product_name?.trim()) fields.product_name = body.product_name.trim();
  if (body.brands?.trim()) fields.brands = body.brands.trim();
  if (body.quantity?.trim()) fields.quantity = body.quantity.trim();
  if (body.categories?.trim()) fields.categories = body.categories.trim();

  try {
    const res = await fetch(`${base}/cgi/product_jqm2.pl`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.status === 0) {
      return jsonRes({ error: data?.status_verbose || 'Open Food Facts rejected the write' }, 502);
    }
  } catch (e) {
    return jsonRes({ error: `Write failed: ${e instanceof Error ? e.message : 'unknown'}` }, 502);
  }

  // ── 2) Upload photos (best-effort, one per field) ───────────────────────
  // cgi/product_image_upload.pl: multipart with code, imagefield (front/
  // ingredients/nutrition) and the file under imgupload_<imagefield>.
  const imageResults: Record<string, boolean> = {};
  const images = body.images ?? {};
  for (const field of ['front', 'ingredients', 'nutrition'] as const) {
    const b64 = images[field];
    if (!b64) continue;
    try {
      const form = new FormData();
      form.set('code', code);
      for (const [k, v] of Object.entries(authParams)) form.set(k, v);
      form.set('imagefield', field);
      const blob = new Blob([b64ToBytes(b64)], { type: 'image/jpeg' });
      form.set(`imgupload_${field}`, blob, `${code}_${field}.jpg`);
      const res = await fetch(`${base}/cgi/product_image_upload.pl`, {
        method: 'POST',
        headers, // multipart boundary set automatically by fetch
        body: form,
      });
      imageResults[field] = res.ok;
    } catch {
      imageResults[field] = false;
    }
  }

  return jsonRes({ ok: true, code, target, images: imageResults });
});
