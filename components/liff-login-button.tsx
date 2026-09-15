"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "ready" | "signing-in" | "error";

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
        window.location.href = "/discover";
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

  async function handleClick() {
    setStatus("signing-in");
    const liff = (await import("@line/liff")).default;
    liff.login({ redirectUri: window.location.href });
  }

  if (status === "loading") return null;

  return (
    <>
      {error ? <div className="notice">{error}</div> : null}
      <button type="button" className="button line-button full" onClick={handleClick} disabled={status === "signing-in"}>
        {status === "signing-in" ? "Signing in…" : "Continue with LINE"}
      </button>
    </>
  );
}
