import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getQueueTask } from "@/lib/data";
import { TaskReviewFlow } from "@/components/task-review-flow";

export default async function ReviewTaskPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const user = await requireUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const task = await getQueueTask(user.id, id);
  if (!task) notFound();
  if (task.status === "completed") redirect("/history");
  if (task.status === "expired" || task.status === "rejected") redirect("/queue");
  if (task.status !== "accepted" || !task.expires_at) redirect("/queue");

  return (
    <TaskReviewFlow
      taskId={task.id}
      expiresAt={task.expires_at}
      reviewUrl={task.review_url_snapshot}
      sampleText={task.sample_review_text}
      businessName={task.business_name}
      category={task.business_category}
      city={task.business_city}
      district={task.business_district}
      initialSubmitStep={query.step === "submit"}
    />
  );
}
