import { NextRequest, NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return jsonError("Sign in required.", 401);
  if (user.role !== "admin") return jsonError("Admin access required.", 403);
  const body = (await request.json().catch(() => null)) as { approve?: boolean } | null;
  if (typeof body?.approve !== "boolean") return jsonError("Decision is required.");
  const { id } = await params;
  const { error } = await getSupabaseAdmin().rpc("review_submission", { p_admin_id: user.id, p_task_id: id, p_approve: body.approve });
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}
