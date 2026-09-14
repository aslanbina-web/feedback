"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Sample = { id: string; sample_text: string; created_at: string };
type Business = {
  name: string;
  category: string;
  city: string;
  district: string;
  generic_description: string;
  review_url: string;
  active: boolean;
  business_review_samples?: Sample[];
};

export function SampleReviewManager({ business, preview = false }: { business: Business; preview?: boolean }) {
  const router = useRouter();
  const [samples, setSamples] = useState(() => business.business_review_samples?.map((item) => item.sample_text) ?? []);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function persist(nextSamples: string[]) {
    if (preview) {
      setSamples(nextSamples);
      setMessage("Preview updated.");
      return true;
    }

    setBusy(true);
    setMessage("");
    const response = await fetch("/api/business", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: business.name,
        category: business.category,
        city: business.city,
        district: business.district,
        genericDescription: business.generic_description,
        reviewUrl: business.review_url,
        active: business.active,
        sampleReviews: nextSamples,
      }),
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error || "Could not update samples.");
      return false;
    }
    setSamples(nextSamples);
    setMessage("Samples updated.");
    router.refresh();
    return true;
  }

  async function addSample(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    const saved = await persist([...samples, value]);
    if (saved) setDraft("");
  }

  async function removeSample(index: number) {
    if (samples.length <= 1) {
      setMessage("Keep at least one sample review available.");
      return;
    }
    await persist(samples.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <>
      <form className="sample-add-card" onSubmit={addSample}>
        <label htmlFor="sample-review-draft">Add a new sample</label>
        <textarea
          id="sample-review-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={500}
          placeholder="Example: Friendly service and beautiful fresh flowers..."
          required
        />
        <div className="sample-counter">{draft.length} / 500</div>
        <button className="button green full" disabled={busy}>{busy ? "Saving…" : "Add to My Samples ✦"}</button>
      </form>

      <div className="sample-list-heading">
        <h2>Your samples</h2>
        <span>{samples.length} available</span>
      </div>
      <div className="managed-sample-list">
        {samples.map((sample, index) => (
          <article key={`${sample}-${index}`}>
            <p>{sample}</p>
            <button type="button" aria-label="Delete sample" disabled={busy || samples.length <= 1} onClick={() => removeSample(index)}>🗑️</button>
          </article>
        ))}
      </div>
      <aside className="sample-pool-note">🎲 When a giver accepts your card, one sample is chosen at random and removed from this available list.</aside>
      <p className="form-message" aria-live="polite">{message}</p>
    </>
  );
}
