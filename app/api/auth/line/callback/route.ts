import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { exchangeLineCode, verifyLineAccessToken, verifyLineIdentity } from "@/lib/line";
import { completeLineLogin } from "@/lib/line-session";

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
  const expectedState = store.get(stateCookie)?.value;
  const nonce = store.get(nonceCookie)?.value;
  store.delete(stateCookie);
  store.delete(nonceCookie);
  if (!state || !nonce || state !== expectedState) return loginError("invalid_state");
  if (oauthError) return loginError("line_cancelled");
  if (!code) return loginError("line_login_failed");

  try {
    const tokens = await exchangeLineCode(code, `${config.appUrl}/api/auth/line/callback`);
    const [identity] = await Promise.all([
      verifyLineIdentity(tokens.id_token, nonce),
      verifyLineAccessToken(tokens.access_token),
    ]);
    await completeLineLogin(identity, tokens.access_token);
    return NextResponse.redirect(`${config.appUrl}/discover`);
  } catch (error) {
    if (error instanceof Error && error.message === "official_account_required") {
      return loginError("official_account_required");
    }
    console.error("LINE callback failed:", error instanceof Error ? error.message : "Unknown error");
    return loginError("line_login_failed");
  }
}
