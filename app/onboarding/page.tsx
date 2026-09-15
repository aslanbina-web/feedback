import { redirect } from "next/navigation";
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { requireUserId } from "@/lib/auth";
import { getOnboardingDestination } from "@/lib/data";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const userId = await requireUserId();
  const destination = await getOnboardingDestination(userId);
  if (destination !== "/onboarding") redirect(destination);

  return (
    <main className="shell onboarding-shell">
      <header className="masthead"><span className="brand">GiveGet</span></header>
      <div className="content"><OnboardingTutorial /></div>
    </main>
  );
}
