import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getHistory } from "@/lib/data";
import { HistoryTabs } from "@/components/history-tabs";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const user = await requireUser();
  const history = await getHistory(user.id);

  return (
    <>
      <h1 className="page-title compact-title">History.</h1>
      <p className="lede blue">Your completed and expired matches.</p>

      <HistoryTabs given={history.given} received={history.received} />
      <aside className="history-save-note"><span>🔗</span><span>Completed review links stay available here for future reference.</span></aside>
    </>
  );
}
