import { NextRequest, NextResponse } from "next/server";
import { apiUser, cleanText, jsonError, validHttpUrl } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(request: NextRequest) {
  const user = await apiUser();
  if (!user) return jsonError("Sign in required.", 401);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const record = {
    owner_id: user.id,
    name: cleanText(body?.name, 120),
    category: cleanText(body?.category, 80),
    city: cleanText(body?.city, 80),
    district: cleanText(body?.district, 80),
    generic_description: cleanText(body?.genericDescription, 280),
    review_url: validHttpUrl(body?.reviewUrl),
    active: body?.active === "true" || body?.active === true,
  };
  if (!record.name || !record.category || !record.city || !record.district || !record.generic_description || !record.review_url) return jsonError("Complete every card field.");
  const { error } = await getSupabaseAdmin().from("businesses").upsert(record, { onConflict: "owner_id" });
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}
