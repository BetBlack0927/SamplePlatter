import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { SubmissionCard } from "@/components/SubmissionCard";
import {
  getCurrentSession,
  getLeaderboardData,
} from "@/lib/supabase/queries";
import type { LeaderboardPeriod, ProducerStat } from "@/lib/supabase/queries";
import { SortTabs } from "@/components/SortTabs";

export const metadata: Metadata = {
  title: "Leaderboard",
};

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "alltime", label: "All Time" },
];

const EMPTY_MESSAGES: Record<LeaderboardPeriod, string> = {
  today: "No submissions yet today.",
  week: "No submissions yet this week.",
  alltime: "No submissions yet.",
};

export default async function LeaderboardPage(props: {
  searchParams: Promise<{ period?: string }>;
}) {
  const searchParams = await props.searchParams;
  const rawPeriod = searchParams.period ?? "today";
  const period: LeaderboardPeriod = (["today", "week", "alltime"] as const).includes(
    rawPeriod as LeaderboardPeriod
  )
    ? (rawPeriod as LeaderboardPeriod)
    : "today";

  const session = await getCurrentSession();
  const isAuthenticated = !!session;
  const { topFlips, topProducers } = await getLeaderboardData(
    period,
    session?.user.id
  );

  return (
    <PageContainer>
      <div className="space-y-5">

        {/* ── Header + period tabs ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div>
            <h1 className="text-base font-bold text-text-primary tracking-tight">Leaderboard</h1>
            <p className="text-[10px] font-mono text-text-secondary mt-0.5">
              Top flips and producers ranked by the community.
            </p>
          </div>

          <SortTabs
            current={period}
            options={PERIODS.map(({ id, label }) => ({
              id,
              label,
              href: `/leaderboard?period=${id}`,
            }))}
          />
        </div>

        {/* ── Two-column layout ───────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Left: Top Flips - 70% width */}
          <div className="flex-1 lg:max-w-[70%] min-w-0">
            <SectionHeader title="Top Flips" count={topFlips.length} />
            {topFlips.length === 0 ? (
              <EmptySection message={EMPTY_MESSAGES[period]} />
            ) : (
              <div className="space-y-0.5">
                {topFlips.map((submission, i) => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    rank={i + 1}
                    isAuthenticated={isAuthenticated}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Top Producers - 30% width */}
          <div className="w-full lg:w-[28%] shrink-0">
            <SectionHeader title="Top Producers" count={topProducers.length} />
            {topProducers.length === 0 ? (
              <EmptySection message="No producers yet." />
            ) : (
              <div className="space-y-0.5">
                {topProducers.map((producer, i) => (
                  <ProducerRow
                    key={producer.username}
                    producer={producer}
                    rank={i + 1}
                  />
                ))}
              </div>
            )}
            <p className="text-[9px] font-mono text-text-muted mt-3 pt-2.5 border-t border-border leading-relaxed">
              Ranked by total likes on submissions{" "}
              {period === "today"
                ? "submitted today."
                : period === "week"
                ? "from the last 7 days."
                : "of all time."}
            </p>
          </div>
        </div>

      </div>
    </PageContainer>
  );
}

/* ─── Producer row ──────────────────────────────────────────── */

function ProducerRow({
  producer,
  rank,
}: {
  producer: ProducerStat;
  rank: number;
}) {
  const rankColor =
    rank === 1
      ? "text-text-primary"
      : rank <= 3
      ? "text-text-secondary"
      : "text-text-muted";

  return (
    <Link
      href={`/profile/${producer.username}`}
      className="group flex items-center gap-2.5 px-2.5 py-2 bg-surface hover:bg-surface-elevated border-l-2 border-l-transparent hover:border-l-accent/40 border-y border-y-transparent hover:border-y-border transition-all duration-100"
      style={{ borderRadius: 'var(--radius-minimal)' }}
    >
      <span
        className={`text-[10px] font-mono w-4 text-right shrink-0 tabular-nums font-bold ${rankColor}`}
      >
        {rank}
      </span>
      <div className="w-7 h-7 bg-surface-elevated border border-border shrink-0 flex items-center justify-center" style={{ borderRadius: 'var(--radius-minimal)' }}>
        <span className="text-[8px] font-mono font-bold text-text-muted">
          {producer.username.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-text-primary truncate group-hover:text-white transition-colors leading-tight">
          {producer.display_name}
        </p>
        <div className="flex items-center gap-2.5 mt-0.5">
          <span className="text-[9px] font-mono text-text-secondary font-semibold">
            {producer.total_likes} likes
          </span>
          <span className="text-[9px] font-mono text-text-muted">
            {producer.total_flips} flip{producer.total_flips !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Empty state ───────────────────────────────────────────── */

function EmptySection({ message }: { message: string }) {
  return (
    <div className="py-8 text-center border border-border border-dashed" style={{ borderRadius: 'var(--radius-minimal)' }}>
      <p className="text-[10px] font-mono text-text-muted">{message}</p>
    </div>
  );
}
