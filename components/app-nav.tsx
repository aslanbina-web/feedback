"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const items = [
  { href: "/", label: "Home", emoji: "🏠" },
  { href: "/discover", label: "Discover", emoji: "🔎" },
  { href: "/queue", label: "Tasks", emoji: "✅" },
  { href: "/history", label: "History", emoji: "📒" },
  { href: "/profile", label: "Profile", emoji: "🙂" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const item of items) {
      if (item.href !== pathname) router.prefetch(item.href);
    }
  }, [pathname, router]);

  if (pathname === "/profile/edit") return null;

  return (
    <nav className="nav" aria-label="Main navigation">
      {items.map((item) => {
        const profileChild = ["/samples", "/invite", "/notifications", "/settings"].includes(pathname);
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href) || (item.href === "/profile" && profileChild);
        return (
          <Link key={item.href} href={item.href} prefetch className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <span className="nav-bubble" aria-hidden="true">{item.emoji}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
