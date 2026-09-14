import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

const COOKIE_PREFIX = process.env.NODE_ENV === "production" ? "__Host-" : "";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const safeCode = code.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  const response = NextResponse.redirect(`${config.appUrl}/`);
  if (safeCode) {
    response.cookies.set(`${COOKIE_PREFIX}giveget_referral`, safeCode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}
