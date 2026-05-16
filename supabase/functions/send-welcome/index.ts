// Edge function: send-welcome
// Sends the welcome email to a newly-signed-up user. Called by the client
// right after signup. Dedupes on profiles.welcome_email_sent_at.
// verify_jwt = true — runs as the user; targets that user's own profile.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API = "https://api.resend.com/emails";
const FROM = Deno.env.get("EMAIL_FROM") || "Veyra Studio <onboarding@resend.dev>";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return json({ skipped: "email_not_configured" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin
      .from("profiles")
      .select("email, display_name, welcome_email_sent_at")
      .eq("id", userData.user.id)
      .single();
    if (!profile?.email) return json({ error: "no_email" }, 404);
    if (profile.welcome_email_sent_at) return json({ skipped: "already_sent" });

    const name = (profile.display_name || profile.email.split("@")[0]).trim();
    const r = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: profile.email,
        subject: "🎉 Bienvenue sur Veyra Studio",
        html: welcomeEmailHtml(name),
      }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: "resend_failed", detail: j }, 502);

    await admin
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", userData.user.id);

    return json({ sent: true });
  } catch (err) {
    console.error("send-welcome error:", err);
    return json({ error: "internal", detail: (err as Error).message }, 500);
  }
});

function welcomeEmailHtml(name: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F4F4F6;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#F4F4F6;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px -10px rgba(16,16,40,.15);">
  <tr><td style="background:linear-gradient(120deg,#FF2D7A 0%,#7C3AED 100%);padding:40px 36px;text-align:center;color:#fff;">
    <div style="font-family:Georgia,serif;font-size:30px;font-weight:700;letter-spacing:-.4px;">Veyra Studio</div>
    <div style="font-size:13px;opacity:.85;margin-top:4px;">Le studio de contenu pour créateurs ambitieux</div>
  </td></tr>
  <tr><td style="padding:36px 36px 12px;color:#111;">
    <h1 style="font-size:22px;font-weight:800;margin:0 0 14px;letter-spacing:-.3px;">Salut ${escapeHtml(name)} 👋</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 12px;">Bienvenue dans Veyra Studio. Tu as <strong style="color:#FF2D7A;">7 jours gratuits</strong> pour découvrir tous les outils : feed Instagram réel, planning, IA pour scripts et captions, stats, et bibliothèque média.</p>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 22px;">Pour commencer en 60 secondes :</p>
    <ul style="font-size:14px;line-height:1.85;color:#374151;padding-left:18px;margin:0 0 24px;">
      <li><strong>Connecte ton Instagram</strong> depuis le Feed pour voir tes vraies stats</li>
      <li><strong>Crée ton premier post</strong> avec l'IA — l'IA écrit la légende + les hashtags</li>
      <li><strong>Mets ton lien Linkin.bio</strong> dans ta bio Instagram (Settings ⚙️)</li>
    </ul>
    <table cellspacing="0" cellpadding="0"><tr><td style="border-radius:99px;background:linear-gradient(120deg,#FF2D7A,#7C3AED);">
      <a href="https://veyrastudio.fr/" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:800;color:#fff;text-decoration:none;border-radius:99px;">Ouvrir Veyra Studio →</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:24px 36px 36px;color:#9CA3AF;font-size:12px;line-height:1.6;border-top:1px solid #F3F4F6;">
    Une question ? Réponds simplement à ce mail.<br>
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
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
