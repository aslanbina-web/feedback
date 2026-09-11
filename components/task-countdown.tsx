"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function TaskCountdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const next = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(next);
      if (next === 0) router.refresh();
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, router]);

  if (remaining === null) return <span className="mono">Calculating time…</span>;
  const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");
  return <span className="mono">Time left: {minutes}:{seconds}</span>;
}
