import { redirect } from "next/navigation";
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { requireUserId } from "@/lib/auth";
import { getOnboardingDestination } from "@/lib/data";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ review?: string }> }) {
  const userId = await requireUserId();
  const { review } = await searchParams;
  const reviewMode = review === "1";
  if (!reviewMode) {
    const destination = await getOnboardingDestination(userId);
    if (destination !== "/onboarding") redirect(destination);
  }

  return (
    <main className="shell onboarding-shell">
      <header className="masthead"><span className="brand">GiveGet</span></header>
      <div className="content"><OnboardingTutorial mode={reviewMode ? "review" : "onboarding"} /></div>
    </main>
  );
}
