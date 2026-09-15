import { requireUser, requireUserId } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/data";
import { SampleReviewManager } from "@/components/sample-review-manager";
import { config } from "@/lib/config";
import { redirect } from "next/navigation";

export const metadata = { title: "Sample Reviews" };

export default async function SamplesPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const [userId, query] = await Promise.all([requireUserId(), searchParams]);
  const [user, business] = await Promise.all([requireUser(userId), getOwnedBusiness(userId)]);
  if (!business) redirect("/profile/edit?setup=1");
  if (config.requiresOfficialAccountFriend && !user.oa_friend_verified_at) redirect("/onboarding/line");

  return (
    <>
      <h1 className="page-title compact-title">Sample Reviews.</h1>
      <p className="lede blue">Add review wording you genuinely prefer customers to use as inspiration.</p>
      <SampleReviewManager business={business} setup={query.setup === "1"} />
    </>
  );
}
