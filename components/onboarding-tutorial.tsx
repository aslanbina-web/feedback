"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/components/ui-icons";

const slides = [
  {
    icon: "star" as const,
    label: "How GiveGet works",
    title: "Give One. Get One.",
    body: "Complete one helpful review to earn 1 credit. One credit lets your business receive one review.",
    flow: ["Give a review", "+1 credit", "Receive a review"],
  },
  {
    icon: "send" as const,
    label: "Your daily passes",
    title: "Use Today—or Save Them.",
    body: "You receive 1 Give pass and 1 Receive pass each day. Unused passes are saved for later.",
    flow: ["Passes build up", "Use up to 3 each day"],
  },
  {
    icon: "heart" as const,
    label: "Your Free Plan",
    title: "30 Gives + 30 Receives.",
    body: "During each 30-day Free Plan period, you can give up to 30 reviews and receive up to 30 reviews.",
    flow: ["30 given maximum", "30 received maximum"],
  },
];

type TutorialMode = "onboarding" | "preview" | "review";

export function OnboardingTutorial({ mode = "onboarding" }: { mode?: TutorialMode }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const slide = slides[step];

  async function continueSetup() {
    if (step < slides.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    if (mode === "preview") {
      router.push("/preview?screen=edit");
      return;
    }
    if (mode === "review") {
      router.push("/settings");
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch("/api/onboarding/tutorial", { method: "POST" });
    const result = (await response.json().catch(() => null)) as { error?: string; redirectTo?: string } | null;
    if (!response.ok) {
      setBusy(false);
      setError(result?.error || "Could not continue. Please try again.");
      return;
    }
    router.push(result?.redirectTo || "/profile/edit?setup=1");
  }

  return (
    <section className="onboarding-wrap">
      <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${slides.length}`}>
        {slides.map((_, index) => <span className={index <= step ? "active" : ""} key={index} />)}
      </div>
      <article className={`onboarding-card onboarding-step-${step + 1}`} aria-live="polite">
        <div className="onboarding-art"><UiIcon name={slide.icon} /></div>
        <p className="onboarding-label">{slide.label}</p>
        <h1>{slide.title}</h1>
        <p className="onboarding-body">{slide.body}</p>
        <div className="onboarding-flow">
          {slide.flow.map((item, index) => <span key={item}>{item}{index < slide.flow.length - 1 ? <b>↓</b> : null}</span>)}
        </div>
      </article>
      <button className="button green full onboarding-next" type="button" disabled={busy} onClick={continueSetup}>
        {busy ? "Opening setup…" : step === slides.length - 1 ? mode === "review" ? "Back to Settings →" : "Create My Business Card →" : "Next →"}
      </button>
      {step > 0 && !busy ? <button className="text-button" type="button" onClick={() => setStep((current) => current - 1)}>Back</button> : null}
      <p className="form-message" aria-live="polite">{error}</p>
    </section>
  );
}
