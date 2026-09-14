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
  return <><div className="invite-title"><div><h1 className="page-title compact-title">Invite &amp; Grow.</h1><span className="plan-badge"><UiIcon name="sprout" /> Free Plan</span><p className="lede blue">Invite another business owner and earn 30 more free days.</p></div><Image src="/giveget-invite-star.webp" alt="GiveGet star" width={100} height={92} /></div><section className="referral-card"><h2>Your Referral Link</h2><ReferralLink url={url} /><div className="share-icons"><a href={`https://line.me/R/msg/text/?${message}`}><span className="share-mark">LINE</span>LINE</a><a href={`https://wa.me/?text=${message}`}><span className="share-mark">WA</span>WhatsApp</a><a href={`mailto:?body=${message}`}><span><UiIcon name="mail" /></span>Email</a><a href={url}><span><UiIcon name="more" /></span>More</a></div></section><section className="how-it-works"><h2>How it works</h2><ol><li>Invite a new business through your unique link.</li><li>They create their business card.</li><li>They add at least one sample review.</li><li>They complete their first Give.</li></ol></section><aside className="referral-reward"><strong><UiIcon name="party" /> You receive +30 free days</strong><br />Only after all four steps are completed.<br />The reward applies to the inviter only.<br /><small>Qualified rewards: {stats.rewarded}</small></aside></>;
}
