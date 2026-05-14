// Edge function: instagram-stats
// Builds the real analytics dataset for the Stats tab:
//  - per-post insights (reach, views, saves, shares, interactions) for the
//    recent media
//  - account-level time series (follower count + reach) over the last 30 days
//
// Heavier than instagram-sync (one insights call per post), so it's only
// invoked when the Stats tab is opened.
//
// verify_jwt = true — only the authed user, scoped to their own token.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH = "https://graph.instagram.com";
const POST_METRICS = "reach,views,saved,shares,total_interactions";

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

    const { data: conn } = await admin
      .from("social_connections")
      .select("id, account_id")
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

    // ── Profile (followers, media count) ──
    let profile: Record<string, unknown> = {};
    try {
      const pr = await fetch(
        `${GRAPH}/me?fields=username,name,profile_picture_url,followers_count,` +
        `follows_count,media_count&access_token=${token}`,
      );
      const pj = await pr.json();
      if (!pj.error) {
        profile = {
          username: pj.username ?? null,
          followers: pj.followers_count ?? null,
          follows: pj.follows_count ?? null,
          media_count: pj.media_count ?? null,
        };
      }
    } catch (_e) { /* keep going */ }

    // ── Recent media ──
    const mediaRes = await fetch(
      `${GRAPH}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,` +
      `permalink,timestamp,like_count,comments_count&limit=25&access_token=${token}`,
    );
    const mediaData = await mediaRes.json();
    if (mediaData.error) {
      return json({ error: "media_fetch_failed", detail: mediaData.error }, 502);
    }
    const rawMedia = Array.isArray(mediaData.data) ? mediaData.data : [];

    // ── Per-post insights (one call per post, in parallel) ──
    const posts = await Promise.all(rawMedia.map(async (m: Record<string, any>) => {
      const insights = await fetchPostInsights(m.id, token);
      return {
        id: m.id,
        caption: m.caption ?? "",
        type: m.media_type,
        url: m.media_url ?? m.thumbnail_url ?? null,
        thumbnail: m.thumbnail_url ?? m.media_url ?? null,
        permalink: m.permalink ?? null,
        timestamp: m.timestamp ?? null,
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
        reach: insights.reach ?? null,
        views: insights.views ?? null,
        saved: insights.saved ?? null,
        shares: insights.shares ?? null,
        total_interactions: insights.total_interactions ?? null,
      };
    }));

    // ── Account-level time series (last 30 days) ──
    const account = await fetchAccountSeries(token);

    return json({ profile, posts, account });
  } catch (err) {
    console.error("instagram-stats error:", err);
    return json({ error: "internal", detail: (err as Error).message }, 500);
  }
});

// Fetches the insight metrics for one media item. Individual metric failures
// are swallowed — whatever Instagram returns is kept.
async function fetchPostInsights(
  mediaId: string,
  token: string,
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const r = await fetch(
      `${GRAPH}/${mediaId}/insights?metric=${POST_METRICS}&access_token=${token}`,
    );
    const j = await r.json();
    if (Array.isArray(j.data)) {
      for (const row of j.data) {
        let v: number | null = null;
        if (row.total_value && typeof row.total_value.value === "number") {
          v = row.total_value.value;
        } else if (Array.isArray(row.values) && row.values.length) {
          v = row.values[0].value;
        }
        if (typeof v === "number") out[row.name] = v;
      }
      return out;
    }
  } catch (_e) { /* fall through */ }

  // The batched call failed — retry each metric on its own.
  await Promise.all(POST_METRICS.split(",").map(async (metric) => {
    try {
      const r = await fetch(
        `${GRAPH}/${mediaId}/insights?metric=${metric}&access_token=${token}`,
      );
      const j = await r.json();
      if (Array.isArray(j.data) && j.data.length) {
        const row = j.data[0];
        let v: number | null = null;
        if (row.total_value && typeof row.total_value.value === "number") {
          v = row.total_value.value;
        } else if (Array.isArray(row.values) && row.values.length) {
          v = row.values[0].value;
        }
        if (typeof v === "number") out[metric] = v;
      }
    } catch (_e) { /* skip this metric */ }
  }));
  return out;
}

// Fetches the account-level daily series for follower count + reach over the
// last 30 days. Returns { followers: [{date,value}], reach: [{date,value}] }.
async function fetchAccountSeries(
  token: string,
): Promise<{ followers: unknown[]; reach: unknown[] }> {
  const until = Math.floor(Date.now() / 1000);
  const since = until - 30 * 86400;

  async function series(metric: string): Promise<unknown[]> {
    try {
      const r = await fetch(
        `${GRAPH}/me/insights?metric=${metric}&period=day&since=${since}&until=${until}&access_token=${token}`,
      );
      const j = await r.json();
      if (Array.isArray(j.data) && j.data.length && Array.isArray(j.data[0].values)) {
        return j.data[0].values.map((v: Record<string, any>) => ({
          date: v.end_time ?? null,
          value: typeof v.value === "number" ? v.value : 0,
        }));
      }
    } catch (_e) { /* ignore */ }
    return [];
  }

  const [followers, reach] = await Promise.all([
    series("follower_count"),
    series("reach"),
  ]);
  return { followers, reach };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
