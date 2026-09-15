import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { error } = await getSupabaseAdmin()
    .from("users")
    .update({ onboarding_tutorial_seen_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return NextResponse.json({ error: "Could not continue." }, { status: 500 });
  return NextResponse.json({ ok: true, redirectTo: "/profile/edit?setup=1" });
}
