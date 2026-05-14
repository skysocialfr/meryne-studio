// Edge function: publish-post
// Publishes a post to the user's connected Instagram account — either
// immediately (publish now) or by storing it for the scheduler (publish later).
//
// Body: {
//   caption?: string,
//   media_urls: string[],          // public HTTPS URLs (Supabase Storage)
//   post_type?: "image" | "carousel" | "reel",
//   scheduled_for?: string         // ISO date — if in the future, the post
//                                  // is queued instead of published now
// }
//
// verify_jwt = true — only the authed user can publish to their own account.

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
    const caption: string = (body.caption ?? "").toString();
    const mediaUrls: string[] = Array.isArray(body.media_urls) ? body.media_urls : [];
    const postType: string = (body.post_type ?? "image").toString();
    const scheduledFor: string | null = body.scheduled_for ?? null;

    if (!mediaUrls.length) return json({ error: "no_media" }, 400);
    if (mediaUrls.some((u) => typeof u !== "string" || !u.startsWith("https://"))) {
      return json({ error: "media_urls_must_be_https" }, 400);
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Find the user's active Instagram connection
    const { data: conn } = await admin
      .from("social_connections")
      .select("id, account_id")
      .eq("user_id", userId)
      .eq("platform", "instagram")
      .eq("status", "active")
      .maybeSingle();
    if (!conn) return json({ error: "no_instagram_connection" }, 404);

    // ── Schedule path: queue for the cron worker, don't publish now ──
    const when = scheduledFor ? new Date(scheduledFor) : null;
    if (when && when.getTime() > Date.now() + 60_000) {
      const { data: row, error: insErr } = await admin
        .from("scheduled_posts")
        .insert({
          user_id: userId,
          connection_id: conn.id,
          platform: "instagram",
          post_type: postType,
          caption,
          media_urls: mediaUrls,
          scheduled_for: when.toISOString(),
          status: "scheduled",
        })
        .select("id")
        .single();
      if (insErr) return json({ error: "schedule_failed", detail: insErr.message }, 500);
      return json({ scheduled: true, id: row.id, scheduled_for: when.toISOString() });
    }

    // ── Publish-now path ──
    const { data: tok } = await admin
      .from("social_tokens")
      .select("access_token")
      .eq("connection_id", conn.id)
      .single();
    if (!tok?.access_token) return json({ error: "no_token" }, 404);

    const result = await publishToInstagram(
      conn.account_id, tok.access_token, mediaUrls, caption, postType,
    );
    if (result.error) {
      return json({ error: "instagram_publish_failed", detail: result.error }, 502);
    }

    // Record the published post
    await admin.from("scheduled_posts").insert({
      user_id: userId,
      connection_id: conn.id,
      platform: "instagram",
      post_type: postType,
      caption,
      media_urls: mediaUrls,
      scheduled_for: new Date().toISOString(),
      status: "published",
      published_at: new Date().toISOString(),
      external_post_id: result.id,
    });

    return json({ published: true, external_post_id: result.id });
  } catch (err) {
    console.error("publish-post error:", err);
    return json({ error: "internal", detail: (err as Error).message }, 500);
  }
});

// Publishes media to Instagram via the Content Publishing API.
// Returns { id } on success or { error } on failure.
async function publishToInstagram(
  igUserId: string,
  token: string,
  mediaUrls: string[],
  caption: string,
  postType: string,
): Promise<{ id?: string; error?: unknown }> {
  const base = `${GRAPH}/${igUserId}`;

  // Build the publishable container
  let creationId: string;

  if (postType === "carousel" && mediaUrls.length > 1) {
    // 1. Create a child container per item
    const childIds: string[] = [];
    for (const url of mediaUrls) {
      const isVideo = /\.(mp4|mov)(\?|$)/i.test(url);
      const params = new URLSearchParams({ access_token: token, is_carousel_item: "true" });
      if (isVideo) { params.set("media_type", "VIDEO"); params.set("video_url", url); }
      else { params.set("image_url", url); }
      const r = await fetch(`${base}/media`, { method: "POST", body: params });
      const j = await r.json();
      if (j.error || !j.id) return { error: j.error ?? "child_container_failed" };
      childIds.push(j.id);
    }
    // 2. Create the carousel parent container
    const params = new URLSearchParams({
      access_token: token,
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption,
    });
    const r = await fetch(`${base}/media`, { method: "POST", body: params });
    const j = await r.json();
    if (j.error || !j.id) return { error: j.error ?? "carousel_container_failed" };
    creationId = j.id;
  } else {
    const url = mediaUrls[0];
    const isVideo = postType === "reel" || /\.(mp4|mov)(\?|$)/i.test(url);
    const params = new URLSearchParams({ access_token: token, caption });
    if (isVideo) { params.set("media_type", "REELS"); params.set("video_url", url); }
    else { params.set("image_url", url); }
    const r = await fetch(`${base}/media`, { method: "POST", body: params });
    const j = await r.json();
    if (j.error || !j.id) return { error: j.error ?? "container_failed" };
    creationId = j.id;
  }

  // Wait for the container to finish processing (videos especially)
  for (let i = 0; i < 20; i++) {
    const sr = await fetch(
      `${base}/${creationId}?fields=status_code&access_token=${token}`,
    );
    const sj = await sr.json();
    if (sj.status_code === "FINISHED") break;
    if (sj.status_code === "ERROR") return { error: "container_processing_error" };
    await new Promise((res) => setTimeout(res, 3000));
  }

  // Publish the container
  const pubParams = new URLSearchParams({ access_token: token, creation_id: creationId });
  const pr = await fetch(`${base}/media_publish`, { method: "POST", body: pubParams });
  const pj = await pr.json();
  if (pj.error || !pj.id) return { error: pj.error ?? "publish_failed" };
  return { id: pj.id };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
