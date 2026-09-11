import "server-only";
import { config } from "@/lib/config";

const LINE_TIMEOUT_MS = 10_000;

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
    signal: AbortSignal.timeout(LINE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("LINE token exchange failed");
  const body = (await response.json()) as { access_token?: string; id_token?: string };
  if (!body.access_token || !body.id_token) throw new Error("LINE token response was incomplete");
  return { access_token: body.access_token, id_token: body.id_token };
}

export async function verifyLineIdentity(idToken: string, nonce: string): Promise<LineIdentity> {
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: config.lineChannelId, nonce }),
    cache: "no-store",
    signal: AbortSignal.timeout(LINE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("LINE ID token verification failed");
  const payload = (await response.json()) as {
    iss?: string;
    aud?: string;
    sub?: string;
    nonce?: string;
    name?: string;
    picture?: string;
  };
  if (
    payload.iss !== "https://access.line.me" ||
    payload.aud !== config.lineChannelId ||
    payload.nonce !== nonce ||
    typeof payload.sub !== "string" ||
    typeof payload.name !== "string"
  ) {
    throw new Error("Invalid LINE identity");
  }
  return {
    sub: payload.sub,
    name: payload.name,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

export async function verifyLineAccessToken(accessToken: string) {
  const url = new URL("https://api.line.me/oauth2/v2.1/verify");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(LINE_TIMEOUT_MS) });
  if (!response.ok) throw new Error("LINE access token verification failed");
  const body = (await response.json()) as { client_id?: string; expires_in?: number; scope?: string };
  const scopes = new Set(body.scope?.split(" ") ?? []);
  if (body.client_id !== config.lineChannelId || !body.expires_in || body.expires_in <= 0 || !scopes.has("openid") || !scopes.has("profile")) {
    throw new Error("Invalid LINE access token");
  }
}

export async function isOfficialAccountFriend(accessToken: string) {
  const response = await fetch("https://api.line.me/friendship/v1/status", {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(LINE_TIMEOUT_MS),
  });
  if (!response.ok) return false;
  const body = (await response.json()) as { friendFlag?: boolean };
  return body.friendFlag === true;
}
