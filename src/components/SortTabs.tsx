"use client";

import Link from "next/link";
import { useState } from "react";

export interface TabOption {
  id: string;
  label: string;
  href: string;
}

interface SortTabsProps {
  options: TabOption[];
  /** Current active tab id (server-derived, used for initial state) */
  current: string;
  className?: string;
}

/**
 * Generic tab strip that switches visual state INSTANTLY on click while
 * the server-side navigation happens in the background.
 *
 * Technique: local `useState` initialised from the server `current` prop.
 * Clicking updates the optimistic value immediately before the Link
 * navigation resolves, so there is zero visible lag.
 */
export function SortTabs({ options, current, className }: SortTabsProps) {
  const [active, setActive] = useState(current);

  return (
    <div
      className={`flex gap-0.5 bg-surface border border-border overflow-hidden shrink-0 ${className ?? ""}`}
      style={{ borderRadius: 'var(--radius-minimal)' }}
    >
      {options.map(({ id, label, href }) => (
        <Link
          key={id}
          href={href}
          prefetch={true}
          onClick={() => setActive(id)}
          className={`text-[11px] font-mono tracking-[0.12em] px-3 py-2 transition-colors font-semibold ${
            active === id
              ? "bg-text-primary text-black"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
