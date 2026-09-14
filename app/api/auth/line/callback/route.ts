import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { exchangeLineCode, isOfficialAccountFriend, verifyLineAccessToken, verifyLineIdentity } from "@/lib/line";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const COOKIE_PREFIX = process.env.NODE_ENV === "production" ? "__Host-" : "";

function loginError(code: string) {
  return NextResponse.redirect(`${config.appUrl}/?login_error=${encodeURIComponent(code)}`);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const store = await cookies();
  const stateCookie = `${COOKIE_PREFIX}line_oauth_state`;
  const nonceCookie = `${COOKIE_PREFIX}line_oauth_nonce`;
  const referralCookie = `${COOKIE_PREFIX}giveget_referral`;
  const expectedState = store.get(stateCookie)?.value;
  const nonce = store.get(nonceCookie)?.value;
  const referralCode = store.get(referralCookie)?.value;
  store.delete(stateCookie);
  store.delete(nonceCookie);
  store.delete(referralCookie);
  if (!state || !nonce || state !== expectedState) return loginError("invalid_state");
  if (oauthError) return loginError("line_cancelled");
  if (!code) return loginError("line_login_failed");

  try {
    const tokens = await exchangeLineCode(code, `${config.appUrl}/api/auth/line/callback`);
    const [identity] = await Promise.all([
      verifyLineIdentity(tokens.id_token, nonce),
      verifyLineAccessToken(tokens.access_token),
    ]);
    const supabase = getSupabaseAdmin();
    const { data: existing, error: lookupError } = await supabase.from("users").select("id").eq("line_user_id", identity.sub).maybeSingle();
    if (lookupError) throw lookupError;

    if (!existing?.id) {
      if (config.requiresOfficialAccountFriend && !(await isOfficialAccountFriend(tokens.access_token))) {
        return loginError("official_account_required");
      }
    }

    const { data: user, error: upsertError } = await supabase
      .from("users")
      .upsert(
        { line_user_id: identity.sub, display_name: identity.name, avatar_url: identity.picture ?? null },
        { onConflict: "line_user_id" },
      )
      .select("id")
      .single();
    if (upsertError) throw upsertError;

    if (!existing?.id && referralCode) {
      const { error: referralError } = await supabase.rpc("claim_referral" as never, {
        p_invitee_id: user.id,
        p_referral_code: referralCode,
      } as never);
      if (referralError) console.error("Referral claim failed:", referralError.message);
    }

    await createSession(user.id);
    return NextResponse.redirect(`${config.appUrl}/discover`);
  } catch (error) {
    console.error("LINE callback failed:", error instanceof Error ? error.message : "Unknown error");
    return loginError("line_login_failed");
  }
}
