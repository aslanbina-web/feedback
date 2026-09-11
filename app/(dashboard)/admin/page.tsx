import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getAdminSubmissions, getAdminUsers } from "@/lib/data";
import { AdminReview } from "@/components/admin-review";
import { CreditAdjust } from "@/components/credit-adjust";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();
  const [submissions, users] = await Promise.all([getAdminSubmissions(), getAdminUsers()]);
  return (
    <>
      <p className="eyebrow">Private moderation desk</p>
      <h1 className="page-title">Admin.</h1>
      <p className="lede">Approve valid completed reviews or reject them. Approval grants exactly one get credit.</p>
      <h2>Pending submissions</h2>
      {submissions.length === 0 ? (
        <div className="empty">No submissions waiting.</div>
      ) : (
        submissions.map((item) => (
          <article className="task" key={item.id}>
            <div><h2>{item.business_name}</h2><span className="mono">by {item.giver.display_name}</span></div>
            <a className="review-link" target="_blank" rel="noreferrer" href={item.proof_url}>Inspect proof →</a>
            <AdminReview taskId={item.id} />
          </article>
        ))
      )}
      <hr className="rule" />
      <h2>Member credits</h2>
      <p className="lede">Use a documented onboarding grant to start the first exchange. Every later change remains in the ledger.</p>
      {users.map((member) => (
        <article className="task" key={member.id}>
          <div className="task-top">
            <div><h2>{member.display_name}</h2><span className="mono">{member.role}</span></div>
            <span className="status">{member.credit_balance} credits</span>
          </div>
          <CreditAdjust userId={member.id} />
        </article>
      ))}
    </>
  );
}
