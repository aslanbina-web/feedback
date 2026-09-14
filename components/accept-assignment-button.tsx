"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function accept() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/tasks/accept", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignmentId }),
    });
    const result = await response.json() as { error?: string; taskId?: string };
    if (!response.ok) { setMessage(result.error || "This assignment could not be accepted."); setBusy(false); return; }
    router.push(result.taskId ? `/queue/${result.taskId}` : "/queue");
    router.refresh();
  }
  return <><button className="button green full" disabled={busy} onClick={accept}>{busy ? "Accepting…" : "Accept Task"}</button><p className="form-message" aria-live="polite">{message}</p></>;
}
