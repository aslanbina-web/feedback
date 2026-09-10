import { NextRequest, NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const user = await apiUser();
  if (!user) return jsonError("Sign in required.", 401);
  const body = (await request.json().catch(() => null)) as { businessId?: string } | null;
  if (!body?.businessId) return jsonError("Business is required.");
  const { error } = await getSupabaseAdmin().rpc("skip_business", { p_giver_id: user.id, p_business_id: body.businessId });
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}
