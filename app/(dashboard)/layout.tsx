import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <main className="shell">
      <header className="masthead">
        <Link className="brand" href="/">GiveGet</Link>
        <div className="credits"><strong>{user.credit_balance}</strong><span className="eyebrow">credits</span></div>
      </header>
      <div className="content">{children}</div>
      <AppNav />
    </main>
  );
}
