// Edge function: tiktok-publish
// Initiates a TikTok video post via the Content Posting API's pull-from-URL
// flow. The video must be reachable at a public HTTPS URL (we already
// have the post-media bucket configured for this).
//
// Body: { video_url: string, title?: string, privacy_level?: string }
// verify_jwt = true
//
// NOTE — TikTok requires App Review approval to publish to real
// accounts. While in sandbox, only verified test users can publish.

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
    const videoUrl = (body.video_url ?? "").toString().trim();
    const title = (body.title ?? "").toString().slice(0, 2200);
    const privacy = ((body.privacy_level ?? "SELF_ONLY") as string).toUpperCase();
    // Allowed: PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, FOLLOWER_OF_CREATOR, SELF_ONLY
    if (!videoUrl) return json({ error: "missing_video_url" }, 400);
    if (!/^https:\/\//.test(videoUrl)) return json({ error: "video_url_must_be_https" }, 400);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: conn } = await admin
      .from("social_connections")
      .select("id, account_id")
      .eq("user_id", userId)
      .eq("platform", "tiktok")
      .eq("status", "active")
      .maybeSingle();
    if (!conn) return json({ error: "no_tiktok_connection" }, 404);

    const { data: tok } = await admin
      .from("social_tokens")
      .select("access_token")
      .eq("connection_id", conn.id)
      .single();
    if (!tok?.access_token) return json({ error: "no_token" }, 404);

    // Initialize the publish job (pull from URL)
    const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok.access_token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: title || "",
          privacy_level: privacy,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: videoUrl,
        },
      }),
    });
    const initJson = await initRes.json();
    if (!initRes.ok || initJson.error?.code) {
      if (initRes.status === 401) {
        await admin.from("social_connections").update({ status: "expired" }).eq("id", conn.id);
      }
      return json({ error: "tiktok_init_failed", status: initRes.status, detail: initJson }, 502);
    }
    const publishId = initJson.data?.publish_id;
    if (!publishId) return json({ error: "no_publish_id", detail: initJson }, 502);

    return json({ initialized: true, publish_id: publishId,
      note: "TikTok pulls the video asynchronously. Use publish_id with /v2/post/publish/status/fetch/ to follow progress." });
  } catch (err) {
    console.error("tiktok-publish error:", err);
    return json({ error: "internal", detail: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
