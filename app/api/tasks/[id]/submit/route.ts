import { NextRequest, NextResponse } from "next/server";
import { apiUser, jsonError, validGoogleReviewUrl } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return jsonError("Sign in required.", 401);
  const body = (await request.json().catch(() => null)) as { proofUrl?: string } | null;
  const proofUrl = validGoogleReviewUrl(body?.proofUrl);
  if (!proofUrl) return jsonError("Use a valid Google Maps review link.");
  const { id } = await params;
  const { data, error } = await getSupabaseAdmin().rpc("complete_review_task" as never, { p_giver_id: user.id, p_task_id: id, p_proof_url: proofUrl } as never);
  if (error) {
    if (error.code === "23505") return jsonError("That proof link was already used.", 409);
    return jsonError(error.message);
  }
  return NextResponse.json({ ok: true, status: data });
}
