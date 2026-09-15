import { NextRequest, NextResponse } from "next/server";
import { verifyLineAccessToken, verifyLineIdentity } from "@/lib/line";
import { completeLineLogin } from "@/lib/line-session";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { idToken?: string; accessToken?: string; referralCode?: string } | null;
  if (!body?.idToken || !body?.accessToken) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  try {
    const [identity] = await Promise.all([
      verifyLineIdentity(body.idToken),
      verifyLineAccessToken(body.accessToken),
    ]);
    const result = await completeLineLogin(identity, body.accessToken, body.referralCode);
    return NextResponse.json({
      ok: true,
      redirectTo: result.officialAccountFriend ? "/onboarding" : "/onboarding/line?not_friend=1",
    });
  } catch (error) {
    console.error("LIFF login failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "login_failed" }, { status: 400 });
  }
}
