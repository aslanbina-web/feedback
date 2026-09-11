"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
    setMessage(response.ok ? (result.status === "expired" ? "Time expired. The task returned to Discover." : "Completed. You earned 1 credit.") : result.error || "Submission failed.");
    setBusy(false);
    if (response.ok) router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <label>Proof link<input name="proofUrl" type="url" required placeholder="Link to your posted review" /></label>
      <button className="button" disabled={busy}>{busy ? "Submitting…" : "Mark done"}</button>
      <span className="form-message" aria-live="polite">{message}</span>
    </form>
  );
}
