import { NextRequest, NextResponse } from "next/server";
import { apiUser, cleanText, jsonError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const reasons = new Set(["review_missing", "wrong_business", "other"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return jsonError("Sign in required.", 401);
  const body = (await request.json().catch(() => null)) as { reason?: unknown; details?: unknown } | null;
  const reason = cleanText(body?.reason, 40);
  const details = cleanText(body?.details, 500);
  if (!reasons.has(reason)) return jsonError("Choose a valid report reason.");
  const { id } = await params;
  const { data, error } = await getSupabaseAdmin().rpc("report_review_task" as never, {
    p_reporter_id: user.id,
    p_task_id: id,
    p_reason: reason,
    p_details: details || null,
  } as never);
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true, reportId: data });
}
