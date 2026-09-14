import { notFound } from "next/navigation";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { getAssignment } from "@/lib/data";
import { ReviewSteps } from "@/components/review-steps";
import { AcceptAssignmentButton } from "@/components/accept-assignment-button";
import { getBusinessCategory } from "@/lib/business-categories";
import { UiIcon } from "@/components/ui-icons";

export default async function AcceptPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const user = await requireUser();
  const { assignmentId } = await params;
  const assignment = await getAssignment(user.id, assignmentId);
  if (!assignment || new Date(assignment.assigned_until).getTime() <= Date.now()) notFound();
  return <>
    <ReviewSteps active={1} />
    <h1 className="page-title compact-title">Accept this task?</h1>
    <p className="lede blue">Support a local business with a review.</p>
    <article className="accept-card"><Image src={getBusinessCategory(assignment.category).image} alt="" width={160} height={140} /><div><span className="category-pill">{getBusinessCategory(assignment.category).name}</span><strong><UiIcon name="pin" />{assignment.city} · {assignment.district}</strong><p>{assignment.generic_description}</p></div></article>
    <div className="accept-warning"><UiIcon name="clock" /><p>You have 60 minutes to finish.<br />If it expires, you lose the chance to earn the credit.</p></div>
    <AcceptAssignmentButton assignmentId={assignment.assignment_id} />
  </>;
}
