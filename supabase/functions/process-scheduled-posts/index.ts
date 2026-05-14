// Edge function: process-scheduled-posts
// Cron worker — publishes any scheduled_posts whose time has come.
// Invoked every minute by pg_cron (via pg_net). Authenticated by a shared
// secret stored in Supabase Vault (verify_jwt = false).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GRAPH = "https://graph.instagram.com";

Deno.serve(async (req: Request) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  const candidate = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/, "");
  const { data: ok } = await admin.rpc("verify_cron_secret", { candidate });
  if (!ok) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  // Claim the due posts (status -> publishing) so a second run can't double-publish
  const { data: due } = await admin
    .from("scheduled_posts")
    .select("id, connection_id, post_type, caption, media_urls")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .limit(10);

  if (!due || !due.length) return json({ processed: 0 });

  let published = 0, failed = 0;

  for (const post of due) {
    // Claim it
    const { data: claimed } = await admin
      .from("scheduled_posts")
      .update({ status: "publishing" })
      .eq("id", post.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (!claimed) continue; // already claimed by another run

    try {
      const { data: tok } = await admin
        .from("social_tokens")
        .select("access_token")
        .eq("connection_id", post.connection_id)
        .single();
      const { data: conn } = await admin
        .from("social_connections")
        .select("account_id")
        .eq("id", post.connection_id)
        .single();

      if (!tok?.access_token || !conn?.account_id) {
        throw new Error("missing_token_or_connection");
      }

      const result = await publishToInstagram(
        conn.account_id, tok.access_token,
        post.media_urls ?? [], post.caption ?? "", post.post_type ?? "image",
      );
      if (result.error) throw new Error(JSON.stringify(result.error));

      await admin.from("scheduled_posts").update({
        status: "published",
        published_at: new Date().toISOString(),
        external_post_id: result.id,
      }).eq("id", post.id);
      published++;
    } catch (err) {
      await admin.from("scheduled_posts").update({
        status: "failed",
        error_message: (err as Error).message,
      }).eq("id", post.id);
      failed++;
    }
  }

  return json({ processed: due.length, published, failed });
});

async function publishToInstagram(
  igUserId: string,
  token: string,
  mediaUrls: string[],
  caption: string,
  postType: string,
): Promise<{ id?: string; error?: unknown }> {
  if (!mediaUrls.length) return { error: "no_media" };
  const base = `${GRAPH}/${igUserId}`;
  let creationId: string;

  if (postType === "carousel" && mediaUrls.length > 1) {
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
    const params = new URLSearchParams({
      access_token: token, media_type: "CAROUSEL", children: childIds.join(","), caption,
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

  for (let i = 0; i < 20; i++) {
    const sr = await fetch(`${base}/${creationId}?fields=status_code&access_token=${token}`);
    const sj = await sr.json();
    if (sj.status_code === "FINISHED") break;
    if (sj.status_code === "ERROR") return { error: "container_processing_error" };
    await new Promise((res) => setTimeout(res, 3000));
  }

  const pubParams = new URLSearchParams({ access_token: token, creation_id: creationId });
  const pr = await fetch(`${base}/media_publish`, { method: "POST", body: pubParams });
  const pj = await pr.json();
  if (pj.error || !pj.id) return { error: pj.error ?? "publish_failed" };
  return { id: pj.id };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
}
