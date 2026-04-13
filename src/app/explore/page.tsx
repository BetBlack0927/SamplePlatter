import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";
import { getArchiveData, type ArchiveRow, type ArchiveWinner } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Archive",
};

export default async function ExplorePage() {
  const archive = await getArchiveData();

  return (
    <PageContainer>
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-lg font-bold text-text-primary">Archive</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Every sample dropped. Browse past days and hear the top flips.
            </p>
          </div>
          <span className="text-[10px] font-mono text-text-muted">
            {archive.length} {archive.length === 1 ? "drop" : "drops"}
          </span>
        </div>

        {archive.length === 0 ? (
          <EmptyArchive />
        ) : (
          <>
            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[80px_1fr_100px_80px_60px] gap-3 px-3 pb-1 border-b border-border">
              {["Date", "Sample", "Top Flip", "Flips", ""].map((h) => (
                <span
                  key={h}
                  className="text-[9px] font-mono uppercase tracking-widest text-text-secondary"
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Archive rows */}
            <div className="space-y-px">
              {archive.map((row) => (
                <ArchiveRowItem key={row.sample.id} row={row} />
              ))}
            </div>

            <p className="text-center text-[11px] font-mono text-text-muted pt-5 border-t border-border">
              More drops load as the archive grows.
            </p>
          </>
        )}

      </div>
    </PageContainer>
  );
}

/* ─── Archive row ───────────────────────────────────────────── */

function ArchiveRowItem({ row }: { row: ArchiveRow }) {
  const { sample, flipCount, winner } = row;

  return (
    <Link
      href={`/explore/${sample.active_date}`}
      className="group flex sm:grid sm:grid-cols-[80px_1fr_100px_80px_60px] gap-3 items-center px-3 py-2.5 rounded-sm bg-transparent hover:bg-surface border-l-2 border-l-transparent hover:border-l-accent/30 border-y border-y-transparent hover:border-y-border transition-all duration-150 hover:translate-x-0.5"
    >
      {/* Date */}
      <span className="text-xs font-mono text-text-secondary shrink-0 w-16 sm:w-auto">
        {formatDate(sample.active_date)}
      </span>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate leading-tight">
          {sample.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-text-secondary truncate">{sample.artist}</span>
          {sample.bpm && (
            <span className="text-[10px] font-mono text-text-muted">{sample.bpm} BPM</span>
          )}
          {sample.key && (
            <span className="text-[10px] font-mono text-text-muted">{sample.key}</span>
          )}
        </div>
      </div>

      {/* Winner */}
      <div className="hidden sm:block min-w-0">
        <WinnerCell winner={winner} flipCount={flipCount} />
      </div>

      {/* Flip count */}
      <div className="hidden sm:flex items-center gap-1.5">
        <span className="text-xs font-mono font-medium text-text-primary">{flipCount}</span>
        <span className="text-[10px] text-text-muted">flips</span>
      </div>

      {/* Chevron */}
      <div className="hidden sm:flex justify-end">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-text-muted group-hover:text-text-secondary transition-colors"
        >
          <path d="M4.5 2.5l3.5 3.5-3.5 3.5" />
        </svg>
      </div>
    </Link>
  );
}

/* ─── Winner cell ───────────────────────────────────────────── */

function WinnerCell({
  winner,
  flipCount,
}: {
  winner: ArchiveWinner | null;
  flipCount: number;
}) {
  if (flipCount === 0) {
    return (
      <p className="text-[10px] font-mono text-text-muted italic">No flips</p>
    );
  }
  if (!winner) {
    return (
      <p className="text-[10px] font-mono text-text-muted italic">—</p>
    );
  }
  return (
    <>
      <p className="text-[11px] font-mono text-text-secondary truncate">
        @{winner.username}
      </p>
      {winner.submissionTitle && (
        <p className="text-[10px] text-text-secondary truncate">
          {winner.submissionTitle}
        </p>
      )}
    </>
  );
}

/* ─── Empty state ───────────────────────────────────────────── */

function EmptyArchive() {
  return (
    <div className="py-20 flex flex-col items-center gap-2 border border-dashed border-border rounded-sm text-center">
      <p className="text-sm text-text-secondary font-medium">No past drops yet</p>
      <p className="text-xs font-mono text-text-muted">
        Check back after today's sample has passed.
      </p>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────── */

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
