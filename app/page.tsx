import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserId, getUserById } from "@/lib/auth";
import { getDailyStats, getOnboardingDestination, getPlanStats } from "@/lib/data";
import { config } from "@/lib/config";
import { AppNav } from "@/components/app-nav";
import Image from "next/image";
import { UiIcon } from "@/components/ui-icons";
import { PwaLoginHelp } from "@/components/pwa-login-help";
import { LiffLoginButton } from "@/components/liff-login-button";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  invalid_state: "The LINE login expired. Please try again.",
  official_account_required: "Add our Official LINE first, then return and sign in.",
  line_login_failed: "LINE login could not be completed. Please try again.",
  line_cancelled: "LINE sign-in was cancelled.",
  configuration: "LINE sign-in is being connected. Please check again shortly.",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ login_error?: string }> }) {
  const [userId, query, hdrs] = await Promise.all([getSessionUserId(), searchParams, headers()]);
  const message = query.login_error ? errors[query.login_error] : null;
  const lineAuthUrl = hdrs.get("x-line-auth-url") || "/api/auth/line/start";
  if (!userId) {
    return <LoginScreen message={message} lineAuthUrl={lineAuthUrl} />;
  }

  const [user, stats, plan] = await Promise.all([getUserById(userId), getDailyStats(userId), getPlanStats(userId)]);
  if (!user) return <LoginScreen message={message} lineAuthUrl={lineAuthUrl} />;
  if (!user.onboarding_completed_at) redirect(await getOnboardingDestination(userId));
  return (
    <main className="shell">
      <header className="masthead"><span className="brand">GiveGet</span><div className="header-actions"><Link className="header-icon" href="/notifications" aria-label="Notifications"><UiIcon name="bell" /></Link></div></header>
      <div className="content">
        <div className="home-tagline"><Image src="/giveget-star.svg" alt="GiveGet star" width={74} height={68} priority /><p>Good reviews.<br />Stronger businesses.</p></div>
        <section className="credit-panel"><span>Your Credits</span><strong><UiIcon name="star" />{user.credit_balance}</strong><Link href="/invite">Get More →</Link></section>
        <div className="daily-stats">
          <div className="daily-stat give"><span className="daily-symbol"><UiIcon name="send" /></span><span>Reviews Given Today</span><strong>{stats.gives} used</strong><small>{Math.max(user.daily_give_limit - stats.gives, 0)} left · Daily limit {user.daily_give_limit}</small></div>
          <div className="daily-stat receive"><span className="daily-symbol"><UiIcon name="heart" /></span><span>Reviews Received Today</span><strong>{stats.receives} received</strong><small>{Math.max(user.daily_receive_limit - stats.receives, 0)} left · Daily limit {user.daily_receive_limit}</small></div>
        </div>
        <Link className="button coral full home-cta" href="/discover">Leave a Review →</Link>
        <section className="monthly-goal plan-usage"><h2>Free Plan Usage</h2><div><span>Reviews Given</span><strong>{plan.gives} of {plan.giveLimit} used</strong></div><div className="progress-track"><span style={{ width: `${Math.min(plan.gives / plan.giveLimit * 100, 100)}%` }} /></div><div><span>Reviews Received</span><strong>{plan.receives} of {plan.receiveLimit} used</strong></div><div className="progress-track receive"><span style={{ width: `${Math.min(plan.receives / plan.receiveLimit * 100, 100)}%` }} /></div><small>Your Free Plan includes up to {plan.giveLimit} reviews given and {plan.receiveLimit} reviews received during this plan period.</small></section>
        <aside className="home-tip"><span aria-hidden="true"><UiIcon name="star" /></span><p><strong>One thoughtful review matters.</strong><br />Support a local business today!</p></aside>
        {user.role === "admin" ? <p><Link className="admin-link" href="/admin">Open Admin Desk →</Link></p> : null}
      </div>
      <AppNav />
    </main>
  );
}

function LoginScreen({ message, lineAuthUrl }: { message: string | null; lineAuthUrl: string }) {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  return (
    <main className="shell login">
      <p className="eyebrow">A private exchange for local businesses</p>
      <h1 className="login-mark">Give<br />Get.</h1>
      <p className="login-sub">1 completed give = 1 get credit.<br />Fair, simple, useful.</p>
      {message ? <div className="notice">{message}</div> : null}
      <PwaLoginHelp />
      {liffId ? (
        <>
          <LiffLoginButton liffId={liffId} />
          <a className="text-button" href={lineAuthUrl}>Trouble signing in? Try classic sign-in</a>
        </>
      ) : (
        <a className="button line-button full" href={lineAuthUrl}>Continue with LINE</a>
      )}
      <a className="button alt full" href={config.officialAccountUrl} style={{ marginTop: 10 }}>Add Official LINE</a>
      <p className="privacy-note">New accounts are admitted through our Official LINE. There is no public email signup.</p>
    </main>
  );
}
