"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Today" },
  { href: "/listen", label: "Listen" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  const isPrimaryNavPage =
    pathname === "/" ||
    pathname.startsWith("/listen") ||
    pathname.startsWith("/leaderboard");
  // Optimistic pending link — set on click so highlight fires instantly,
  // and ignored once pathname catches up after navigation finishes.
  const [pending, setPending] = useState<string | null>(null);
  const showPendingIndicator =
    isPrimaryNavPage &&
    pending !== null &&
    !(pending === "/" ? pathname === "/" : pathname.startsWith(pending));

  const handleClick = (href: string) => {
    // Only apply transition if not already on the page
    const isCurrentPage = href === "/" ? pathname === "/" : pathname.startsWith(href);
    if (!isCurrentPage) {
      setPending(href);
    }
  };

  return (
    <nav className="flex items-center gap-1">
      {NAV_LINKS.map(({ href, label }) => {
        const isRealActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        // Pending takes priority; fall back to real pathname match
        const active =
          isPrimaryNavPage &&
          (pending === href || (pending === null && isRealActive));
        return (
          <Link
            key={href}
            href={href}
            onClick={() => handleClick(href)}
            prefetch={true}
            className={`px-2.5 py-1.5 text-[11px] font-mono tracking-[0.12em] transition-all duration-150 border-b-2 ${
              active
                ? "text-text-primary font-bold border-b-text-primary bg-surface"
                : "text-text-secondary hover:text-text-primary hover:bg-surface border-b-transparent"
            } ${pending === href && !isRealActive ? "opacity-70" : "opacity-100"}`}
            style={{ borderRadius: 'var(--radius-minimal)' }}
          >
            {label}
          </Link>
        );
      })}
      {showPendingIndicator && (
        <span className="ml-2 text-[10px] text-text-muted font-mono animate-pulse">
          •
        </span>
      )}
    </nav>
  );
}
