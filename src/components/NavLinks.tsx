"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/", label: "Today" },
  { href: "/listen", label: "Listen" },
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
    <nav className="flex items-center gap-0.5">
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
            className={`px-2.5 py-1.5 text-[10px] font-mono tracking-wide transition-colors border-b-2 ${
              active
                ? "text-text-primary font-bold border-b-text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-surface border-b-transparent"
            }`}
            style={{ borderRadius: 'var(--radius-minimal)' }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
