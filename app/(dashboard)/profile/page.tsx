import type { Metadata } from "next";
import { requireUser, requireUserId } from "@/lib/auth";
import { getDailyStats, getPlanStats, getOwnedBusiness } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";
import { getBusinessCategory } from "@/lib/business-categories";
import { UiIcon } from "@/components/ui-icons";

export const metadata: Metadata = { title: "My Card" };

export default async function ProfilePage() {
  const userId = await requireUserId();
  const [user, business, stats, plan] = await Promise.all([requireUser(userId), getOwnedBusiness(userId), getDailyStats(userId), getPlanStats(userId)]);
  const planDays = Math.max(0, Math.ceil((new Date(user.plan_expires_at).getTime() - Date.now()) / 86_400_000));
  const category = getBusinessCategory(business?.category);
  return <>
    <section className="profile-identity">
      <div className="avatar">{user.display_name.slice(0, 1).toUpperCase()}</div>
      <div><strong>{user.display_name}</strong><span><UiIcon name="sprout" /> Free Plan</span></div>
    </section>
    <section className="business-card-panel" id="business-card">
      <div className="profile-title-row">
        <h1 className="page-title compact-title">My Card.</h1>
        <Link className="profile-edit-button" href="/profile/edit"><UiIcon name="edit" /> Edit</Link>
      </div>
      {business ? <article className="business-summary"><Image src={category.image} alt="" width={95} height={110} /><div><h2>{business.name}</h2><span>{category.name} · {business.city} · {business.district}</span><p>{business.generic_description}</p></div></article> : <div className="empty">Create your business card below.</div>}
      <Link className="sample-action-link" href={business ? "/samples" : "#business-card"}><UiIcon name="edit" /> Add Sample Reviews</Link>
      <p className="sample-helper">Add sample reviews you prefer for your shop.<br /><strong>{business?.business_review_samples?.length ?? 0} samples available</strong></p>
      {business && (business.business_review_samples?.length ?? 0) <= 1 ? (
        <p className="notice">
          {(business.business_review_samples?.length ?? 0) === 0
            ? "You're out of sample reviews. Reviewers will still be matched to you, but add a sample so they have a starting point to work from."
            : "Only 1 sample left — add a few more so reviewers always have a starting point to work from."}
        </p>
      ) : null}
    </section>
    <div className="quota-stats"><div><span>Credits</span><strong><UiIcon name="star" /> {user.credit_balance}</strong></div><div><span>Gives</span><strong className="green-text">{plan.gives}/{plan.giveLimit}</strong><small>{planDays} days left</small></div><div><span>Receives</span><strong className="red-text">{plan.receives}/{plan.receiveLimit}</strong><small>{planDays} days left</small></div></div>
    <p className="saved-passes">Give passes: {stats.giveAllowance} · Receive passes: {stats.receiveAllowance}<br />Saved passes never expire.</p>
    <Link href="/invite" className="text-button">Invite &amp; Grow →</Link>
  </>;
}
