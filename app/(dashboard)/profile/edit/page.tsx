import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
import { requireUserId } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/data";

export const metadata: Metadata = { title: "Create or Edit Business" };

export default async function EditBusinessPage() {
  const userId = await requireUserId();
  const business = await getOwnedBusiness(userId);

  return <>
    <div className="business-setup-progress" aria-label="Profile setup progress"><span /><span /></div>
    <h1 className="page-title compact-title">Create Your Card.</h1>
    <p className="lede blue business-edit-lede">This information powers your assigned matches.</p>
    <ProfileForm business={business} />
  </>;
}
