import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getQueue } from "@/lib/data";
import { TaskCountdown } from "@/components/task-countdown";
import { ReviewSteps } from "@/components/review-steps";
import Link from "next/link";
import Image from "next/image";
import { getBusinessCategory } from "@/lib/business-categories";
import { UiIcon } from "@/components/ui-icons";

export const metadata: Metadata = { title: "Tasks" };

export default async function QueuePage({ searchParams }: { searchParams: Promise<{ completed?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  if (query.completed === "1") return <div className="done-screen"><Image className="celebration-star" src="/giveget-star.svg" alt="Celebrating GiveGet star" width={190} height={175} /><h1 className="page-title">Great job!</h1><p className="lede blue">Your review is complete!</p><div className="credit-earned"><UiIcon name="star" /> <strong>+1 credit added</strong></div><Link className="button green full" href="/discover">Find Another Business</Link><Link className="button white full" href="/history">View History</Link></div>;
  const tasks = await getQueue(user.id);
  return <><h1 className="page-title compact-title">Tasks.</h1><p className="lede blue">Your active review tasks.</p>{tasks.length === 0 ? <div className="empty">No active tasks.</div> : tasks.map((task) => <article className="active-task" key={task.id}><div className="active-task-top"><Image src={getBusinessCategory(task.business_category).image} alt="" width={92} height={82} /><div><h2>{task.business_name}</h2><span className="category-pill">{getBusinessCategory(task.business_category).name}</span><strong><UiIcon name="pin" />{task.business_city} · {task.business_district}</strong>{task.expires_at ? <span className="task-time"><TaskCountdown expiresAt={task.expires_at} /></span> : null}</div></div><ReviewSteps active={task.status === "accepted" ? 2 : 3} /><div className="sample-ready">▤ &nbsp; Sample review ready ✓</div>{task.status === "accepted" ? <Link className="button green full" href={`/queue/${task.id}`}>Resume Review</Link> : <p className="notice">Legacy submission waiting for review.</p>}<small>Leaving the app will not lose your place.</small></article>)}</>;
}
