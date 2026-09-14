import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getDailyStats, getMonthlyStats, getOwnedBusiness } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";
import { getBusinessCategory } from "@/lib/business-categories";

export const metadata: Metadata = { title: "My Card" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [business, stats, monthly] = await Promise.all([getOwnedBusiness(user.id), getDailyStats(user.id), getMonthlyStats(user.id)]);
  const planDays = Math.max(0, Math.ceil((new Date(user.plan_expires_at).getTime() - Date.now()) / 86_400_000));
  const category = getBusinessCategory(business?.category);
  return <>
    <section className="profile-identity">
      <div className="avatar">{user.display_name.slice(0, 1).toUpperCase()}</div>
      <div><strong>{user.display_name}</strong><span>🌱 Free Plan</span></div>
    </section>
    <section className="business-card-panel" id="business-card">
      <div className="profile-title-row">
        <h1 className="page-title compact-title">My Card.</h1>
        <Link className="profile-edit-button" href="/profile/edit">✎ Edit</Link>
      </div>
      {business ? <article className="business-summary"><Image src={category.image} alt="" width={95} height={110} /><div><h2>{business.name}</h2><span>{category.name} · {business.city} · {business.district}</span><p>{business.generic_description}</p></div></article> : <div className="empty">Create your business card below.</div>}
      <Link className="sample-action-link" href={business ? "/samples" : "#business-card"}>✍️ Add Sample Reviews</Link>
      <p className="sample-helper">Add sample reviews you prefer for your shop.<br /><strong>{business?.business_review_samples?.length ?? 0} samples available</strong></p>
    </section>
    <div className="quota-stats"><div><span>Credits</span><strong>⭐ {user.credit_balance}</strong></div><div><span>Gives</span><strong className="green-text">{monthly.gives}/30</strong><small>{planDays} days left</small></div><div><span>Receives</span><strong className="red-text">{monthly.receives}/30</strong><small>{planDays} days left</small></div></div>
    <p className="saved-passes">Give passes: {stats.giveAllowance} · Receive passes: {stats.receiveAllowance}<br />Saved passes never expire.</p>
    <Link href="/invite" className="text-button">Invite &amp; Grow →</Link>
  </>;
}
