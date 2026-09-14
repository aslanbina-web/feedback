import { NextRequest, NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { expireOverdueTasks } from "@/lib/data";

export async function POST(request: NextRequest) {
  const user = await apiUser();
  if (!user) return jsonError("Sign in required.", 401);
  const body = (await request.json().catch(() => null)) as { assignmentId?: string } | null;
  if (!body?.assignmentId) return jsonError("Assignment is required.");
  await expireOverdueTasks();
  const { data, error } = await getSupabaseAdmin().rpc("accept_review_task", { p_giver_id: user.id, p_assignment_id: body.assignmentId });
  if (error) return jsonError(error.message);
  return NextResponse.json({ taskId: data });
}
