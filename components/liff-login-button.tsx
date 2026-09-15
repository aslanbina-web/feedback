"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "ready" | "error";

function cleanReferralCode(value?: string | null) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
}

export function LiffLoginButton({ liffId, referralCode }: { liffId: string; referralCode?: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [activeReferralCode, setActiveReferralCode] = useState(() => cleanReferralCode(referralCode));

  useEffect(() => {
    let cancelled = false;

    async function finishLogin(restoredReferralCode?: string) {
      const liff = (await import("@line/liff")).default;
      const idToken = liff.getIDToken();
      const accessToken = liff.getAccessToken();
      if (!idToken || !accessToken) {
        if (!cancelled) setStatus("ready");
        return;
      }
      const carriedReferralCode = cleanReferralCode(
        restoredReferralCode || new URLSearchParams(window.location.search).get("ref") || referralCode,
      );
      const res = await fetch("/api/auth/line/liff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken, accessToken, referralCode: carriedReferralCode || undefined }),
      });
      if (res.ok) {
        const body = (await res.json()) as { redirectTo?: string };
        window.location.href = body.redirectTo || "/onboarding";
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!cancelled) {
        setError("LINE login could not be completed. Please try again.");
        setStatus("error");
      }
    }

    async function init() {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });
        const restoredReferralCode = cleanReferralCode(new URLSearchParams(window.location.search).get("ref"));
        if (restoredReferralCode) setActiveReferralCode(restoredReferralCode);
        if (liff.isLoggedIn()) {
          await finishLogin(restoredReferralCode);
        } else if (!cancelled) {
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("ready");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liffId]);

  if (status === "loading") return null;

  const liffUrl = `https://liff.line.me/${liffId}/${activeReferralCode ? `?ref=${encodeURIComponent(activeReferralCode)}` : ""}`;

  // A real, direct <a href> tap on LINE's own liff.line.me domain -- not a
  // JS-triggered liff.login() call -- for the same reason the classic OAuth
  // link had to become a direct link instead of a server redirect: iOS only
  // reliably opens the LINE app on a genuine direct navigation, not one
  // triggered by code.
  return (
    <>
      {error ? <div className="notice">{error}</div> : null}
      <a className="button line-button full" href={liffUrl}>
        Continue with LINE
      </a>
    </>
  );
}
