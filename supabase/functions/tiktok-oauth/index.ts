// Edge function: tiktok-oauth
// OAuth callback for TikTok — exchanges the auth code for an access
// token, fetches the user identity, and stores the connection + token.
//
// verify_jwt = false — called by TikTok's redirect, we authenticate
// via the JWT carried in `state`.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const REDIRECT_URI = "https://uqyprtitkuqkdrrzckbc.supabase.co/functions/v1/tiktok-oauth";
const APP_RETURN = "https://veyrastudio.fr";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description") || "";

  if (err) return redirect(`${APP_RETURN}/?connected=error&detail=${encodeURIComponent(err + ': ' + errDesc)}`);
  if (!code) return redirect(`${APP_RETURN}/?connected=error&detail=missing_code`);

  const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
  const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET");
  if (!clientKey || !clientSecret) {
    return redirect(`${APP_RETURN}/?connected=error&detail=tiktok_not_configured`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      return redirect(`${APP_RETURN}/?connected=error&detail=${encodeURIComponent('token_failed: ' + JSON.stringify(tokenJson))}`);
    }
    const accessToken: string = tokenJson.access_token;
    const refreshToken: string | null = tokenJson.refresh_token ?? null;
    const expiresIn: number = tokenJson.expires_in ?? 0;
    const openId: string = tokenJson.open_id;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // 2. Fetch user identity
    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const userJson = await userRes.json();
    if (!userRes.ok || !userJson.data?.user) {
      return redirect(`${APP_RETURN}/?connected=error&detail=${encodeURIComponent('user_failed: ' + JSON.stringify(userJson))}`);
    }
    const u = userJson.data.user;

    // 3. Identify the Veyra user + target workspace via the `state` value.
    // Modern clients pack base64(JSON({jwt,ws})); legacy clients send the
    // bare JWT — decodeState handles both.
    const { jwt, workspaceId: statedWs } = decodeState(state);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return redirect(`${APP_RETURN}/?connected=error&detail=session_expired`);
    }
    const userId = userData.user.id;

    // Resolve target workspace (stated by client, else user's personal).
    const targetWorkspaceId = await resolveWorkspace(admin, userId, statedWs);

    // 4. Upsert connection
    const accountId = openId;
    const accountName = u.display_name || u.username || openId;
    const username = u.username || u.display_name || openId;
    const avatar = u.avatar_url || null;

    const { data: existing } = await admin
      .from("social_connections")
      .select("id")
      .eq("workspace_id", targetWorkspaceId)
      .eq("platform", "tiktok")
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
        workspace_id: targetWorkspaceId,
        platform: "tiktok",
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

    // 5. Store the token
    await admin.from("social_tokens")
      .upsert({
        connection_id: connectionId,
        access_token: accessToken,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      }, { onConflict: "connection_id" });

    return redirect(`${APP_RETURN}/?connected=tiktok`);
  } catch (e) {
    return redirect(`${APP_RETURN}/?connected=error&detail=${encodeURIComponent('internal: ' + (e as Error).message)}`);
  }
});

function redirect(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url } });
}

function decodeState(state: string): { jwt: string; workspaceId: string | null } {
  try {
    const decoded = atob(state);
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.jwt === "string" && parsed.jwt.length > 20) {
      return { jwt: parsed.jwt, workspaceId: parsed.ws ?? null };
    }
  } catch { /* fallthrough */ }
  return { jwt: state, workspaceId: null };
}

// deno-lint-ignore no-explicit-any
async function resolveWorkspace(admin: any, userId: string, statedWs: string | null): Promise<string | null> {
  if (statedWs) {
    const { data } = await admin
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", statedWs)
      .eq("user_id", userId)
      .maybeSingle();
    if (data) return statedWs;
  }
  const { data: personal } = await admin
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_personal", true)
    .maybeSingle();
  return personal?.id ?? null;
}
