"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UiIcon } from "@/components/ui-icons";

const items = [
  { href: "/", label: "Home", icon: "home" as const },
  { href: "/discover", label: "Discover", icon: "search" as const },
  { href: "/queue", label: "Tasks", icon: "tasks" as const },
  { href: "/history", label: "History", icon: "history" as const },
  { href: "/profile", label: "Profile", icon: "profile" as const },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  if (pathname === "/profile/edit") return null;

  return (
    <nav className="nav" aria-label="Main navigation">
      {items.map((item) => {
        const profileChild = ["/samples", "/invite", "/notifications", "/settings"].includes(pathname);
        const current = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href) || (item.href === "/profile" && profileChild);
        const active = pendingHref ? item.href === pendingHref : current;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={active ? "active" : ""}
            aria-current={current ? "page" : undefined}
            aria-busy={pendingHref === item.href && !current ? true : undefined}
            onPointerDown={() => {
              if (!current) {
                setPendingHref(item.href);
                router.prefetch(item.href);
              }
            }}
            onClick={() => {
              if (!current) setPendingHref(item.href);
            }}
          >
            <span className="nav-bubble" aria-hidden="true"><UiIcon name={item.icon} /></span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
