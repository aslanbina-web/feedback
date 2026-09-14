"use client";

import { useState } from "react";
import { ReviewSteps } from "@/components/review-steps";
import { TaskCountdown } from "@/components/task-countdown";
import { TaskSubmitForm } from "@/components/task-submit-form";
import { UiIcon } from "@/components/ui-icons";
import Image from "next/image";
import { getBusinessCategory } from "@/lib/business-categories";

type Props = {
  taskId: string;
  expiresAt: string;
  reviewUrl: string;
  sampleText: string | null;
  businessName: string;
  category: string;
  city: string;
  district: string;
  initialSubmitStep?: boolean;
};

export function TaskReviewFlow({ taskId, expiresAt, reviewUrl, sampleText, businessName, category, city, district, initialSubmitStep = false }: Props) {
  const [submitStep, setSubmitStep] = useState(initialSubmitStep);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  function advanceToSubmit() {
    setSubmitStep(true);
    const url = new URL(window.location.href);
    url.searchParams.set("step", "submit");
    window.history.replaceState(window.history.state, "", url);
  }

  async function copyText(text: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copiedText = document.execCommand("copy");
    field.remove();
    if (!copiedText) throw new Error("Copy failed");
  }

  async function copyAndOpen() {
    const mapsTab = window.open("about:blank", "_blank");
    if (mapsTab) mapsTab.opener = null;
    advanceToSubmit();
    try {
      if (sampleText) await copyText(sampleText);
      setCopied(Boolean(sampleText));
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
    if (mapsTab) mapsTab.location.replace(reviewUrl);
    else window.location.assign(reviewUrl);
  }

  if (submitStep) {
    return <div className="workflow"><TaskCountdown expiresAt={expiresAt} /><ReviewSteps active={3} /><h3>Submit Your Review</h3>{copied ? <p className="success-note" aria-live="polite">✓ Sample copied — paste it into Google Maps.</p> : null}{copyError ? <p className="notice" role="alert">Automatic copy was blocked. Return to Review and press and hold the sample text to copy it.</p> : null}<p className="lede blue">Find your posted review on Google Maps. Tap the three-dot menu beside your own review, then copy its link.</p><div className="google-review"><div className="google-avatar">T</div><div><strong>Your profile</strong><small>Your Google Maps review</small></div><b>⋮</b><div className="google-stars">★★★★★ <small>just now</small></div><p>Your posted review appears here. Tap the dots beside it to copy the link. <span>More</span></p></div><TaskSubmitForm taskId={taskId} /></div>;
  }

  return <div className="workflow">
    <TaskCountdown expiresAt={expiresAt} />
    <ReviewSteps active={2} />
    <article className="revealed-business">
      <Image src={getBusinessCategory(category).image} alt="" width={112} height={94} />
      <div><h2>{businessName}</h2><span className="category-pill">{getBusinessCategory(category).name}</span><strong><UiIcon name="pin" />{city} · {district}</strong><a href={reviewUrl} target="_blank" rel="noreferrer"><UiIcon name="pin" />View on Google Maps <UiIcon name="external" /></a></div>
    </article>
    <div className="review-sample">
      <div><h2>Sample Review</h2></div>
      <p>{sampleText || "Write an honest review based on your experience."}</p>
    </div>
    <button className="button green full" type="button" onClick={copyAndOpen}>Copy &amp; Go to Google Maps <UiIcon name="external" /></button>
    {copied ? <p className="success-note" aria-live="polite">✓ Copied — paste it into Google Maps.</p> : null}
    {copyError ? <p className="notice" role="alert">Automatic copy was blocked. Press and hold the sample text to copy it.</p> : null}
    <button className="button white full" type="button" onClick={advanceToSubmit}>I’ve Posted My Review ✓</button>
  </div>;
}
