"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DiscoverBusiness } from "@/lib/types";
import { getBusinessCategory } from "@/lib/business-categories";
import { UiIcon } from "@/components/ui-icons";

export function DiscoverClient({ initialBusinesses }: { initialBusinesses: DiscoverBusiness[] }) {
  const router = useRouter();

  useEffect(() => {
    const expiries = initialBusinesses
      .map((business) => new Date(business.assigned_until).getTime())
      .filter(Number.isFinite);
    const nextExpiry = expiries.length ? Math.min(...expiries) : Date.now() + 30 * 60 * 1000;
    const delay = Math.max(nextExpiry - Date.now() + 500, 1_000);
    const timer = window.setTimeout(() => router.refresh(), delay);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible" && Date.now() >= nextExpiry) router.refresh();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [initialBusinesses, router]);

  if (initialBusinesses.length === 0) {
    return <div className="empty"><p className="eyebrow">No assigned match right now</p><p>We will show a new eligible match as soon as one becomes available.</p></div>;
  }

  return (
    <>
    <div className="assignment-refresh"><UiIcon name="refresh" /> New assignments rotate every 30 minutes</div>
    <div className="match-list">
      {initialBusinesses.map((business) => (
        <Link className="match-card" href={`/discover/${business.assignment_id}`} key={business.assignment_id}>
          <Image className="match-image" src={getBusinessCategory(business.category).image} alt="" width={180} height={132} sizes="120px" />
          <div className="match-copy">
            <span className="category-pill">{getBusinessCategory(business.category).name}</span>
            <strong><UiIcon name="pin" />{business.city} · {business.district}</strong>
            <p>{business.generic_description}</p>
          </div>
          <span className="match-arrow">›</span>
        </Link>
      ))}
      <div className="discover-privacy"><span aria-hidden="true"><UiIcon name="lock" /></span><p>Business name, owner and review link stay hidden until you accept.</p></div>
    </div>
    </>
  );
}
