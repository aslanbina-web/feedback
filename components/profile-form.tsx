"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Business = { id?: string; name?: string; category?: string; city?: string; district?: string; generic_description?: string; review_url?: string; active?: boolean } | null;

export function ProfileForm({ business }: { business: Business }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/business", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Card saved." : result.error || "Could not save card.");
    if (response.ok) router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={save}>
      <label>Business name<input name="name" defaultValue={business?.name} required maxLength={120} /></label>
      <div className="split">
        <label>Category<input name="category" defaultValue={business?.category} required maxLength={80} /></label>
        <label>City<input name="city" defaultValue={business?.city} required maxLength={80} /></label>
      </div>
      <label>District<input name="district" defaultValue={business?.district} required maxLength={80} /></label>
      <label>Generic description<textarea name="genericDescription" defaultValue={business?.generic_description} required maxLength={280} placeholder="Describe the type of experience without naming the business." /></label>
      <label>Exact review link<input name="reviewUrl" type="url" defaultValue={business?.review_url} required /></label>
      <label><span><input name="active" type="checkbox" value="true" defaultChecked={business?.active ?? true} style={{ width: "auto", marginRight: 8 }} />Available to receive reviews</span></label>
      <button className="button rust">Save my card</button>
      <span className="form-message" aria-live="polite">{message}</span>
    </form>
  );
}
