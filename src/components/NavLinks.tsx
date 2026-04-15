"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useTransition } from "react";

const NAV_LINKS = [
  { href: "/", label: "Today" },
  { href: "/listen", label: "Listen" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  // Optimistic pending link — set on click so highlight fires instantly,
  // cleared once pathname catches up after navigation finishes.
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    setPending(null);
  }, [pathname]);

  const handleClick = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    // Only apply transition if not already on the page
    const isCurrentPage = href === "/" ? pathname === "/" : pathname.startsWith(href);
    if (!isCurrentPage) {
      setPending(href);
    }
  };

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
            onClick={(e) => handleClick(href, e)}
            prefetch={true}
            className={`px-2.5 py-1.5 text-[10px] font-mono tracking-wide transition-all duration-150 border-b-2 ${
              active
                ? "text-text-primary font-bold border-b-text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-surface border-b-transparent"
            } ${pending === href && !isRealActive ? "opacity-70" : "opacity-100"}`}
            style={{ borderRadius: 'var(--radius-minimal)' }}
          >
            {label}
          </Link>
        );
      })}
      {isPending && (
        <span className="ml-2 text-[8px] text-text-muted font-mono animate-pulse">
          •
        </span>
      )}
    </nav>
  );
}
