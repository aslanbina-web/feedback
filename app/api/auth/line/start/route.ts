import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

const COOKIE_PREFIX = process.env.NODE_ENV === "production" ? "__Host-" : "";

export async function GET(request: NextRequest) {
  if (
    !process.env.LINE_LOGIN_CHANNEL_ID ||
    !process.env.LINE_LOGIN_CHANNEL_SECRET ||
    (process.env.NODE_ENV === "production" &&
      !process.env.NEXT_PUBLIC_APP_URL &&
      !(process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL))
  ) {
    return NextResponse.redirect(new URL("/?login_error=configuration", request.url));
  }
  if (request.nextUrl.origin !== config.appUrl) {
    const response = NextResponse.redirect(config.appUrl + "/api/auth/line/start");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  const state = randomBytes(24).toString("hex");
  const nonce = randomBytes(24).toString("hex");
  const redirectUri = config.appUrl + "/api/auth/line/callback";
  const url = new URL("https://access.line.me/oauth2/v2.1/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.lineChannelId,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile",
    nonce,
  }).toString();

  const response = NextResponse.redirect(url);
  const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  response.cookies.set(COOKIE_PREFIX + "line_oauth_state", state, cookieOptions);
  response.cookies.set(COOKIE_PREFIX + "line_oauth_nonce", nonce, cookieOptions);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
