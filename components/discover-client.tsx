"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscoverBusiness } from "@/lib/types";

export function DiscoverClient({ initialBusinesses }: { initialBusinesses: DiscoverBusiness[] }) {
  const router = useRouter();
  const [businesses, setBusinesses] = useState(initialBusinesses);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const business = businesses[0];

  async function act(kind: "accept" | "skip") {
    if (!business || busy) return;
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/tasks/${kind}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessId: business.id }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error || "That action could not be completed.");
      setBusy(false);
      return;
    }
    if (kind === "accept") {
      router.push("/queue");
      router.refresh();
      return;
    }
    setBusinesses((current) => current.slice(1));
    setBusy(false);
  }

  if (!business) {
    return <div className="empty"><p className="eyebrow">No eligible matches right now</p><p>Check again later. Skipped cards return after 30 days.</p></div>;
  }

  return (
    <>
      <article className="card">
        <div className="card-head"><span className="eyebrow">Private preview</span><span className="mono">01 / {businesses.length.toString().padStart(2, "0")}</span></div>
        <div className="card-body">
          <span className="location">{business.city} · {business.district}</span>
          <h2>{business.category}</h2>
          <p className="generic">{business.generic_description}</p>
          <p className="privacy-note">Business name, owner identity and exact review link stay hidden until you accept.</p>
        </div>
      </article>
      <div className="actions">
        <button className="button alt" type="button" disabled={busy} onClick={() => act("skip")}>Skip</button>
        <button className="button rust" type="button" disabled={busy} onClick={() => act("accept")}>{busy ? "Working…" : "Leave a review"}</button>
      </div>
      <p className="form-message" aria-live="polite">{message}</p>
    </>
  );
}
