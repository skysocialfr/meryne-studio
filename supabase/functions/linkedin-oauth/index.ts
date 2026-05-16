// Edge function: linkedin-oauth
// OAuth callback for LinkedIn — exchanges the auth code for an access
// token, fetches the user's identity via the OIDC userinfo endpoint,
// and stores the connection + token. Mirrors instagram-oauth.
//
// verify_jwt = false — called by LinkedIn's redirect, we authenticate
// via the JWT carried in `state`.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const REDIRECT_URI = "https://uqyprtitkuqkdrrzckbc.supabase.co/functions/v1/linkedin-oauth";
const APP_RETURN = "https://veyrastudio.fr";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description") || "";

  if (err) return redirect(`${APP_RETURN}/?connected=error&detail=${encodeURIComponent(err + ': ' + errDesc)}`);
  if (!code) return redirect(`${APP_RETURN}/?connected=error&detail=missing_code`);

  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return redirect(`${APP_RETURN}/?connected=error&detail=linkedin_not_configured`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      return redirect(`${APP_RETURN}/?connected=error&detail=${encodeURIComponent('token_failed: ' + JSON.stringify(tokenJson))}`);
    }
    const accessToken: string = tokenJson.access_token;
    const expiresIn: number = tokenJson.expires_in ?? 0;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // 2. Fetch user identity (OIDC userinfo)
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.sub) {
      return redirect(`${APP_RETURN}/?connected=error&detail=${encodeURIComponent('profile_failed: ' + JSON.stringify(profile))}`);
    }
    // profile = { sub, name, given_name, family_name, picture, locale, email, email_verified }

    // 3. Identify the user via the `state` JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${state}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return redirect(`${APP_RETURN}/?connected=error&detail=session_expired`);
    }
    const userId = userData.user.id;

    // 4. Upsert connection
    const accountId = profile.sub;
    const accountName = profile.name || `${profile.given_name ?? ""} ${profile.family_name ?? ""}`.trim();
    const avatar = profile.picture || null;
    const username = profile.email || accountId;

    const { data: existing } = await admin
      .from("social_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("platform", "linkedin")
      .eq("account_id", accountId)
      .maybeSingle();

    let connectionId: string;
    if (existing?.id) {
      connectionId = existing.id;
      await admin.from("social_connections").update({
        account_username: username,
        account_name: accountName,
        account_avatar_url: avatar,
        status: "active",
        token_expires_at: tokenExpiresAt,
        last_synced_at: new Date().toISOString(),
      }).eq("id", connectionId);
    } else {
      const ins = await admin.from("social_connections").insert({
        user_id: userId,
        platform: "linkedin",
        account_id: accountId,
        account_username: username,
        account_name: accountName,
        account_avatar_url: avatar,
        status: "active",
        token_expires_at: tokenExpiresAt,
        connected_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      }).select("id").single();
      if (ins.error || !ins.data) {
        return redirect(`${APP_RETURN}/?connected=error&detail=${encodeURIComponent('insert_failed: ' + (ins.error?.message || 'unknown'))}`);
      }
      connectionId = ins.data.id;
    }

    // 5. Store / refresh the token (service-role only table)
    await admin.from("social_tokens")
      .upsert({
        connection_id: connectionId,
        access_token: accessToken,
        refresh_token: tokenJson.refresh_token ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "connection_id" });

    return redirect(`${APP_RETURN}/?connected=linkedin`);
  } catch (e) {
    return redirect(`${APP_RETURN}/?connected=error&detail=${encodeURIComponent('internal: ' + (e as Error).message)}`);
  }
});

function redirect(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url } });
}
