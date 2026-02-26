// supabase/functions/revenuecat-webhook/index.ts
//
// Handles RevenueCat webhook events for native iOS / Android purchases.
// When a user upgrades via the App Store or Play Store, RevenueCat fires
// this endpoint and we keep profiles.is_plus in sync.
//
// Required Supabase secrets (set via `supabase secrets set`):
//   REVENUECAT_WEBHOOK_SECRET  — Set in RevenueCat Dashboard → Integrations → Webhooks
//                                (used as the Authorization header value)
//   SUPABASE_URL               — Injected automatically by Supabase
//   SUPABASE_SERVICE_ROLE_KEY  — Injected automatically by Supabase
//
// Configure in RevenueCat Dashboard → Integrations → Webhooks:
//   URL: https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
//   Authorization: <REVENUECAT_WEBHOOK_SECRET>
//   Events: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE

import { createClient } from 'npm:@supabase/supabase-js@2';

const ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'REACTIVATION',
  'UNCANCELLATION',
]);

const INACTIVE_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
]);

Deno.serve(async (req) => {
  // Verify RevenueCat webhook secret
  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (webhookSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  let body: { event?: { type?: string; app_user_id?: string; expiration_at_ms?: number } };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const eventType = body.event?.type;
  // app_user_id should be set to the Supabase user UUID via Purchases.logIn()
  const userId = body.event?.app_user_id;

  if (!userId || !eventType) {
    return new Response(JSON.stringify({ received: true }));
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  if (ACTIVE_EVENTS.has(eventType)) {
    const update: Record<string, unknown> = { is_plus: true };
    if (body.event?.expiration_at_ms) {
      update.subscription_renewal_date = new Date(body.event.expiration_at_ms).toISOString();
    }
    await supabase.from('profiles').update(update).eq('id', userId);
  } else if (INACTIVE_EVENTS.has(eventType)) {
    await supabase.from('profiles').update({ is_plus: false, subscription_renewal_date: null }).eq('id', userId);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
