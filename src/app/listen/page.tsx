import type { Metadata } from "next";
import Link from "next/link";
import { SwipeFeed } from "@/components/SwipeFeed";
import {
  getCurrentSession,
  getTodaySample,
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

  // Get submissions sorted by "new" for discovery feed
  const submissions = sample
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
        <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-sm font-bold text-text-primary tracking-tight">
                Discover
              </h1>
              <p className="text-[9px] text-text-secondary mt-0.5 font-mono">
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
              className="text-[9px] font-mono font-bold text-text-secondary hover:text-text-primary transition-colors uppercase tracking-wider"
              style={{ borderRadius: "var(--radius-minimal)" }}
            >
              Today
            </Link>
          </div>
        </div>
      </div>

      {/* Swipe Feed */}
      <SwipeFeed
        submissions={submissions}
        isAuthenticated={isAuthenticated}
        hasSample={!!sample}
      />
    </div>
  );
}
