import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getDiscoverFeed } from "@/lib/data";
import { DiscoverClient } from "@/components/discover-client";

export const metadata: Metadata = { title: "Discover" };

export default async function DiscoverPage() {
  const user = await requireUser();
  const businesses = await getDiscoverFeed(user.id);
  const expired = new Date(user.plan_expires_at).getTime() <= Date.now();
  if (expired) {
    return <><p className="eyebrow">Free Plan</p><h1 className="page-title">Your 30 free days have ended.</h1><p className="lede">Invite a friend and receive another 30 free days after they complete their first review.</p><a className="button rust" href="/invite">Invite a Friend →</a></>;
  }
  return <><h1 className="page-title compact-title">Your Assigned Matches.</h1><p className="lede blue">Up to 3 available today.</p><DiscoverClient initialBusinesses={businesses} /></>;
}
