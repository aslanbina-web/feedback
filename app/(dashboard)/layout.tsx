import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";
import { AppHeader } from "@/components/app-header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <main className="shell">
      <AppHeader credits={user.credit_balance} />
      <div className="content">{children}</div>
      <AppNav />
    </main>
  );
}
