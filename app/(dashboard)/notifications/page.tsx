import Link from "next/link";
import { requireUser, requireUserId } from "@/lib/auth";
import { getHistory, getQueue } from "@/lib/data";
import { TaskCountdown } from "@/components/task-countdown";
import { UiIcon } from "@/components/ui-icons";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const userId = await requireUserId();
  const [user, queue, history] = await Promise.all([requireUser(userId), getQueue(userId), getHistory(userId)]);
  const days = Math.max(0, Math.ceil((new Date(user.plan_expires_at).getTime() - Date.now()) / 86_400_000));
  return <div className="notification-list">{queue.map((task) => <article key={task.id}><span className="notice-art"><UiIcon name="clock" /></span><div><strong>Your task expires soon</strong><p>{task.business_name} is waiting. Resume your review to keep the credit chance.</p>{task.expires_at ? <TaskCountdown expiresAt={task.expires_at} /> : null}<Link href="/queue">Resume review →</Link></div></article>)}<article><span className="notice-art"><UiIcon name="mail" /></span><div><strong>New matches are ready</strong><p>You have assigned business cards available today.</p><time>Today</time></div></article><article><span className="notice-art"><UiIcon name="sprout" /></span><div><strong>Free plan: {days} days left</strong><p>Invite a business friend to earn another 30 free days after they qualify.</p><time>Today</time><Link href="/invite">Invite &amp; Grow →</Link></div></article>{history.given.slice(0, 1).map((task) => <article key={task.id}><span className="notice-art"><UiIcon name={task.status === "completed" ? "party" : "clock"} /></span><div><strong>{task.status === "completed" ? "+1 credit earned" : "Task expired"}</strong><p>{task.business_name}</p><time>Recent</time><Link href="/history">View History →</Link></div></article>)}</div>;
}
