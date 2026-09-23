// ═══════════════════════════════════════════════════════════════
// vs-notify — appelée chaque minute par pg_cron.
// Envoie une notification push "C'est l'heure de poster" pour chaque post
// dont l'heure (moins le délai de rappel choisi) est arrivée.
// Secrets requis : CRON_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// ═══════════════════════════════════════════════════════════════
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const PLATFORM = { instagram: "Instagram", tiktok: "TikTok" } as Record<string, string>;
const FORMAT: Record<string, string> = {
  post: "post", carousel: "carrousel", reel: "reel", story: "story",
  video: "vidéo", photos: "carrousel photo",
};

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@veyrastudio.fr",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Fenêtre large (60 min d'avance max) puis filtre fin avec le délai de chaque profil.
  const now = Date.now();
  const { data: posts, error } = await db
    .from("vs_posts")
    .select("id, user_id, platform, format, title, scheduled_at")
    .is("notified_at", null)
    .neq("status", "published")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", new Date(now + 60 * 60_000).toISOString())
    .gte("scheduled_at", new Date(now - 6 * 60 * 60_000).toISOString());
  if (error) return new Response(error.message, { status: 500 });
  if (!posts?.length) return Response.json({ sent: 0 });

  const userIds = [...new Set(posts.map((p) => p.user_id))];
  const [{ data: profiles }, { data: subs }] = await Promise.all([
    db.from("vs_profiles").select("user_id, reminder_minutes").in("user_id", userIds),
    db.from("vs_push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds),
  ]);
  const reminder = new Map((profiles ?? []).map((p) => [p.user_id, p.reminder_minutes ?? 0]));

  let sent = 0;
  for (const p of posts) {
    const lead = (reminder.get(p.user_id) ?? 0) * 60_000;
    const at = new Date(p.scheduled_at).getTime();
    if (at - lead > now) continue;

    const minutesLeft = Math.round((at - now) / 60_000);
    const what = `${FORMAT[p.format] ?? "post"} ${PLATFORM[p.platform] ?? ""}`.trim();
    const payload = JSON.stringify({
      title: minutesLeft > 1 ? `Dans ${minutesLeft} min : ${what}` : `C'est l'heure de poster ✨`,
      body: p.title ? `${p.title} — ton ${what} est prêt. Touche pour poster.` : `Ton ${what} est prêt. Touche pour poster.`,
      url: `/?poster=${p.id}`,
      tag: `post-${p.id}`,
    });

    for (const s of (subs ?? []).filter((s) => s.user_id === p.user_id)) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // Abonnement expiré (appareil désinstallé, notifs coupées) : on le retire.
        if (code === 404 || code === 410) await db.from("vs_push_subscriptions").delete().eq("id", s.id);
      }
    }
    await db.from("vs_posts").update({ notified_at: new Date().toISOString() }).eq("id", p.id);
  }

  return Response.json({ sent });
});
