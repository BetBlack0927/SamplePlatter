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
    <div className="min-h-screen">
      {/* Minimal header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-text-primary tracking-tight">
                Discover
              </h1>
              <p className="text-[11px] text-text-secondary mt-1 font-mono">
                {today}
                {sampleTitle && (
                  <>
                    {" · "}
                    <Link
                      href="/"
                      className="hover:text-text-primary transition-colors font-semibold"
                    >
                      {sampleTitle}
                    </Link>
                  </>
                )}
              </p>
            </div>

            <Link
              href="/"
              className="text-[11px] font-mono font-bold text-text-secondary hover:text-text-primary transition-colors tracking-[0.12em]"
              style={{ borderRadius: "var(--radius-minimal)" }}
            >
              Today
            </Link>
          </div>
        </div>
      </div>

      {/* Swipe Feed */}
      <SwipeFeed
        submissions={unreviewedSubmissions}
        totalSubmissionCount={totalSubmissions.length}
        isAuthenticated={isAuthenticated}
        hasSample={!!sample}
      />
    </div>
  );
}
