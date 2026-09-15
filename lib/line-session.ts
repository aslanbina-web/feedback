import "server-only";
import { cookies } from "next/headers";
import { createSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { isOfficialAccountFriend, type LineIdentity } from "@/lib/line";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const COOKIE_PREFIX = process.env.NODE_ENV === "production" ? "__Host-" : "";

// Shared by both login paths (classic OAuth redirect callback and the LIFF
// endpoint) so the actual account creation / referral / session logic is
// identical and only tested once, not duplicated and drifting apart.
export async function completeLineLogin(identity: LineIdentity, accessToken: string) {
  const store = await cookies();
  const referralCookie = `${COOKIE_PREFIX}giveget_referral`;
  const referralCode = store.get(referralCookie)?.value;
  store.delete(referralCookie);

  const supabase = getSupabaseAdmin();
  const { data: existing, error: lookupError } = await supabase.from("users").select("id").eq("line_user_id", identity.sub).maybeSingle();
  if (lookupError) throw lookupError;

  if (!existing?.id) {
    if (config.requiresOfficialAccountFriend && !(await isOfficialAccountFriend(accessToken))) {
      throw new Error("official_account_required");
    }
  }

  const { data: user, error: upsertError } = await supabase
    .from("users")
    .upsert(
      { line_user_id: identity.sub, display_name: identity.name, avatar_url: identity.picture ?? null },
      { onConflict: "line_user_id" },
    )
    .select("id")
    .single();
  if (upsertError) throw upsertError;

  if (!existing?.id && referralCode) {
    const { error: referralError } = await supabase.rpc("claim_referral" as never, {
      p_invitee_id: user.id,
      p_referral_code: referralCode,
    } as never);
    if (referralError) console.error("Referral claim failed:", referralError.message);
  }

  await createSession(user.id);
  return user.id;
}
