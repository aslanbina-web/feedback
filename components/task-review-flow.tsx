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
};

export function TaskReviewFlow({ taskId, expiresAt, reviewUrl, sampleText, businessName, category, city, district }: Props) {
  const [submitStep, setSubmitStep] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyAndOpen() {
    window.open(reviewUrl, "_blank", "noopener,noreferrer");
    if (sampleText) {
      await navigator.clipboard.writeText(sampleText);
      setCopied(true);
    }
  }

  if (submitStep) {
    return <div className="workflow"><TaskCountdown expiresAt={expiresAt} /><ReviewSteps active={3} /><h3>Submit Your Review</h3><p className="lede blue">Find your posted review on Google Maps. Tap the three-dot menu beside your own review, then copy its link.</p><div className="google-review"><div className="google-avatar">T</div><div><strong>Your profile</strong><small>Your Google Maps review</small></div><b>⋮</b><div className="google-stars">★★★★★ <small>just now</small></div><p>Your posted review appears here. Tap the dots beside it to copy the link. <span>More</span></p></div><TaskSubmitForm taskId={taskId} /></div>;
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
    {copied ? <p className="success-note">✓ Copied — paste it into Google Maps.</p> : null}
    <button className="button white full" type="button" onClick={() => setSubmitStep(true)}>I’ve Posted My Review ✓</button>
  </div>;
}
