"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/", label: "Today" },
  { href: "/listen", label: "Listen" },
  { href: "/explore", label: "Archive" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  // Optimistic pending link — set on click so highlight fires instantly,
  // cleared once pathname catches up after navigation finishes.
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    setPending(null);
  }, [pathname]);

  return (
    <nav className="flex items-center gap-1 flex-1">
      {NAV_LINKS.map(({ href, label }) => {
        const isRealActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        // Pending takes priority; fall back to real pathname match
        const active = pending === href || (pending === null && isRealActive);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setPending(href)}
            className={`px-3 py-1.5 text-xs font-mono tracking-wide rounded-sm transition-colors ${
              active
                ? "text-accent font-semibold"
                : "text-text-secondary hover:text-text-primary hover:bg-surface"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
