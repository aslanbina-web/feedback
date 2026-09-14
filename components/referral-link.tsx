"use client";

import { useState } from "react";

export function ReferralLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }
  return <div className="referral-box"><code>{url}</code><button type="button" onClick={copy}>{copied ? "Copied!" : "Copy"}</button></div>;
}
