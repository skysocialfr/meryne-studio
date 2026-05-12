// Edge function: stripe-webhook
// Receives Stripe events and syncs the user's subscription state into public.profiles.
// IMPORTANT: deployed with verify_jwt=false. Authentication is the Stripe signature.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase: SupabaseClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;
  const trialEnd = sub.trial_end
    ? new Date(sub.trial_end * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_id: sub.id,
      subscription_status: sub.status,
      subscription_price_id: priceId,
      current_period_end: currentPeriodEnd,
      trial_end: trialEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
    })
    .eq("stripe_customer_id", customerId);

  if (error) console.error("syncSubscription failed:", customerId, error.message);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("missing_signature", { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Signature verification failed:", (err as Error).message);
    return new Response("invalid_signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.trial_will_end":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await supabase
          .from("profiles")
          .update({
            subscription_status: "canceled",
            subscription_id: null,
            cancel_at_period_end: false,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
          await syncSubscription(sub);
        }
        break;
      }

      case "checkout.session.completed": {
        // First-time signup: fetch the subscription if present and sync.
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await syncSubscription(sub);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Handler error", event.type, (err as Error).message);
    return new Response("handler_error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
