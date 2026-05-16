// Edge function: send-email
// Thin wrapper around Resend's API so the rest of the app can send
// transactional emails without touching the provider directly.
//
// Body: { to: string|string[], subject: string, html: string, from?: string }
// verify_jwt = false — meant to be called by other server-side flows
// (welcome email after signup, trial reminders from pg_cron). We
// authenticate via the Vault cron_secret reuse so only our own
// services can call it.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API = "https://api.resend.com/emails";
const DEFAULT_FROM = "Veyra Studio <onboarding@resend.dev>"; // override in body.from with your verified domain

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return json({ error: "email_not_configured" }, 503);

  // Authenticate: either a valid Supabase user JWT, or our Vault cron_secret
  const auth = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let allowed = false;
  // Check Vault secret (used by pg_cron)
  try {
    const { data: ok } = await admin.rpc("verify_cron_secret", { candidate: auth });
    if (ok) allowed = true;
  } catch (_e) { /* ignore */ }
  // Or a logged-in user (used by client-side welcome trigger after signup)
  if (!allowed) {
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) allowed = true;
  }
  if (!allowed) return json({ error: "forbidden" }, 403);

  try {
    const body = await req.json().catch(() => ({}));
    const to = body.to;
    const subject = (body.subject ?? "").toString();
    const html = (body.html ?? "").toString();
    const from = (body.from ?? DEFAULT_FROM).toString();
    if (!to || !subject || !html) return json({ error: "missing_fields" }, 400);

    const r = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: "resend_failed", detail: j }, 502);
    return json({ sent: true, id: j.id });
  } catch (err) {
    console.error("send-email error:", err);
    return json({ error: "internal", detail: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
