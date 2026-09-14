import { NextRequest, NextResponse } from "next/server";
import { apiUser, cleanText, jsonError, validHttpUrl } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isBusinessCategory } from "@/lib/business-categories";

export async function PUT(request: NextRequest) {
  const user = await apiUser();
  if (!user) return jsonError("Sign in required.", 401);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = cleanText(body?.name, 120);
  const category = cleanText(body?.category, 80);
  const city = cleanText(body?.city, 80);
  const district = cleanText(body?.district, 80);
  const genericDescription = cleanText(body?.genericDescription, 280);
  const reviewUrl = validHttpUrl(body?.reviewUrl) ?? "";
  const samples = Array.isArray(body?.sampleReviews)
    ? body.sampleReviews.map((sample) => cleanText(sample, 500)).filter(Boolean)
    : [];
  if (!name || !category || !city || !district || !genericDescription || !reviewUrl) return jsonError("Complete every card field.");
  if (!isBusinessCategory(category)) return jsonError("Choose a business niche from the list.");
  const { error } = await getSupabaseAdmin().rpc("save_business_card", {
    p_owner_id: user.id,
    p_name: name,
    p_category: category,
    p_city: city,
    p_district: district,
    p_generic_description: genericDescription,
    p_review_url: reviewUrl,
    p_active: body?.active === "true" || body?.active === true,
    p_sample_reviews: samples,
  });
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}
