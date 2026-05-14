// Edge function: reply-comment
// Posts a reply to a comment on one of the user's Instagram posts.
//
// Body: { comment_id: string, message: string }
// verify_jwt = true — the user's token only lets them reply on their own media.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH = "https://graph.instagram.com";

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
    const commentId = (body.comment_id ?? "").toString();
    const message = (body.message ?? "").toString().trim();
    if (!commentId) return json({ error: "missing_comment_id" }, 400);
    if (!message) return json({ error: "empty_message" }, 400);
    if (message.length > 2200) return json({ error: "message_too_long" }, 400);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: conn } = await admin
      .from("social_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("platform", "instagram")
      .eq("status", "active")
      .maybeSingle();
    if (!conn) return json({ error: "no_instagram_connection" }, 404);

    const { data: tok } = await admin
      .from("social_tokens")
      .select("access_token")
      .eq("connection_id", conn.id)
      .single();
    if (!tok?.access_token) return json({ error: "no_token" }, 404);

    const params = new URLSearchParams({ message, access_token: tok.access_token });
    const r = await fetch(`${GRAPH}/${commentId}/replies`, { method: "POST", body: params });
    const j = await r.json();
    if (j.error || !j.id) {
      return json({ error: "reply_failed", detail: j.error ?? "unknown" }, 502);
    }

    return json({ replied: true, id: j.id });
  } catch (err) {
    console.error("reply-comment error:", err);
    return json({ error: "internal", detail: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
