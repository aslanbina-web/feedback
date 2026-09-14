import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const days = Math.max(0, Math.ceil((new Date(user.plan_expires_at).getTime() - Date.now()) / 86_400_000));
  return <><section className="settings-list"><Link className="setting-row" href="/profile"><span className="setting-art">👤</span><div><strong>Account</strong><small>LINE identity and profile</small></div><b>›</b></Link><Link className="setting-row" href="/notifications"><span className="setting-art">🔔</span><div><strong>Notifications</strong><small>Task, match and plan alerts</small></div><b>›</b></Link><div className="setting-row"><span className="setting-art">🛡️</span><div><strong>Privacy &amp; Safety</strong><small>Community rules and reports</small></div><b>›</b></div><div className="setting-row"><span className="setting-art">❓</span><div><strong>Help</strong><small>How GiveGet works</small></div><b>›</b></div></section><section className="settings-list"><div className="setting-row"><span className="setting-art">🌱</span><div><strong>Free Plan</strong><small>{days} days remaining</small></div><b>›</b></div><Link className="setting-row" href="/invite"><span className="setting-art">💌</span><div><strong>Invite &amp; Grow</strong><small>Earn another 30 free days</small></div><b>›</b></Link></section><form action="/api/auth/logout" method="post"><button className="settings-logout">Log out</button></form><p className="version-note">GiveGet version 1.0</p></>;
}
