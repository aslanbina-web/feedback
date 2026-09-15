"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "ready" | "error";

export function LiffLoginButton({ liffId }: { liffId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finishLogin() {
      const liff = (await import("@line/liff")).default;
      const idToken = liff.getIDToken();
      const accessToken = liff.getAccessToken();
      if (!idToken || !accessToken) {
        if (!cancelled) setStatus("ready");
        return;
      }
      const res = await fetch("/api/auth/line/liff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken, accessToken }),
      });
      if (res.ok) {
        const body = (await res.json()) as { redirectTo?: string };
        window.location.href = body.redirectTo || "/onboarding";
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!cancelled) {
        setError(
          body?.error === "official_account_required"
            ? "Add our Official LINE first, then return and sign in."
            : "LINE login could not be completed. Please try again.",
        );
        setStatus("error");
      }
    }

    async function init() {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });
        if (liff.isLoggedIn()) {
          await finishLogin();
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

  // A real, direct <a href> tap on LINE's own liff.line.me domain -- not a
  // JS-triggered liff.login() call -- for the same reason the classic OAuth
  // link had to become a direct link instead of a server redirect: iOS only
  // reliably opens the LINE app on a genuine direct navigation, not one
  // triggered by code.
  return (
    <>
      {error ? <div className="notice">{error}</div> : null}
      <a className="button line-button full" href={`https://liff.line.me/${liffId}`}>
        Continue with LINE
      </a>
    </>
  );
}
