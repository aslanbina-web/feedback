"use client";

import { useState } from "react";

export function CopySampleButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button className="copy-button" type="button" onClick={copy} aria-label="Copy sample review">
      <span aria-hidden="true">📋</span> {copied ? "Copied" : "Copy"}
    </button>
  );
}
