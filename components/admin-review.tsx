"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminReview({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function review(approve: boolean) {
    setBusy(true);
    const response = await fetch(`/api/admin/tasks/${taskId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approve }),
    });
    setBusy(false);
    if (response.ok) router.refresh();
  }
  return <div className="actions"><button className="button alt" type="button" disabled={busy} onClick={() => review(false)}>Reject</button><button className="button" type="button" disabled={busy} onClick={() => review(true)}>Approve +1</button></div>;
}
