import type { Metadata } from "next";
import { LeaderboardPanels } from "@/components/LeaderboardPanels";
import { PageContainer } from "@/components/PageContainer";
import { SortTabs } from "@/components/SortTabs";
import {
  getLeaderboardData,
  type LeaderboardPeriod,
} from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Leaderboard",
};

export const revalidate = 30;

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "alltime", label: "All Time" },
];

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

  const { topFlips, topProducers } = await getLeaderboardData(period);

  return (
    <PageContainer>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-text-muted">
              Matchup leaderboard
            </p>
            <h1 className="mt-2 text-[2.2rem] font-semibold tracking-[-0.05em] text-text-primary">
              Leaderboard
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              The strongest flips and producers, ranked by battle results.
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

        <LeaderboardPanels topFlips={topFlips} topProducers={topProducers} />
      </div>
    </PageContainer>
  );
}
