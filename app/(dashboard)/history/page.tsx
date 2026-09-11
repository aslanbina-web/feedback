import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getHistory } from "@/lib/data";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const user = await requireUser();
  const tasks = await getHistory(user.id);
  return <><p className="eyebrow">Your record</p><h1 className="page-title">History.</h1><p className="lede">Approved gives earn one credit. Unused credits stay in your balance.</p>{tasks.length === 0 ? <div className="empty">No finished tasks yet.</div> : tasks.map((task) => <article className="task" key={task.id}><div className="task-top"><div><span className="location">{task.business_city} · {task.business_district}</span><h2>{task.business_name}</h2></div><span className="status">{task.status}</span></div><span className="mono">Accepted {new Date(task.accepted_at).toLocaleDateString()}</span></article>)}</>;
}
