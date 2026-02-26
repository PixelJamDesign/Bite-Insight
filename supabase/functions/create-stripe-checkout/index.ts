// supabase/functions/create-stripe-checkout/index.ts
//
// Creates a Stripe Checkout session for the BiteInsight+ subscription.
//
// Required Supabase secrets (set via `supabase secrets set`):
//   STRIPE_SECRET_KEY   — Stripe secret key (sk_live_... or sk_test_...)
//   STRIPE_PRICE_ID     — Stripe Price ID for the monthly subscription (price_...)
//   APP_URL             — Base URL of the web app (e.g. https://biteinsightapp.com)
//                         Used to build success_url and cancel_url.

import Stripe from 'npm:stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json() as { user_id: string };

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-04-10',
    });

    const appUrl = Deno.env.get('APP_URL') ?? 'https://biteinsightapp.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        { price: Deno.env.get('STRIPE_PRICE_ID')!, quantity: 1 },
      ],
      // On success, redirect back to the app. On mobile the deep link
      // biteinsight:// will open the app; on web this lands on /upgrade-success.
      success_url: `${appUrl}/upgrade-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/upgrade`,
      // Store the Supabase user ID so the stripe-webhook can identify the user
      metadata: { user_id },
      subscription_data: { metadata: { user_id } },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-stripe-checkout error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
