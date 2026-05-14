// Edge function: instagram-oauth
// OAuth callback for "Instagram API with Instagram Login".
// Instagram redirects the user here with ?code=...&state=<supabase_jwt>.
// We exchange the code for a long-lived token and store the connection.
//
// Deployed with verify_jwt = false — Instagram calls this, not an authed user.
// The `state` param carries the Veyra user's Supabase JWT for identification.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const IG_APP_ID = "1271135391865752";
const REDIRECT_URI = "https://uqyprtitkuqkdrrzckbc.supabase.co/functions/v1/instagram-oauth";
const APP_URL = "https://veyrastudio.fr";

const SCOPES =
  "instagram_business_basic,instagram_business_content_publish," +
  "instagram_business_manage_comments,instagram_business_manage_messages," +
  "instagram_business_manage_insights";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // User declined the authorization, or Instagram returned an error
  if (oauthError || !code) {
    return redirect(`${APP_URL}/?connected=error&reason=${oauthError ?? "no_code"}`);
  }

  try {
    const appSecret   = Deno.env.get("INSTAGRAM_APP_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    if (!appSecret) throw new Error("missing_INSTAGRAM_APP_SECRET");
    if (!state)     throw new Error("missing_state");

    // 1. Identify the Veyra user from the state JWT
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${state}` } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) throw new Error("invalid_state_jwt");
    const veyraUserId = userData.user.id;

    // 2. Exchange the code for a short-lived token
    const form = new FormData();
    form.append("client_id", IG_APP_ID);
    form.append("client_secret", appSecret);
    form.append("grant_type", "authorization_code");
    form.append("redirect_uri", REDIRECT_URI);
    form.append("code", code);

    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: form,
    });
    const shortData = await shortRes.json();
    if (!shortData.access_token) {
      throw new Error("short_token_failed: " + JSON.stringify(shortData));
    }
    const shortToken = shortData.access_token as string;
    const igUserId = String(shortData.user_id ?? shortData.permissions ?? "");

    // 3. Exchange the short-lived token for a long-lived one (~60 days)
    const longRes = await fetch(
      "https://graph.instagram.com/access_token" +
      `?grant_type=ig_exchange_token&client_secret=${appSecret}` +
      `&access_token=${shortToken}`
    );
    const longData = await longRes.json();
    const longToken = (longData.access_token as string) ?? shortToken;
    const expiresIn = (longData.expires_in as number) ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 4. Fetch the connected Instagram account profile
    const meRes = await fetch(
      "https://graph.instagram.com/me" +
      `?fields=user_id,username,name,profile_picture_url&access_token=${longToken}`
    );
    const me = await meRes.json();
    const accountId = String(me.user_id ?? igUserId);

    // 5. Persist the connection (service role bypasses RLS)
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: conn, error: connErr } = await admin
      .from("social_connections")
      .upsert({
        user_id: veyraUserId,
        platform: "instagram",
        account_id: accountId,
        account_username: me.username ?? null,
        account_name: me.name ?? null,
        account_avatar_url: me.profile_picture_url ?? null,
        scopes: SCOPES,
        status: "active",
        token_expires_at: expiresAt,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "user_id,platform,account_id" })
      .select()
      .single();
    if (connErr) throw new Error("db_connection_failed: " + connErr.message);

    // 6. Store the token in the service-role-only table
    const { error: tokErr } = await admin
      .from("social_tokens")
      .upsert({
        connection_id: conn.id,
        access_token: longToken,
        updated_at: new Date().toISOString(),
      });
    if (tokErr) throw new Error("db_token_failed: " + tokErr.message);

    return redirect(`${APP_URL}/?connected=instagram`);
  } catch (err) {
    console.error("instagram-oauth error:", err);
    return redirect(`${APP_URL}/?connected=error`);
  }
});

function redirect(to: string): Response {
  return new Response(null, { status: 302, headers: { Location: to } });
}
