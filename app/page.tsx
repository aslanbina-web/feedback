import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDailyStats } from "@/lib/data";
import { config } from "@/lib/config";
import { AppNav } from "@/components/app-nav";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  invalid_state: "The LINE login expired. Please try again.",
  official_account_required: "Add our Official LINE first, then return and sign in.",
  line_login_failed: "LINE login could not be completed. Please try again.",
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

  const stats = await getDailyStats(user.id);
  return (
    <main className="shell">
      <header className="masthead"><span className="brand">GiveGet</span><div className="credits"><strong>{user.credit_balance}</strong><span className="eyebrow">credits</span></div></header>
      <div className="content">
        <p className="eyebrow">Welcome back, {user.display_name}</p>
        <h1 className="page-title">Give one.<br />Get one.</h1>
        <p className="lede">Leave a useful review for another member. When it is approved, one credit is added to your balance.</p>
        <div className="stats">
          <div className="stat"><span className="eyebrow">Gives today</span><strong>{stats.gives}/{user.daily_give_limit}</strong></div>
          <div className="stat"><span className="eyebrow">Receives today</span><strong>{stats.receives}/{user.daily_receive_limit}</strong></div>
          <div className="stat"><span className="eyebrow">Saved credits</span><strong>{user.credit_balance}</strong></div>
        </div>
        <Link className="button rust" href="/discover">Leave a review</Link>
        {user.role === "admin" ? <p><Link className="admin-link" href="/admin">Open Admin Desk →</Link></p> : null}
      </div>
      <AppNav />
    </main>
  );
}
