import { requireUserId } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/data";
import { SampleReviewManager } from "@/components/sample-review-manager";

export const metadata = { title: "Sample Reviews" };

export default async function SamplesPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const [userId, query] = await Promise.all([requireUserId(), searchParams]);
  const business = await getOwnedBusiness(userId);

  return (
    <>
      <h1 className="page-title compact-title">Sample Reviews.</h1>
      <p className="lede blue">Add review wording you genuinely prefer customers to use as inspiration.</p>
      {business ? <SampleReviewManager business={business} setup={query.setup === "1"} /> : <div className="empty">Create your business card before adding sample reviews.</div>}
    </>
  );
}
