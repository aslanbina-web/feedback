import { NextRequest, NextResponse } from "next/server";
import { apiUser, cleanText, jsonError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const admin = await apiUser();
  if (!admin) return jsonError("Sign in required.", 401);
  if (admin.role !== "admin") return jsonError("Admin access required.", 403);
  const body = (await request.json().catch(() => null)) as { userId?: unknown; delta?: unknown; note?: unknown } | null;
  const userId = cleanText(body?.userId, 36);
  const delta = typeof body?.delta === "number" ? Math.trunc(body.delta) : 0;
  const note = cleanText(body?.note, 160);
  if (!userId || !note || !delta || Math.abs(delta) > 100) return jsonError("A valid user, change and reason are required.");
  const { error } = await getSupabaseAdmin().rpc("admin_adjust_credit", { p_admin_id: admin.id, p_user_id: userId, p_delta: delta, p_note: note });
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}
