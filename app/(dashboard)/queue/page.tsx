import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getQueue } from "@/lib/data";
import { TaskSubmitForm } from "@/components/task-submit-form";
import { TaskCountdown } from "@/components/task-countdown";

export const metadata: Metadata = { title: "Tasks" };

export default async function QueuePage() {
  const user = await requireUser();
  const tasks = await getQueue(user.id);
  return <><p className="eyebrow">Accepted work</p><h1 className="page-title">Tasks.</h1><p className="lede">Finish accepted reviews within 60 minutes. Leaving this page will not lose your place.</p>{tasks.length === 0 ? <div className="empty">No active tasks.</div> : tasks.map((task) => <article className="task" key={task.id}><div className="task-top"><div><span className="location">{task.business_city} · {task.business_district}</span><h2>{task.business_name}</h2><span className="mono">{task.business_category}</span></div><span className="status">{task.status === "accepted" ? "in progress" : task.status}</span></div>{task.status === "accepted" && task.expires_at ? <TaskCountdown expiresAt={task.expires_at} /> : null}<a className="review-link" href={task.review_url_snapshot} rel="noreferrer" target="_blank">Open exact review page →</a>{task.status === "accepted" ? <TaskSubmitForm taskId={task.id} /> : <p className="notice">Legacy submission. Waiting for admin review.</p>}</article>)}</>;
}
