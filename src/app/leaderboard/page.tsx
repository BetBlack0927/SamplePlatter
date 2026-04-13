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
      <div className="space-y-8">

        {/* ── Header + period tabs ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-text-primary">Leaderboard</h1>
            <p className="text-xs text-text-secondary mt-0.5">
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
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Left: Top Flips */}
          <div className="flex-1 min-w-0">
            <SectionHeader title="Top Flips" count={topFlips.length} />
            {topFlips.length === 0 ? (
              <EmptySection message={EMPTY_MESSAGES[period]} />
            ) : (
              <div className="space-y-1">
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

          {/* Right: Top Producers */}
          <div className="w-full lg:w-72 shrink-0">
            <SectionHeader title="Top Producers" count={topProducers.length} />
            {topProducers.length === 0 ? (
              <EmptySection message="No producers yet." />
            ) : (
              <div className="space-y-px">
                {topProducers.map((producer, i) => (
                  <ProducerRow
                    key={producer.username}
                    producer={producer}
                    rank={i + 1}
                  />
                ))}
              </div>
            )}
            <p className="text-[10px] font-mono text-text-muted mt-4 pt-3 border-t border-border leading-relaxed">
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
      ? "text-accent"
      : rank <= 3
      ? "text-text-secondary"
      : "text-text-muted";

  return (
    <Link
      href={`/profile/${producer.username}`}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-surface border border-transparent hover:border-border transition-all"
    >
      <span
        className={`text-[11px] font-mono w-4 text-right shrink-0 tabular-nums ${rankColor}`}
      >
        {rank}
      </span>
      <div className="w-8 h-8 rounded-sm bg-surface border border-border shrink-0 flex items-center justify-center">
        <span className="text-[9px] font-mono font-bold text-text-secondary">
          {producer.username.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-primary truncate group-hover:text-accent transition-colors leading-tight">
          {producer.display_name}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] font-mono text-text-secondary">
            {producer.total_likes} likes
          </span>
          <span className="text-[10px] font-mono text-text-muted">
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
    <div className="py-10 text-center border border-border border-dashed rounded-sm">
      <p className="text-xs font-mono text-text-muted">{message}</p>
    </div>
  );
}
