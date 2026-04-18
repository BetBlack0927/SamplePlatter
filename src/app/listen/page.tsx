import type { Metadata } from "next";
import Link from "next/link";
import { BattleArena } from "@/components/BattleArena";
import { pickNextBattleMatchup } from "@/lib/battles";
import {
  getBattleCandidates,
  getCurrentSession,
  getSeenBattlePairKeys,
  getTodaySample,
} from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Listen",
};

export default async function ListenPage() {
  const [session, sample] = await Promise.all([
    getCurrentSession(),
    getTodaySample(),
  ]);

  const battleCandidates = sample
    ? await getBattleCandidates(sample.id, session?.user.id)
    : [];
  const seenBattlePairKeys = await getSeenBattlePairKeys(
    battleCandidates.map((submission) => submission.id),
    session?.user.id
  );

  const initialMatchup = pickNextBattleMatchup(battleCandidates, {
    seenPairKeys: seenBattlePairKeys,
  });
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(new Date());

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_30%)]">
      <div className="shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-3">
          <div
            className="inline-flex items-center gap-2 border border-border bg-surface px-3 py-1.5 text-[11px] font-mono text-text-secondary"
            style={{ borderRadius: "999px" }}
          >
            <span>{dateLabel}</span>
            {sample?.title ? (
              <>
                <span className="text-text-muted">/</span>
                <Link
                  href="/"
                  className="font-semibold text-text-secondary transition-colors hover:text-text-primary"
                >
                  {sample.title}
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="shrink-0 px-4 pb-2 pt-4 text-center sm:pb-3 sm:pt-5">
        <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-text-muted">
          Battle arena
        </p>
        <h1 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.06em] text-text-primary sm:text-[2.05rem]">
          Which flip wins?
        </h1>
        <p className="mt-1 text-sm text-text-secondary">Pick the stronger flip</p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <BattleArena
          sampleId={sample?.id ?? null}
          sampleTitle={sample?.title ?? null}
          sampleArtworkUrl={sample?.artwork_url ?? null}
          submissions={battleCandidates}
          initialMatchup={initialMatchup}
          initialSeenPairKeys={seenBattlePairKeys}
          isAuthenticated={!!session}
          viewerUserId={session?.user.id ?? null}
        />
      </div>
    </div>
  );
}
