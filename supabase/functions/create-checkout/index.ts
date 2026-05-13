// Edge function: create-checkout
// Creates a Stripe Checkout Session for the authenticated user.
// Trial: 7 days, payment method required.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const user = userData.user;

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, subscription_status")
      .eq("id", user.id)
      .single();

    if (profileErr) {
      return json({ error: "profile_lookup_failed", detail: profileErr.message }, 500);
    }

    // Already entitled? Block to avoid double-subscribing.
    if (profile?.subscription_status === "active" || profile?.subscription_status === "trialing") {
      return json({ error: "already_subscribed" }, 400);
    }

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const appUrl = Deno.env.get("APP_URL") ?? "https://veyrastudio.fr";

    // Whitelist of allowed Stripe price IDs (Solo / Pro / Agency)
    const ALLOWED_PRICES = new Set([
      "price_1TWY5oAIFObJ3lA9b1ioqI8c",  // Solo  — 9.99 EUR/mo
      "price_1TWjvS0wPb5M8Vv3ipQvWtU7",  // Pro   — 19.99 EUR/mo
      "price_1TWjvl0wPb5M8Vv3887w92ru",  // Agency — 59.99 EUR/mo
    ]);
    const DEFAULT_PRICE = Deno.env.get("STRIPE_PRICE_ID")
      ?? "price_1TWY5oAIFObJ3lA9b1ioqI8c";

    let body: { price_id?: string } = {};
    try { body = await req.json(); } catch { /* no body, use default */ }

    const priceId = body.price_id ?? DEFAULT_PRICE;
    if (!ALLOWED_PRICES.has(priceId)) {
      return json({ error: "invalid_price_id" }, 400);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { supabase_user_id: user.id },
      },
      payment_method_collection: "always",
      success_url: `${appUrl}/?checkout=success`,
      cancel_url:  `${appUrl}/?checkout=cancel`,
      allow_promotion_codes: true,
      locale: "fr",
      billing_address_collection: "auto",
      automatic_tax: { enabled: false },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error("create-checkout error:", err);
    return json({ error: "internal", detail: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
