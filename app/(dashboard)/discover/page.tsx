import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getDiscoverFeed } from "@/lib/data";
import { DiscoverClient } from "@/components/discover-client";

export const metadata: Metadata = { title: "Discover" };

export default async function DiscoverPage() {
  const user = await requireUser();
  const businesses = await getDiscoverFeed(user.id);
  return <><p className="eyebrow">Leave a review</p><h1 className="page-title">Discover.</h1><p className="lede">Choose one masked card. We reveal the exact business only after acceptance.</p><DiscoverClient initialBusinesses={businesses} /></>;
}
