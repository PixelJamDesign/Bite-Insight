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
import { sendPushAndLog } from '../_shared/sendPushAndLog.ts';

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

  let body: {
    event?: {
      type?: string;
      app_user_id?: string;
      expiration_at_ms?: number;
      event_timestamp_ms?: number;
      period_type?: string; // 'NORMAL' | 'TRIAL' | 'INTRO' | 'PROMOTIONAL'
    };
  };
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

    // Trial detection — record trial boundaries when the user is in
    // their intro-offer period so the Day-6 reminder cron has
    // accurate timestamps. We treat INITIAL_PURCHASE with
    // period_type=TRIAL as the canonical "trial started" signal.
    // INTRO covers Apple's "pay as you go / pay up front" intro
    // offers — not currently used, but folded in defensively.
    const periodType = body.event?.period_type;
    const isTrialPeriod = periodType === 'TRIAL' || periodType === 'INTRO';

    if (eventType === 'INITIAL_PURCHASE' && isTrialPeriod) {
      const startedAt = body.event?.event_timestamp_ms
        ? new Date(body.event.event_timestamp_ms).toISOString()
        : new Date().toISOString();
      update.trial_started_at = startedAt;
      if (body.event?.expiration_at_ms) {
        update.trial_ends_at = new Date(body.event.expiration_at_ms).toISOString();
      }
      // Clear any stale reminder flags from a prior trial cycle so
      // pushes fire for this one. Day-0 welcome and Day-6 reminder
      // both use this pattern.
      update.trial_reminder_sent_at = null;
      update.trial_welcome_sent_at = null;
    }

    await supabase.from('profiles').update(update).eq('id', userId);

    // ── Day-0 trial welcome push ────────────────────────────────────────────
    // Fires immediately when a fresh trial is detected. Idempotent via
    // trial_welcome_sent_at — if RC re-delivers the same event we
    // skip the second send (the column was reset above, so this only
    // re-fires if we haven't yet stamped it).
    //
    // sendPushAndLog handles three things in one call:
    //   1. Insert a row to public.notifications (visible in the inbox)
    //   2. Look up the user's push token
    //   3. Fire the actual push if a token exists
    // Even users without a token get the inbox row, so the welcome
    // copy is still reachable when they open the app.
    if (eventType === 'INITIAL_PURCHASE' && isTrialPeriod) {
      const { data: user } = await supabase
        .from('profiles')
        .select('full_name, trial_welcome_sent_at')
        .eq('id', userId)
        .single();

      if (!user?.trial_welcome_sent_at) {
        const firstName = user?.full_name?.split(' ')[0];
        const title = firstName
          ? `Welcome to Bite Insight+, ${firstName}`
          : 'Welcome to Bite Insight+';
        const result = await sendPushAndLog(supabase, userId, {
          title,
          body: "Your 7-day trial is live. Tap to see what's now unlocked.",
          sound: 'default',
          priority: 'high',
          badge: 1,
          data: {
            type: 'trial_welcome',
            deepLink: 'biteinsight://upgrade-success',
          },
        });

        // Stamp as sent if EITHER the push went through OR we at least
        // logged it to the inbox. Either way the user has received this
        // welcome and we don't want to send a second one.
        if (result.logged || result.sent > 0) {
          await supabase
            .from('profiles')
            .update({ trial_welcome_sent_at: new Date().toISOString() })
            .eq('id', userId);
          console.log(
            `[revenuecat-webhook] Day-0 welcome processed for ${userId}`,
            `(push sent: ${result.sent}, logged: ${result.logged})`,
          );
        } else {
          console.warn(
            `[revenuecat-webhook] Day-0 welcome failed entirely for ${userId}:`,
            result.errors,
          );
        }
      }
    }
  } else if (INACTIVE_EVENTS.has(eventType)) {
    // Never downgrade VIP users — they have lifetime access regardless of subscription state
    const { data: profile } = await supabase.from('profiles').select('is_vip').eq('id', userId).single();
    if (profile?.is_vip) {
      console.log(`[revenuecat-webhook] Skipping downgrade for VIP user ${userId}`);
    } else {
      await supabase.from('profiles').update({ is_plus: false, subscription_renewal_date: null }).eq('id', userId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
