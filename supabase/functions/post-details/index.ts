// Edge function: post-details
// Returns the insights (stats) + comment thread for one published
// Instagram post, so the user can analyse it and reply without leaving Veyra.
//
// Body: { media_id: string }
// verify_jwt = true — only the authed user, scoped to their own token.
//
// Each metric is fetched in its own request (in parallel) so that one
// unsupported metric for a given media type can't blank out all the others.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH = "https://graph.instagram.com";

// Simple media metrics — fetched one by one so an unsupported one is just skipped.
const SIMPLE_METRICS = [
  "reach", "views", "total_interactions", "likes", "comments",
  "saved", "shares", "profile_visits", "follows",
];

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

    // 2. Insights — every metric + the follower/non-follower breakdowns,
    //    all fetched in parallel; failures are individually swallowed.
    const insights: Record<string, number> = {};
    const breakdowns: Record<string, Record<string, number>> = {};

    const metricJobs = SIMPLE_METRICS.map(async (m) => {
      const res = await fetchMetric(mediaId, token, m);
      if (res && res.value != null) insights[m] = res.value;
    });
    const breakdownJobs = ["reach", "views"].map(async (m) => {
      const res = await fetchMetric(mediaId, token, m, "follow_type");
      if (res && res.breakdowns) breakdowns[m] = res.breakdowns;
    });
    await Promise.all([...metricJobs, ...breakdownJobs]);

    // 3. Comments — try with nested replies, fall back to a flat fetch.
    const { comments, error: commentsError } = await fetchComments(mediaId, token);

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
      breakdowns,
      comments,
      comments_error: commentsError,
    });
  } catch (err) {
    console.error("post-details error:", err);
    return json({ error: "internal", detail: (err as Error).message }, 500);
  }
});

// Fetches a single insight metric (optionally with a breakdown dimension).
// Returns { value, breakdowns } or null if the metric isn't available.
async function fetchMetric(
  mediaId: string,
  token: string,
  metric: string,
  breakdown?: string,
): Promise<{ value: number | null; breakdowns: Record<string, number> | null } | null> {
  try {
    let url = `${GRAPH}/${mediaId}/insights?metric=${metric}&access_token=${token}`;
    if (breakdown) url += `&breakdown=${breakdown}&metric_type=total_value`;
    const r = await fetch(url);
    const j = await r.json();
    if (j.error || !Array.isArray(j.data) || !j.data.length) return null;
    const row = j.data[0];

    let value: number | null = null;
    if (row.total_value && typeof row.total_value.value === "number") {
      value = row.total_value.value;
    } else if (Array.isArray(row.values) && row.values.length &&
               typeof row.values[0].value === "number") {
      value = row.values[0].value;
    }

    let bd: Record<string, number> | null = null;
    const rawBd = row.total_value?.breakdowns;
    if (Array.isArray(rawBd) && rawBd.length && Array.isArray(rawBd[0].results)) {
      bd = {};
      for (const res of rawBd[0].results) {
        const key = (res.dimension_values ?? []).join("/");
        if (key) bd[key] = res.value;
      }
    }
    return { value, breakdowns: bd };
  } catch (_e) {
    return null;
  }
}

// Fetches comments, degrading gracefully if the replies expansion isn't allowed.
async function fetchComments(
  mediaId: string,
  token: string,
): Promise<{ comments: unknown[]; error: string | null }> {
  const fieldSets = [
    "id,text,username,timestamp,like_count,replies{id,text,username,timestamp,like_count}",
    "id,text,username,timestamp,like_count",
    "id,text,timestamp",
  ];
  let lastError: string | null = null;

  for (const fields of fieldSets) {
    try {
      const r = await fetch(
        `${GRAPH}/${mediaId}/comments?fields=${fields}&limit=50&access_token=${token}`,
      );
      const j = await r.json();
      if (j.error) {
        lastError = typeof j.error === "object" ? JSON.stringify(j.error) : String(j.error);
        continue;
      }
      if (Array.isArray(j.data)) {
        const comments = j.data.map((c: Record<string, any>) => ({
          id: c.id,
          text: c.text ?? "",
          username: c.username ?? "",
          timestamp: c.timestamp ?? null,
          like_count: c.like_count ?? 0,
          replies: Array.isArray(c.replies?.data)
            ? c.replies.data.map((rep: Record<string, any>) => ({
                id: rep.id,
                text: rep.text ?? "",
                username: rep.username ?? "",
                timestamp: rep.timestamp ?? null,
                like_count: rep.like_count ?? 0,
              }))
            : [],
        }));
        return { comments, error: null };
      }
    } catch (e) {
      lastError = (e as Error).message;
    }
  }
  return { comments: [], error: lastError };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
