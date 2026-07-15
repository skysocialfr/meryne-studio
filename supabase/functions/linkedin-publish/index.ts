// Edge function: linkedin-publish
// Publishes a text post to LinkedIn as the authed user (their personal
// feed). v1: text only — media support comes later. The user's access
// token is read from social_tokens.
//
// Body: { text: string }
// verify_jwt = true

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const text = (body.text ?? "").toString().trim();
    const bodyWs: string | null = typeof body.workspace_id === "string" ? body.workspace_id : null;
    if (!text) return json({ error: "missing_text" }, 400);
    if (text.length > 3000) return json({ error: "text_too_long" }, 400);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const workspaceId = bodyWs ?? await personalWorkspace(admin, userId);
    if (!workspaceId) return json({ error: "no_workspace" }, 404);

    const { data: conn } = await admin
      .from("social_connections")
      .select("id, account_id")
      .eq("workspace_id", workspaceId)
      .eq("platform", "linkedin")
      .eq("status", "active")
      .maybeSingle();
    if (!conn) return json({ error: "no_linkedin_connection" }, 404);

    const { data: tok } = await admin
      .from("social_tokens")
      .select("access_token")
      .eq("connection_id", conn.id)
      .single();
    if (!tok?.access_token) return json({ error: "no_token" }, 404);

    // Modern LinkedIn Posts API
    const r = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tok.access_token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202405",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: `urn:li:person:${conn.account_id}`,
        commentary: text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });
    if (!r.ok) {
      const errBody = await r.text();
      // Token expired / invalid → mark connection
      if (r.status === 401) {
        await admin.from("social_connections")
          .update({ status: "expired" }).eq("id", conn.id);
      }
      return json({ error: "linkedin_publish_failed", status: r.status, detail: errBody }, 502);
    }
    const postId = r.headers.get("x-restli-id") || "ok";
    return json({ published: true, external_post_id: postId });
  } catch (err) {
    console.error("linkedin-publish error:", err);
    return json({ error: "internal", detail: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
async function personalWorkspace(admin: any, userId: string): Promise<string | null> {
  const { data } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_personal", true)
    .maybeSingle();
  return data?.id ?? null;
}
