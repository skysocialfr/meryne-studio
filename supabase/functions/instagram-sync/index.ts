// Edge function: instagram-sync
// Pulls the authenticated user's REAL Instagram data via the stored
// long-lived token: profile (followers, media count) + recent media.
// Called on-demand by the app (Feed / Stats / Abonnés tabs).
//
// verify_jwt = true — only the authed user can fetch their own data.

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

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Find the user's active Instagram connection
    const { data: conn } = await admin
      .from("social_connections")
      .select("id, account_id, account_username")
      .eq("user_id", userId)
      .eq("platform", "instagram")
      .eq("status", "active")
      .maybeSingle();
    if (!conn) return json({ error: "no_instagram_connection" }, 404);

    // 2. Read the (service-role-only) access token
    const { data: tok } = await admin
      .from("social_tokens")
      .select("access_token")
      .eq("connection_id", conn.id)
      .single();
    if (!tok?.access_token) return json({ error: "no_token" }, 404);
    const token = tok.access_token;

    // 3. Profile + follower stats
    const profileRes = await fetch(
      `${GRAPH}/me?fields=user_id,username,name,profile_picture_url,` +
      `followers_count,follows_count,media_count&access_token=${token}`
    );
    const profile = await profileRes.json();
    if (profile.error) {
      // Token likely expired or revoked
      await admin.from("social_connections")
        .update({ status: "expired" }).eq("id", conn.id);
      return json({ error: "instagram_api_error", detail: profile.error }, 502);
    }

    // 4. Recent media (last 24 posts)
    const mediaRes = await fetch(
      `${GRAPH}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,` +
      `permalink,timestamp,like_count,comments_count&limit=24&access_token=${token}`
    );
    const mediaData = await mediaRes.json();
    const media = Array.isArray(mediaData.data) ? mediaData.data : [];

    // 5. Refresh the connection's cached stats + sync timestamp
    await admin.from("social_connections")
      .update({
        account_username: profile.username ?? conn.account_username,
        account_avatar_url: profile.profile_picture_url ?? null,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", conn.id);

    return json({
      profile: {
        username: profile.username ?? null,
        name: profile.name ?? null,
        avatar: profile.profile_picture_url ?? null,
        followers: profile.followers_count ?? null,
        follows: profile.follows_count ?? null,
        media_count: profile.media_count ?? null,
      },
      media: media.map((m: Record<string, unknown>) => ({
        id: m.id,
        caption: m.caption ?? "",
        type: m.media_type,
        url: m.media_url ?? m.thumbnail_url ?? null,
        thumbnail: m.thumbnail_url ?? m.media_url ?? null,
        permalink: m.permalink ?? null,
        timestamp: m.timestamp ?? null,
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
      })),
    });
  } catch (err) {
    console.error("instagram-sync error:", err);
    return json({ error: "internal", detail: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
