import Link from "next/link";
import type { Sample } from "@/types/database";

interface SampleCardProps {
  sample: Sample;
  submissionCount?: number;
}

/**
 * Card displaying a past daily sample — used on the Explore page.
 */
export function SampleCard({ sample, submissionCount }: SampleCardProps) {
  const date = new Date(sample.active_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/explore/${sample.active_date}`}
      className="group block bg-surface border border-border rounded-sm hover:border-border-focus transition-colors duration-150"
    >
      {/* Artwork */}
      <div className="aspect-square w-full bg-surface-elevated rounded-sm overflow-hidden">
        {sample.artwork_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sample.artwork_url}
            alt={sample.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-text-muted font-mono text-xs tracking-widest">
              NO ART
            </span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="p-3 space-y-1">
        <p className="text-xs font-mono text-text-muted tracking-widest uppercase">
          {date}
        </p>
        <p className="text-sm font-semibold text-text-primary truncate">
          {sample.title}
        </p>
        <p className="text-xs text-text-secondary truncate">{sample.artist}</p>

        <div className="flex items-center gap-3 pt-1">
          {sample.bpm && (
            <span className="text-[10px] font-mono text-text-muted">
              {sample.bpm} BPM
            </span>
          )}
          {sample.key && (
            <span className="text-[10px] font-mono text-text-muted">
              {sample.key}
            </span>
          )}
          {submissionCount !== undefined && (
            <span className="text-[10px] font-mono text-text-muted ml-auto">
              {submissionCount} flips
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
