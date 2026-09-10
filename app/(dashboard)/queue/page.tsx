import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getQueue } from "@/lib/data";
import { TaskSubmitForm } from "@/components/task-submit-form";

export const metadata: Metadata = { title: "Tasks" };

export default async function QueuePage() {
  const user = await requireUser();
  const tasks = await getQueue(user.id);
  return <><p className="eyebrow">Accepted work</p><h1 className="page-title">Queue.</h1><p className="lede">The private details below were revealed because you accepted these tasks.</p>{tasks.length === 0 ? <div className="empty">No active tasks.</div> : tasks.map((task) => <article className="task" key={task.id}><div className="task-top"><div><span className="location">{task.business.city} · {task.business.district}</span><h2>{task.business.name}</h2><span className="mono">{task.business.category}</span></div><span className="status">{task.status}</span></div><a className="review-link" href={task.business.review_url} rel="noreferrer" target="_blank">Open exact review page →</a>{task.status === "accepted" ? <TaskSubmitForm taskId={task.id} /> : <p className="notice">Submitted. Waiting for approval.</p>}</article>)}</>;
}
