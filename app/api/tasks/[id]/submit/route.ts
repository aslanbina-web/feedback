import { NextRequest, NextResponse } from "next/server";
import { apiUser, jsonError, validHttpUrl } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return jsonError("Sign in required.", 401);
  const body = (await request.json().catch(() => null)) as { proofUrl?: string } | null;
  const proofUrl = validHttpUrl(body?.proofUrl);
  if (!proofUrl) return jsonError("A valid proof link is required.");
  const { id } = await params;
  const { error } = await getSupabaseAdmin().rpc("submit_review_task", { p_giver_id: user.id, p_task_id: id, p_proof_url: proofUrl });
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}
