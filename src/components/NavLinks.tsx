"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Today" },
  { href: "/listen", label: "Listen" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {NAV_LINKS.map(({ href, label }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            className={`px-2.5 py-1.5 text-[11px] font-mono tracking-[0.12em] transition-all duration-150 border-b-2 ${
              isActive
                ? "bg-surface font-bold text-text-primary border-b-text-primary"
                : "border-b-transparent text-text-secondary hover:bg-surface hover:text-text-primary"
            }`}
            style={{ borderRadius: "var(--radius-minimal)" }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
