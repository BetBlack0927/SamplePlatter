import type { Metadata } from "next";
import Link from "next/link";
import { SwipeFeed } from "@/components/SwipeFeed";
import {
  getCurrentSession,
  getTodaySample,
  getUnreviewedSubmissions,
  getSubmissionsForSample,
} from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Listen",
};

export default async function ListenPage() {
  const [session, sample] = await Promise.all([
    getCurrentSession(),
    getTodaySample(),
  ]);

  const isAuthenticated = !!session;

  // Get unreviewed submissions for swipe queue
  // Excludes already-reviewed and user's own submissions
  const unreviewedSubmissions = sample
    ? await getUnreviewedSubmissions(sample.id, session?.user.id, true)
    : [];

  // Get total submission count (including reviewed ones) to distinguish empty states
  const totalSubmissions = sample
    ? await getSubmissionsForSample(sample.id, session?.user.id, "new")
    : [];

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const sampleTitle = sample?.title ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Compact context bar */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-3">
          <div
            className="inline-flex items-center gap-2 border border-border bg-surface px-3 py-1.5 text-[11px] font-mono text-text-secondary"
            style={{ borderRadius: "var(--radius-minimal)" }}
          >
            <span>{today}</span>
            {sampleTitle && (
              <>
                <span className="text-text-muted">•</span>
                <Link
                  href="/"
                  className="font-semibold text-text-secondary hover:text-text-primary transition-colors"
                >
                  {sampleTitle}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-7 pb-1 text-center shrink-0">
        <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.24em] text-text-muted">
          Today&apos;s flips
        </p>
        <h1 className="text-[1.75rem] font-bold uppercase tracking-[0.24em] text-text-primary sm:text-[2.1rem]">
          Discover
        </h1>
      </div>

      {/* Swipe Feed */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <SwipeFeed
          submissions={unreviewedSubmissions}
          totalSubmissionCount={totalSubmissions.length}
          isAuthenticated={isAuthenticated}
          hasSample={!!sample}
        />
      </div>
    </div>
  );
}
