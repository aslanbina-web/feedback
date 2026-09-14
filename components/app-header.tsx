"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UiIcon } from "@/components/ui-icons";

export function AppHeader({ credits }: { credits: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const detail = pathname.startsWith("/discover/") || pathname.startsWith("/queue/");
  const backOnly = pathname === "/invite" || pathname === "/samples" || pathname === "/notifications" || pathname === "/settings" || pathname === "/profile/edit";
  const showBack = detail || backOnly;
  const showBell = pathname === "/queue";
  const showSettings = pathname === "/profile";
  const showCredits = pathname === "/discover" || pathname === "/history" || detail;
  const pageTitle = pathname === "/notifications" ? "Notifications" : pathname === "/settings" ? "Settings" : "GiveGet";

  return (
    <header className={`masthead${["/samples", "/invite", "/notifications", "/settings", "/profile/edit"].includes(pathname) ? " secondary-page-header" : ""}`}>
      {showBack ? <button className="back-button" type="button" aria-label="Go back" onClick={() => router.back()}><UiIcon name="back" /></button> : null}
      {pageTitle === "GiveGet" ? <Link className="brand" href="/">GiveGet</Link> : <span className="brand">{pageTitle}</span>}
      <div className="header-actions">
        {showBell ? <Link className="header-icon" href="/notifications" aria-label="Notifications"><UiIcon name="bell" /></Link> : null}
        {showSettings ? <Link className="header-icon profile-settings-icon" href="/settings" aria-label="Settings"><UiIcon name="settings" /></Link> : null}
        {showCredits ? <div className="credits"><UiIcon name="star" /><strong>{credits}</strong><span className="eyebrow">credits</span></div> : null}
      </div>
    </header>
  );
}
