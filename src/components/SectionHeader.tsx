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
    <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-border">
      <div className="flex items-center gap-2.5">
        <h2 className="text-[11px] font-mono font-bold tracking-[0.16em] uppercase text-text-secondary">
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-[10px] font-mono text-text-secondary bg-surface border border-border px-1.5 py-0.5 tabular-nums font-semibold" style={{ borderRadius: 'var(--radius-minimal)' }}>
            {count}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
