// Edge function: ai-generate
// Centralised Claude proxy — uses the project's own ANTHROPIC_API_KEY so
// users don't have to bring their own. Gated by entitlement (admins, trial
// or active subscription) to prevent freeloading.
//
// Body: { prompt: string, max_tokens?: number }
// verify_jwt = true

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 1024;
const HARD_MAX_TOKENS = 4096;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ai_not_configured" }, 503);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin
      .from("profiles")
      .select("role, subscription_status")
      .eq("id", userId)
      .single();

    if (!profile) return json({ error: "profile_not_found" }, 404);
    const entitled = profile.role === "admin"
      || profile.subscription_status === "active"
      || profile.subscription_status === "trialing";
    if (!entitled) return json({ error: "subscription_required" }, 403);

    const body = await req.json().catch(() => ({}));
    const prompt = (body.prompt ?? "").toString();
    if (!prompt) return json({ error: "missing_prompt" }, 400);
    if (prompt.length > 12000) return json({ error: "prompt_too_long" }, 400);

    const maxTokens = Math.min(
      Math.max(parseInt(body.max_tokens ?? DEFAULT_MAX_TOKENS, 10) || DEFAULT_MAX_TOKENS, 64),
      HARD_MAX_TOKENS,
    );

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const j = await r.json();
    if (j.error) return json({ error: "anthropic_error", detail: j.error }, 502);
    const text = j.content && j.content[0] ? j.content[0].text : "";
    return json({ text: text });
  } catch (err) {
    console.error("ai-generate error:", err);
    return json({ error: "internal", detail: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
