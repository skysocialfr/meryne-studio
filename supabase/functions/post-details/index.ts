// Edge function: post-details
// Returns the insights (stats) + comment thread for one published
// Instagram post, so the user can analyse it and reply without leaving Veyra.
//
// Body: { media_id: string }
// verify_jwt = true — only the authed user, scoped to their own token.

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
    const mediaId = (body.media_id ?? "").toString();
    if (!mediaId) return json({ error: "missing_media_id" }, 400);

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
    const token = tok.access_token;

    // 1. Media details
    const mediaRes = await fetch(
      `${GRAPH}/${mediaId}?fields=id,caption,media_type,media_url,thumbnail_url,` +
      `permalink,timestamp,like_count,comments_count&access_token=${token}`,
    );
    const media = await mediaRes.json();
    if (media.error) return json({ error: "media_fetch_failed", detail: media.error }, 502);

    const isVideo = media.media_type === "VIDEO";

    // 2. Insights — metric set depends on the media type. Failures here are
    //    non-fatal (old posts / carousels can lack some metrics).
    const metrics = isVideo
      ? "reach,likes,comments,saved,shares,views,total_interactions"
      : "reach,likes,comments,saved,shares,total_interactions";
    let insights: Record<string, number> = {};
    try {
      const insRes = await fetch(
        `${GRAPH}/${mediaId}/insights?metric=${metrics}&access_token=${token}`,
      );
      const insJson = await insRes.json();
      if (Array.isArray(insJson.data)) {
        for (const row of insJson.data) {
          const val = row?.values?.[0]?.value;
          if (typeof val === "number") insights[row.name] = val;
        }
      }
    } catch (_e) { /* insights unavailable — keep going */ }

    // 3. Comments (top-level + replies)
    let comments: unknown[] = [];
    try {
      const comRes = await fetch(
        `${GRAPH}/${mediaId}/comments?fields=id,text,username,timestamp,like_count,` +
        `replies{id,text,username,timestamp,like_count}&limit=50&access_token=${token}`,
      );
      const comJson = await comRes.json();
      if (Array.isArray(comJson.data)) {
        comments = comJson.data.map((c: Record<string, any>) => ({
          id: c.id,
          text: c.text ?? "",
          username: c.username ?? "",
          timestamp: c.timestamp ?? null,
          like_count: c.like_count ?? 0,
          replies: Array.isArray(c.replies?.data)
            ? c.replies.data.map((r: Record<string, any>) => ({
                id: r.id,
                text: r.text ?? "",
                username: r.username ?? "",
                timestamp: r.timestamp ?? null,
                like_count: r.like_count ?? 0,
              }))
            : [],
        }));
      }
    } catch (_e) { /* comments unavailable */ }

    return json({
      media: {
        id: media.id,
        caption: media.caption ?? "",
        type: media.media_type,
        url: media.media_url ?? media.thumbnail_url ?? null,
        thumbnail: media.thumbnail_url ?? media.media_url ?? null,
        permalink: media.permalink ?? null,
        timestamp: media.timestamp ?? null,
        likes: media.like_count ?? 0,
        comments: media.comments_count ?? 0,
      },
      insights,
      comments,
    });
  } catch (err) {
    console.error("post-details error:", err);
    return json({ error: "internal", detail: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
