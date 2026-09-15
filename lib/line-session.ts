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
export async function completeLineLogin(identity: LineIdentity, accessToken: string, carriedReferralCode?: string) {
  const store = await cookies();
  const referralCookie = `${COOKIE_PREFIX}giveget_referral`;
  const cookieReferralCode = store.get(referralCookie)?.value;
  const referralCode = (carriedReferralCode || cookieReferralCode || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  store.delete(referralCookie);

  const supabase = getSupabaseAdmin();
  const { data: existing, error: lookupError } = await supabase.from("users").select("id").eq("line_user_id", identity.sub).maybeSingle();
  if (lookupError) throw lookupError;

  // Login and account creation always succeed. Friendship is recorded as a
  // later activation gate, so a new user never has to abandon login, add the
  // OA, and restart the entire flow.
  let officialAccountFriend = !config.requiresOfficialAccountFriend;
  if (config.requiresOfficialAccountFriend) {
    try {
      officialAccountFriend = await isOfficialAccountFriend(accessToken);
    } catch (error) {
      // Friendship verification must never prevent a valid LINE account from
      // signing in. The protected onboarding step can retry this check later.
      console.error("Official LINE friendship check failed:", error instanceof Error ? error.message : "Unknown error");
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
    const { error: referralError } = await supabase.rpc("claim_referral", {
      p_invitee_id: user.id,
      p_referral_code: referralCode,
    });
    if (referralError) console.error("Referral claim failed:", referralError.message);
  }

  if (officialAccountFriend) {
    const { error: verificationError } = await supabase.rpc("confirm_official_line_friend", {
      p_user_id: user.id,
    });
    if (verificationError) throw verificationError;
  }

  await createSession(user.id);
  return { userId: user.id, officialAccountFriend };
}
