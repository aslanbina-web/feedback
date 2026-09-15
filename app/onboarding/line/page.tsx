import { redirect } from "next/navigation";
import { UiIcon } from "@/components/ui-icons";
import { requireUserId } from "@/lib/auth";
import { config } from "@/lib/config";
import { getOnboardingDestination } from "@/lib/data";

export const metadata = { title: "Add GiveGet on LINE" };

export default async function OfficialLineStepPage({
  searchParams,
}: {
  searchParams: Promise<{ not_friend?: string }>;
}) {
  const { not_friend: notFriend } = await searchParams;
  const userId = await requireUserId();
  const destination = await getOnboardingDestination(userId);
  if (destination !== "/onboarding/line") redirect(destination);

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const verificationUrl = liffId
    ? `https://liff.line.me/${liffId}/?verify_oa=1`
    : "/api/auth/line/start";

  return (
    <main className="shell onboarding-shell oa-step-shell">
      <header className="masthead"><span className="brand">GiveGet</span></header>
      <div className="content">
        <section className="oa-gate">
          <div className="oa-gate-art"><UiIcon name="party" /></div>
          <p className="onboarding-label">Your business card is ready!</p>
          <h1>One Final Step.</h1>
          <p className="onboarding-body">Add GiveGet on LINE to unlock Discover and start giving and receiving reviews.</p>
          {notFriend === "1" ? (
            <div className="notice">We couldn’t confirm it yet. Tap “Add GiveGet on LINE,” add the account, then come back and continue.</div>
          ) : null}
          <div className="oa-gate-actions">
            <a className="button line-button full" href={config.officialAccountUrl}>Add GiveGet on LINE</a>
            <a className="button green full" href={verificationUrl}>I’ve Added It — Continue</a>
          </div>
          <p className="privacy-note">We’ll check your LINE friendship automatically. Your 30-day Free Plan begins only after this step.</p>
        </section>
      </div>
    </main>
  );
}
