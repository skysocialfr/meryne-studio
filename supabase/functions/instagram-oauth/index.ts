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
  let   code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError || !code) {
    return fail(oauthError ?? "no_code");
  }

  // Instagram sometimes appends "#_" to the code — strip it defensively
  code = code.replace(/#_$/, "");

  try {
    const appSecret   = Deno.env.get("INSTAGRAM_APP_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    if (!appSecret) throw new Error("missing_app_secret");
    if (!state)     throw new Error("missing_state");

    // 1. Identify the Veyra user + target workspace from the state param.
    // State was either the raw JWT (legacy) or a base64-encoded JSON
    // {jwt, ws} — the workspaced client packs both so the callback knows
    // which space the account should attach to.
    const { jwt, workspaceId: statedWorkspaceId } = decodeState(state);

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) throw new Error("invalid_state_jwt:" + (userErr?.message ?? "no_user"));
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
    const shortRaw = await shortRes.text();
    let shortData: Record<string, unknown>;
    try { shortData = JSON.parse(shortRaw); }
    catch { throw new Error("short_token_not_json:" + shortRaw.slice(0, 160)); }

    // The response may be flat {access_token,user_id} or wrapped {data:[{...}]}
    const tokenObj = (Array.isArray((shortData as { data?: unknown[] }).data)
      ? (shortData as { data: Record<string, unknown>[] }).data[0]
      : shortData) ?? {};

    const shortToken = tokenObj.access_token as string | undefined;
    if (!shortToken) {
      throw new Error("short_token_failed:" + JSON.stringify(shortData).slice(0, 200));
    }
    const igUserId = String(tokenObj.user_id ?? "");

    // 3. Exchange the short-lived token for a long-lived one (~60 days)
    const longRes = await fetch(
      "https://graph.instagram.com/access_token" +
      `?grant_type=ig_exchange_token&client_secret=${appSecret}` +
      `&access_token=${shortToken}`
    );
    const longData = await longRes.json().catch(() => ({}));
    const longToken = (longData.access_token as string) ?? shortToken;
    const expiresIn = (longData.expires_in as number) ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 4. Fetch the connected Instagram account profile
    const meRes = await fetch(
      "https://graph.instagram.com/me" +
      `?fields=user_id,username,name,profile_picture_url&access_token=${longToken}`
    );
    const me = await meRes.json().catch(() => ({}));
    const accountId = String(me.user_id ?? igUserId ?? "");
    if (!accountId) {
      throw new Error("no_account_id:" + JSON.stringify(me).slice(0, 200));
    }

    // 5. Persist the connection (service role bypasses RLS)
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve target workspace: prefer the one the client stated, else fall
    // back to the user's personal workspace so legacy links keep working.
    const targetWorkspaceId = await resolveWorkspace(admin, veyraUserId, statedWorkspaceId);

    const { data: conn, error: connErr } = await admin
      .from("social_connections")
      .upsert({
        user_id: veyraUserId,
        workspace_id: targetWorkspaceId,
        platform: "instagram",
        account_id: accountId,
        account_username: me.username ?? null,
        account_name: me.name ?? null,
        account_avatar_url: me.profile_picture_url ?? null,
        scopes: SCOPES,
        status: "active",
        token_expires_at: expiresAt,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "workspace_id,platform,account_id" })
      .select()
      .single();
    if (connErr) throw new Error("db_connection_failed:" + connErr.message);

    // 6. Store the token in the service-role-only table
    const { error: tokErr } = await admin
      .from("social_tokens")
      .upsert({
        connection_id: conn.id,
        access_token: longToken,
        updated_at: new Date().toISOString(),
      });
    if (tokErr) throw new Error("db_token_failed:" + tokErr.message);

    return redirect(`${APP_URL}/?connected=instagram`);
  } catch (err) {
    const msg = (err as Error)?.message ?? "unknown";
    console.error("instagram-oauth error:", msg);
    return fail(msg);
  }
});

function fail(detail: string): Response {
  return redirect(`${APP_URL}/?connected=error&detail=${encodeURIComponent(detail.slice(0, 200))}`);
}

function redirect(to: string): Response {
  return new Response(null, { status: 302, headers: { Location: to } });
}

// Decode a state string into { jwt, workspaceId }.
// Modern clients send base64(JSON({jwt,ws})). Legacy clients send the raw JWT.
// Fallback to the whole string as the JWT so old flows keep working.
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

// Resolve the target workspace for a new connection.
// - If the client stated a workspace and the user is a member, use it.
// - Otherwise fall back to the user's personal workspace.
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
