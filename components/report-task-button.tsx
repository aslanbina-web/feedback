"use client";

import { FormEvent, useState } from "react";

export function ReportTaskButton({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/tasks/${taskId}/report`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reason: form.get("reason"),
        details: form.get("details"),
      }),
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || "Could not send the report.");
      return;
    }
    setMessage("Report sent. Your task and timer are unchanged.");
    setOpen(false);
  }

  return (
    <div className="report-task">
      <button className="text-button" type="button" onClick={() => setOpen((value) => !value)}>
        Report incorrect or missing review
      </button>
      {open ? (
        <form className="report-form" onSubmit={submit}>
          <label>
            What is wrong?
            <select name="reason" defaultValue="review_missing">
              <option value="review_missing">My posted review is missing</option>
              <option value="wrong_business">Wrong business or Maps page</option>
              <option value="other">Something else</option>
            </select>
          </label>
          <label>
            Details
            <textarea name="details" maxLength={500} placeholder="Tell us what happened." />
          </label>
          <button className="button white full" disabled={busy}>{busy ? "Sending…" : "Send Report"}</button>
        </form>
      ) : null}
      <span className="form-message" aria-live="polite">{message}</span>
    </div>
  );
}
