import { requireUser } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/data";
import { SampleReviewManager } from "@/components/sample-review-manager";

export const metadata = { title: "Sample Reviews" };

export default async function SamplesPage() {
  const user = await requireUser();
  const business = await getOwnedBusiness(user.id);

  return (
    <>
      <h1 className="page-title compact-title">Sample Reviews.</h1>
      <p className="lede blue">Add review wording you genuinely prefer customers to use as inspiration.</p>
      {business ? <SampleReviewManager business={business} /> : <div className="empty">Create your business card before adding sample reviews.</div>}
    </>
  );
}
