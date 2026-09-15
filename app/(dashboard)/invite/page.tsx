import { requireUser, requireUserId } from "@/lib/auth";
import { config } from "@/lib/config";
import { getReferralStats } from "@/lib/data";
import { ReferralLink } from "@/components/referral-link";
import Image from "next/image";
import { UiIcon } from "@/components/ui-icons";

export const metadata = { title: "Invite & Grow" };

export default async function InvitePage() {
  const userId = await requireUserId();
  const [user, stats] = await Promise.all([requireUser(userId), getReferralStats(userId)]);
  const url = `${config.appUrl}/r/${user.referral_code}`;
  const message = encodeURIComponent(`Join GiveGet with my referral link: ${url}`);
  const availableDate = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Taipei",
  }).format(new Date(stats.availableFrom));

  return <>
    <div className="invite-title">
      <div>
        <h1 className="page-title compact-title">Invite &amp; Grow.</h1>
        <span className="plan-badge"><UiIcon name="sprout" /> Free Plan</span>
        <p className="lede blue">{stats.rewardAvailable ? "Invite one new business and secure your next 30 days." : "Your next 30 days are secured!"}</p>
      </div>
      <Image src="/giveget-invite-star.webp" alt="GiveGet star" width={100} height={92} />
    </div>
    <section className="referral-card">
      <h2>Your Referral Link</h2>
      <ReferralLink url={url} />
      <div className="share-icons">
        <a href={`https://line.me/R/msg/text/?${message}`}><span className="share-mark">LINE</span>LINE</a>
        <a href={`https://wa.me/?text=${message}`}><span className="share-mark">WA</span>WhatsApp</a>
        <a href={`mailto:?body=${message}`}><span><UiIcon name="mail" /></span>Email</a>
        <a href={url}><span><UiIcon name="more" /></span>More</a>
      </div>
    </section>
    <section className="how-it-works">
      <h2>How it works</h2>
      <ol>
        <li>Invite a new business through your unique link.</li>
        <li>They create their business card and add GiveGet on LINE.</li>
        <li>They add at least one sample review.</li>
        <li>They complete their first Give.</li>
      </ol>
    </section>
    <aside className="referral-reward">
      {stats.rewardAvailable ? <>
        <strong><UiIcon name="party" /> Earn your next 30 free days</strong><br />
        The first friend who completes all four steps qualifies.<br />
        <small>Pending referrals: {stats.pending} · Rewards earned: {stats.rewarded}</small>
      </> : <>
        <strong><UiIcon name="party" /> Your reward is secured</strong><br />
        Another reward becomes available on {availableDate}.<br />
        <small>Extra referrals do not stack or queue during this period.</small>
      </>}
    </aside>
  </>;
}
