import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDailyStats, getMonthlyStats } from "@/lib/data";
import { config } from "@/lib/config";
import { AppNav } from "@/components/app-nav";
import Image from "next/image";
import { UiIcon } from "@/components/ui-icons";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  invalid_state: "The LINE login expired. Please try again.",
  official_account_required: "Add our Official LINE first, then return and sign in.",
  line_login_failed: "LINE login could not be completed. Please try again.",
  line_cancelled: "LINE sign-in was cancelled.",
  configuration: "LINE sign-in is being connected. Please check again shortly.",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ login_error?: string }> }) {
  const user = await getCurrentUser();
  const query = await searchParams;
  if (!user) {
    const message = query.login_error ? errors[query.login_error] : null;
    return (
      <main className="shell login">
        <p className="eyebrow">A private exchange for local businesses</p>
        <h1 className="login-mark">Give<br />Get.</h1>
        <p className="login-sub">1 completed give = 1 get credit.<br />Fair, simple, useful.</p>
        {message ? <div className="notice">{message}</div> : null}
        <a className="button line-button full" href="/api/auth/line/start">Continue with LINE</a>
        <a className="button alt full" href={config.officialAccountUrl} style={{ marginTop: 10 }}>Add Official LINE</a>
        <p className="privacy-note">New accounts are admitted through our Official LINE. There is no public email signup.</p>
      </main>
    );
  }

  const [stats, monthly] = await Promise.all([getDailyStats(user.id), getMonthlyStats(user.id)]);
  const planDays = Math.max(0, Math.ceil((new Date(user.plan_expires_at).getTime() - Date.now()) / 86_400_000));
  return (
    <main className="shell">
      <header className="masthead"><span className="brand">GiveGet</span><div className="header-actions"><Link className="header-icon" href="/notifications" aria-label="Notifications"><UiIcon name="bell" /></Link></div></header>
      <div className="content">
        <div className="home-tagline"><Image src="/giveget-star.svg" alt="GiveGet star" width={74} height={68} priority /><p>Good reviews.<br />Stronger businesses.</p></div>
        <section className="credit-panel"><span>Your Credits</span><strong><UiIcon name="star" />{user.credit_balance}</strong><Link href="/invite">Get More →</Link></section>
        <div className="daily-stats">
          <div className="daily-stat give"><span className="daily-symbol">➤</span><span>Gives Today</span><strong>{stats.gives} / 3</strong></div>
          <div className="daily-stat receive"><span className="daily-symbol">♥</span><span>Receives Today</span><strong>{stats.receives} / 3</strong></div>
        </div>
        <Link className="button coral full home-cta" href="/discover">Leave a Review →</Link>
        <section className="monthly-goal"><h2>Your Progress</h2><div><span>Monthly Goal</span><strong>{monthly.gives} / 30</strong></div><div className="progress-track"><span style={{ width: `${Math.min(monthly.gives / 30 * 100, 100)}%` }} /></div><small>Saved passes never expire.</small></section>
        <aside className="home-tip"><span aria-hidden="true">🌟</span><p><strong>One thoughtful review matters.</strong><br />Support a local business today!</p></aside>
        {user.role === "admin" ? <p><Link className="admin-link" href="/admin">Open Admin Desk →</Link></p> : null}
      </div>
      <AppNav />
    </main>
  );
}
