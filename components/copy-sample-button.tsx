"use client";

import { useState } from "react";
import { UiIcon } from "@/components/ui-icons";

export function CopySampleButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
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
      setFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  }

  return (
    <button className="copy-button" type="button" onClick={copy} aria-label="Copy sample review">
      <UiIcon name="copy" /> {copied ? "Copied" : failed ? "Copy manually" : "Copy"}
    </button>
  );
}
