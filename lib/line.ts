import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "@/lib/config";

const lineJwks = createRemoteJWKSet(new URL("https://api.line.me/oauth2/v2.1/certs"));

export type LineIdentity = {
  sub: string;
  name: string;
  picture?: string;
};

export async function exchangeLineCode(code: string, redirectUri: string) {
  const response = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.lineChannelId,
      client_secret: config.lineChannelSecret,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("LINE token exchange failed");
  return (await response.json()) as { access_token: string; id_token: string };
}

export async function verifyLineIdentity(idToken: string, nonce: string): Promise<LineIdentity> {
  const { payload } = await jwtVerify(idToken, lineJwks, {
    issuer: "https://access.line.me",
    audience: config.lineChannelId,
  });
  if (payload.nonce !== nonce || typeof payload.sub !== "string" || typeof payload.name !== "string") {
    throw new Error("Invalid LINE identity");
  }
  return {
    sub: payload.sub,
    name: payload.name,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

export async function isOfficialAccountFriend(accessToken: string) {
  const response = await fetch("https://api.line.me/friendship/v1/status", {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return false;
  const body = (await response.json()) as { friendFlag?: boolean };
  return body.friendFlag === true;
}
