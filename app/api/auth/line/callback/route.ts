import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { exchangeLineCode, isOfficialAccountFriend, verifyLineIdentity } from "@/lib/line";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function loginError(code: string) {
  return NextResponse.redirect(`${config.appUrl}/?login_error=${encodeURIComponent(code)}`);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("line_oauth_state")?.value;
  const nonce = store.get("line_oauth_nonce")?.value;
  store.delete("line_oauth_state");
  store.delete("line_oauth_nonce");
  if (!code || !state || !nonce || state !== expectedState) return loginError("invalid_state");

  try {
    const tokens = await exchangeLineCode(code, `${config.appUrl}/api/auth/line/callback`);
    const identity = await verifyLineIdentity(tokens.id_token, nonce);
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase.from("users").select("id").eq("line_user_id", identity.sub).maybeSingle();

    let userId = existing?.id as string | undefined;
    if (!userId) {
      if (config.requiresOfficialAccountFriend && !(await isOfficialAccountFriend(tokens.access_token))) {
        return loginError("official_account_required");
      }
      const { data: created, error } = await supabase
        .from("users")
        .insert({ line_user_id: identity.sub, display_name: identity.name, avatar_url: identity.picture ?? null })
        .select("id")
        .single();
      if (error) throw error;
      userId = created.id as string;
    } else {
      await supabase.from("users").update({ display_name: identity.name, avatar_url: identity.picture ?? null }).eq("id", userId);
    }

    await createSession(userId);
    return NextResponse.redirect(`${config.appUrl}/discover`);
  } catch {
    return loginError("line_login_failed");
  }
}
