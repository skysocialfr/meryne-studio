// Edge function: trial-reminders
// Cron worker that sends a "ton essai se termine bientôt" email to users
// whose trial_end is 2 days away. Dedupes on profiles.trial_reminder_sent_at.
// Auth: Vault cron_secret (same pattern as process-scheduled-posts).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API = "https://api.resend.com/emails";
const FROM = Deno.env.get("EMAIL_FROM") || "Veyra Studio <onboarding@resend.dev>";

Deno.serve(async (req: Request) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  const candidate = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/, "");
  const { data: ok } = await admin.rpc("verify_cron_secret", { candidate });
  if (!ok) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return json({ skipped: "email_not_configured" });

  // Users whose trial ends in 1-2 days, still trialing, and not yet reminded
  const now = Date.now();
  const in1Day = new Date(now + 1 * 86400_000).toISOString();
  const in3Days = new Date(now + 3 * 86400_000).toISOString();

  const { data: due } = await admin
    .from("profiles")
    .select("id, email, display_name, trial_end")
    .eq("subscription_status", "trialing")
    .gte("trial_end", in1Day)
    .lte("trial_end", in3Days)
    .is("trial_reminder_sent_at", null)
    .limit(50);

  if (!due || !due.length) return json({ processed: 0 });

  let sent = 0, failed = 0;
  for (const p of due) {
    if (!p.email) continue;
    const name = (p.display_name || p.email.split("@")[0]).trim();
    const trialEnd = p.trial_end ? new Date(p.trial_end) : null;
    const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now) / 86400_000)) : 2;

    try {
      const r = await fetch(RESEND_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: p.email,
          subject: `⏰ Plus que ${daysLeft} jour${daysLeft > 1 ? "s" : ""} d'essai sur Veyra`,
          html: trialReminderHtml(name, daysLeft),
        }),
      });
      if (!r.ok) { failed++; continue; }
      await admin
        .from("profiles")
        .update({ trial_reminder_sent_at: new Date().toISOString() })
        .eq("id", p.id);
      sent++;
    } catch (_e) { failed++; }
  }

  return json({ processed: due.length, sent, failed });
});

function trialReminderHtml(name: string, daysLeft: number): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F4F4F6;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#F4F4F6;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px -10px rgba(16,16,40,.15);">
  <tr><td style="background:linear-gradient(120deg,#F59E0B 0%,#FF2D7A 100%);padding:36px 36px;text-align:center;color:#fff;">
    <div style="font-size:48px;line-height:1;">⏰</div>
    <div style="font-family:Georgia,serif;font-size:24px;font-weight:700;margin-top:10px;">${daysLeft > 1 ? `Plus que ${daysLeft} jours` : "Dernier jour"} d'essai</div>
  </td></tr>
  <tr><td style="padding:32px 36px 12px;color:#111;">
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 14px;">Salut ${escapeHtml(name)},</p>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 14px;">Ton essai gratuit Veyra Studio se termine dans <strong style="color:#FF2D7A;">${daysLeft} jour${daysLeft > 1 ? "s" : ""}</strong>. Au-delà, ton abonnement (9,99 € à 59,99 €/mois selon ton pack) prendra automatiquement le relais.</p>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 22px;">Si Veyra t'aide à publier plus régulièrement et à suivre tes stats, tu n'as <strong>rien à faire</strong> — tout continue comme aujourd'hui. Sinon, tu peux annuler en 1 clic depuis ton espace facturation.</p>
    <table cellspacing="0" cellpadding="0"><tr><td style="border-radius:99px;background:linear-gradient(120deg,#FF2D7A,#7C3AED);">
      <a href="https://veyrastudio.fr/" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:800;color:#fff;text-decoration:none;border-radius:99px;">Ouvrir Veyra Studio</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:24px 36px 36px;color:#9CA3AF;font-size:12px;line-height:1.6;border-top:1px solid #F3F4F6;">
    Une question avant la fin de l'essai ? Réponds simplement à ce mail.<br>
    <strong style="color:#FF2D7A;">Veyra Studio</strong> · veyrastudio.fr
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c] as string));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
}
