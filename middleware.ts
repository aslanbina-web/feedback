import { NextRequest, NextResponse } from "next/server";
import { config as appConfig } from "@/lib/config";

// iOS Universal Links (which let Safari offer to open the LINE app) generally
// do not fire through a server-side redirect. The old flow was: tap link on
// our domain -> our server 302s to access.line.me -> LINE decides app vs web.
// That intermediate hop through our own origin breaks the Universal Link, so
// Safari fell back to LINE's plain web login every time. Middleware runs
// before the page renders, so it can prepare the state/nonce + set the
// matching cookies ahead of time, letting the login button link straight at
// LINE itself -- a single direct, user-initiated navigation.

const COOKIE_PREFIX = process.env.NODE_ENV === "production" ? "__Host-" : "";

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function middleware(request: NextRequest) {
  const state = randomHex(24);
  const nonce = randomHex(24);

  let lineAuthUrl = "";
  if (process.env.LINE_LOGIN_CHANNEL_ID) {
    const url = new URL("https://access.line.me/oauth2/v2.1/authorize");
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: appConfig.lineChannelId,
      redirect_uri: appConfig.appUrl + "/api/auth/line/callback",
      state,
      scope: "openid profile",
      nonce,
    }).toString();
    lineAuthUrl = url.toString();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-line-auth-url", lineAuthUrl);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  response.cookies.set(COOKIE_PREFIX + "line_oauth_state", state, cookieOptions);
  response.cookies.set(COOKIE_PREFIX + "line_oauth_nonce", nonce, cookieOptions);
  return response;
}

export const config = {
  matcher: "/",
};
