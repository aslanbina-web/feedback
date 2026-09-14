"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportTaskButton } from "@/components/report-task-button";

export function TaskSubmitForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/tasks/${taskId}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proofUrl: form.get("proofUrl") }),
    });
    const result = (await response.json()) as { error?: string; status?: string };
    setMessage(response.ok ? (result.status === "expired" ? "Time expired. You lost the chance to earn this credit." : "Completed. You earned 1 credit.") : result.error || "Submission failed.");
    setBusy(false);
    if (response.ok && result.status !== "expired") router.push("/queue?completed=1");
    else if (response.ok) router.refresh();
  }

  return (
    <>
      <form className="form-grid" onSubmit={submit}>
        <label>Paste your review URL<input name="proofUrl" type="url" required placeholder="https://maps.google.com/..." /></label>
        <button className="button green" disabled={busy}>{busy ? "Submitting…" : "Confirm Submission"}</button>
        <span className="form-message" aria-live="polite">{message}</span>
      </form>
      <ReportTaskButton taskId={taskId} />
    </>
  );
}
