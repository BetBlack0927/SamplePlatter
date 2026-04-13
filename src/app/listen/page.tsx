import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { SubmissionCard } from "@/components/SubmissionCard";
import {
  getCurrentSession,
  getTodaySample,
  getSubmissionsForSample,
} from "@/lib/supabase/queries";
import type { SubmissionSort } from "@/lib/supabase/queries";
import { SortTabs } from "@/components/SortTabs";

export const metadata: Metadata = {
  title: "Listen",
};

export default async function ListenPage(props: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const searchParams = await props.searchParams;
  const sort: SubmissionSort =
    searchParams.sort === "new" ? "new" : "top";

  const [session, sample] = await Promise.all([
    getCurrentSession(),
    getTodaySample(),
  ]);

  const isAuthenticated = !!session;

  const submissions = sample
    ? await getSubmissionsForSample(sample.id, session?.user.id, sort)
    : [];

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const sampleTitle = sample?.title ?? null;

  return (
    <PageContainer>
      <div className="space-y-4">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-text-primary">
              Today&apos;s Flips
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {today}
              {sampleTitle && (
                <>
                  {" · "}
                  <Link
                    href="/"
                    className="hover:text-accent transition-colors"
                  >
                    {sampleTitle}
                  </Link>
                  {sample?.artist && ` · ${sample.artist}`}
                </>
              )}
            </p>
          </div>

          <SortTabs
            current={sort}
            options={[
              { id: "top", label: "Top", href: "/listen?sort=top" },
              { id: "new", label: "New", href: "/listen?sort=new" },
            ]}
          />
        </div>

        {/* Feed */}
        <div>
          <SectionHeader
            title="Submissions"
            count={submissions.length}
          />

          {submissions.length === 0 ? (
            <EmptyState hasSample={!!sample} isAuthenticated={isAuthenticated} />
          ) : (
            <div className="space-y-1">
              {submissions.map((s, i) => (
                <SubmissionCard
                  key={s.id}
                  submission={s}
                  rank={i + 1}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-4 pb-2 border-t border-border">
          {isAuthenticated ? (
            <p className="text-xs text-text-muted">
              {sample ? (
                <>
                  Like tracks above, or{" "}
                  <Link
                    href="/"
                    className="text-accent hover:text-accent/80 transition-colors"
                  >
                    go submit your flip →
                  </Link>
                </>
              ) : (
                "No sample today — check back tomorrow."
              )}
            </p>
          ) : (
            <p className="text-xs text-text-muted">
              <Link
                href="/sign-in"
                className="text-text-secondary hover:text-accent transition-colors underline underline-offset-2"
              >
                Sign in
              </Link>{" "}
              to like tracks and submit your own flip.
            </p>
          )}
        </div>

      </div>
    </PageContainer>
  );
}

/* ─── Empty state ────────────────────────────────────────────── */

function EmptyState({
  hasSample,
  isAuthenticated,
}: {
  hasSample: boolean;
  isAuthenticated: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 border border-border border-dashed rounded-sm text-center">
      <p className="text-sm text-text-secondary font-medium">
        {hasSample ? "No flips yet" : "No sample today"}
      </p>
      <p className="text-xs font-mono text-text-muted max-w-[22rem]">
        {hasSample
          ? isAuthenticated
            ? "Be the first to flip today's sample."
            : "Sign in and be the first to submit."
          : "Check back once today's sample is posted."}
      </p>
      {hasSample && (
        <Link
          href="/"
          className="mt-3 text-[11px] font-mono text-accent hover:text-accent/80 transition-colors"
        >
          {isAuthenticated ? "Upload your flip →" : "Sign in →"}
        </Link>
      )}
    </div>
  );
}
