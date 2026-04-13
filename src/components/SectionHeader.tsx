interface SectionHeaderProps {
  title: string;
  count?: number;
  action?: React.ReactNode;
}

/**
 * Labelled section divider with optional count badge and action slot.
 */
export function SectionHeader({ title, count, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-mono font-semibold tracking-[0.15em] uppercase text-text-secondary">
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-xs font-mono text-text-muted bg-surface border border-border rounded px-1.5 py-0.5">
            {count}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
