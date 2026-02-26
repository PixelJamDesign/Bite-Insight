// supabase/functions/stripe-webhook/index.ts
//
// Handles Stripe webhook events and keeps profiles.is_plus in sync.
//
// Required Supabase secrets (set via `supabase secrets set`):
//   STRIPE_SECRET_KEY        — Stripe secret key
//   STRIPE_WEBHOOK_SECRET    — Webhook signing secret from Stripe Dashboard
//   SUPABASE_URL             — Injected automatically by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — Injected automatically by Supabase
//
// Configure in Stripe Dashboard → Webhooks → Add endpoint:
//   URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed
//            customer.subscription.updated
//            customer.subscription.deleted

import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

// Manual Stripe webhook signature verification — avoids SDK version / subtle-crypto issues in Deno.
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
  toleranceSec = 300,
): Promise<boolean> {
  const parts = Object.fromEntries(
    sigHeader.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k, v];
    }),
  );
  const timestamp = parts['t'];
  const v1 = parts['v1'];
  if (!timestamp || !v1) return false;

  // Timing tolerance check
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > toleranceSec) return false;

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return expected === v1;
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

  // Verify the webhook signature manually
  const valid = await verifyStripeSignature(body, signature, webhookSecret);
  if (!valid) {
    console.error('Webhook signature verification failed. sig header:', signature.substring(0, 40) + '...');
    return new Response('Invalid signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = JSON.parse(body) as Stripe.Event;
  } catch (err) {
    console.error('Failed to parse webhook body:', err);
    return new Response('Invalid payload', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let userId: string | undefined;
  let isPlus = false;
  let renewalDate: string | null = null;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession;
      userId = session.metadata?.user_id;
      isPlus = true;
      // Persist the Stripe customer ID for future subscription lookups
      if (userId && session.customer) {
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: session.customer as string })
          .eq('id', userId);
      }
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      userId = sub.metadata?.user_id;
      isPlus = sub.status === 'active' || sub.status === 'trialing';
      if (sub.current_period_end) {
        renewalDate = new Date(sub.current_period_end * 1000).toISOString();
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      userId = sub.metadata?.user_id;
      isPlus = false;
      renewalDate = null;
      break;
    }
  }

  if (userId) {
    const update: Record<string, unknown> = { is_plus: isPlus };
    if (renewalDate !== null || event.type === 'customer.subscription.deleted') {
      update.subscription_renewal_date = renewalDate;
    }
    const { error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', userId);
    if (error) console.error('Supabase update error:', error);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
