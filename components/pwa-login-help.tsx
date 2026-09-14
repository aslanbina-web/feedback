"use client";

import { useEffect, useState } from "react";

type StandaloneNavigator = Navigator & { standalone?: boolean };

export function PwaLoginHelp() {
  const [needsHelp, setNeedsHelp] = useState(false);

  useEffect(() => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as StandaloneNavigator).standalone);
    setNeedsHelp(isIos && isStandalone);
  }, []);

  if (!needsHelp) return null;
  return <div className="notice pwa-login-help"><strong>Signing in on iPhone?</strong><br />LINE may finish in Safari. For the most reliable first login, sign in in Safari, then add GiveGet to your Home Screen.</div>;
}
