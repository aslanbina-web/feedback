"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BUSINESS_CATEGORIES, getBusinessCategory, isBusinessCategory } from "@/lib/business-categories";

type Business = { id?: string; name?: string; category?: string; city?: string; district?: string; generic_description?: string; review_url?: string; active?: boolean; business_review_samples?: { id: string; sample_text: string; created_at: string }[] } | null;

export function ProfileForm({ business, preview = false, mode = "full" }: { business: Business; preview?: boolean; mode?: "full" | "samples" }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState(() => getBusinessCategory(business?.category).name);
  const [location, setLocation] = useState(() => [business?.city, business?.district].filter(Boolean).join(" · "));
  const [samples, setSamples] = useState(() =>
    business?.business_review_samples?.map((sample) => sample.sample_text) ?? [""]
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) {
      setMessage("Preview only — no information was saved.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const locationParts = String(form.get("location") || "").split(/\s*[·,]\s*/).filter(Boolean);
    const response = await fetch("/api/business", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(form.entries()),
        city: mode === "samples" ? form.get("city") : locationParts[0] || "",
        district: mode === "samples" ? form.get("district") : locationParts.slice(1).join(" · ") || "",
        active: form.get("active") === "true",
        sampleReviews: samples,
      }),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Card saved." : result.error || "Could not save card.");
    if (response.ok) {
      router.refresh();
      if (mode === "full") router.push("/profile");
    }
  }

  return (
    <form className={mode === "full" ? "business-card-form" : "form-grid"} onSubmit={save}>
      {mode === "samples" ? <>
        <input type="hidden" name="name" value={business?.name || ""} />
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="city" value={business?.city || ""} />
        <input type="hidden" name="district" value={business?.district || ""} />
        <input type="hidden" name="genericDescription" value={business?.generic_description || ""} />
        <input type="hidden" name="reviewUrl" value={business?.review_url || ""} />
        {business?.active !== false ? <input type="hidden" name="active" value="true" /> : null}
      </> : <>
        <label>Business niche
          <select name="category" value={category} onChange={(event) => {
            if (isBusinessCategory(event.target.value)) setCategory(event.target.value);
          }} required>
            {BUSINESS_CATEGORIES.map((item) => <option value={item.name} key={item.name}>{item.name}</option>)}
          </select>
        </label>
        <div className="business-category-preview">
          <div className="business-category-art" aria-hidden="true" />
          <div><strong>{category}</strong><span>A matching category image is applied automatically.</span></div>
        </div>
        <label>Business name<input name="name" defaultValue={business?.name} required maxLength={120} /></label>
        <label>City / district<input name="location" value={location} onChange={(event) => setLocation(event.target.value)} required maxLength={161} placeholder="Taichung · Nantun" /></label>
        <label>Generic description<textarea name="genericDescription" defaultValue={business?.generic_description} required maxLength={280} placeholder="A short description of your business." /></label>
        <label>Google Maps review URL<input name="reviewUrl" type="url" defaultValue={business?.review_url} required placeholder="https://g.page/r/example/review" /></label>
        <input type="hidden" name="active" value={business?.active === false ? "false" : "true"} />
      </>}
      {mode === "samples" ? <fieldset className="sample-fieldset">
        <legend>Add Sample Reviews You Prefer for Your Shop</legend>
        <p className="privacy-note">Add as many as you want. One random sample is removed and paired when someone accepts your card.</p>
        {samples.map((sample, index) => (
          <div className="sample-editor" key={index}>
            <textarea
              aria-label={`Sample review ${index + 1}`}
              maxLength={500}
              required
              value={sample}
              onChange={(event) => setSamples((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))}
              placeholder="Write a sample review the giver can adapt."
            />
            <button
              className="button alt sample-remove"
              type="button"
              disabled={samples.length === 1}
              onClick={() => setSamples((current) => current.filter((_, itemIndex) => itemIndex !== index))}
            >Remove</button>
          </div>
        ))}
        <button className="button alt" type="button" onClick={() => setSamples((current) => [...current, ""])}>+ Add another sample</button>
      </fieldset> : null}
      <button className="button green">{preview ? "Preview save" : mode === "samples" ? "Save Sample Reviews" : "Save My Card ✦"}</button>
      <span className="form-message" aria-live="polite">{message}</span>
    </form>
  );
}
