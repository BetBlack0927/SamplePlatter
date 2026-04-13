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
      className={`flex gap-px bg-surface border border-border rounded-sm overflow-hidden shrink-0 ${className ?? ""}`}
    >
      {options.map(({ id, label, href }) => (
        <Link
          key={id}
          href={href}
          onClick={() => setActive(id)}
          className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 transition-colors ${
            active === id
              ? "bg-surface-elevated text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
