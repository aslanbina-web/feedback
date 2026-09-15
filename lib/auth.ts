import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { config } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { AppUser } from "@/lib/types";

const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-giveget_session" : "giveget_session";

function secret() {
  return new TextEncoder().encode(config.sessionSecret);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function getSessionUserId() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token || !process.env.SESSION_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export const getUserById = cache(async (userId: string): Promise<AppUser | null> => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { data } = await getSupabaseAdmin()
    .from("users")
    .select("id,display_name,avatar_url,role,credit_balance,daily_give_limit,daily_receive_limit,plan_expires_at,plan_started_at,plan_give_limit,plan_receive_limit,onboarding_tutorial_seen_at,onboarding_completed_at,referral_code")
    .eq("id", userId)
    .maybeSingle();
  return (data as AppUser | null) ?? null;
});

export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const userId = await getSessionUserId();
  return userId ? getUserById(userId) : null;
});

export async function requireUserId() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  return userId;
}

export async function requireUser(userId?: string) {
  const user = userId ? await getUserById(userId) : await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
