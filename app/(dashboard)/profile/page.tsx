import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/data";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "My Card" };

export default async function ProfilePage() {
  const user = await requireUser();
  const business = await getOwnedBusiness(user.id);
  return <><p className="eyebrow">Profile + receive card</p><h1 className="page-title">My Card.</h1><p className="lede">Only category, area and the generic description appear before acceptance. The rest stays private.</p><ProfileForm business={business} /><hr className="rule" /><form action="/api/auth/logout" method="post"><button className="button alt">Sign out</button></form></>;
}
