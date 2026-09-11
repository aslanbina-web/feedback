import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function apiUser() {
  const user = await getCurrentUser();
  return user;
}

export function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function validHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function validGoogleReviewUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const isGoogleHost = host === "google.com" || host.endsWith(".google.com");
    const isGoogleMapsPath = url.pathname === "/maps" || url.pathname.startsWith("/maps/");
    const isMapsShortLink = host === "maps.app.goo.gl" && url.pathname.length > 1;
    const isLegacyShortLink = host === "goo.gl" && isGoogleMapsPath;
    if ((!isGoogleHost || !isGoogleMapsPath) && !isMapsShortLink && !isLegacyShortLink) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || ["entry", "g_ep", "g_st", "share"].includes(key)) url.searchParams.delete(key);
    }
    url.hostname = host;
    return url.toString();
  } catch {
    return null;
  }
}
