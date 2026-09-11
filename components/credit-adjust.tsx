"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CreditAdjust({ userId }: { userId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/credits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, delta: Number(form.get("delta")), note: form.get("note") }),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Balance updated." : result.error || "Adjustment failed.");
    if (response.ok) router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="split">
        <label>Change<input name="delta" type="number" min="-100" max="100" required placeholder="e.g. 3" /></label>
        <label>Reason<input name="note" required maxLength={160} placeholder="Onboarding grant" /></label>
      </div>
      <button className="button alt">Adjust credits</button>
      <span className="form-message" aria-live="polite">{message}</span>
    </form>
  );
}
