"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Submission } from "@/types/database";
import { SwipeCard } from "./SwipeCard";
import Link from "next/link";

interface SwipeFeedProps {
  submissions: Submission[];
  totalSubmissionCount: number;
  isAuthenticated: boolean;
  hasSample: boolean;
  sampleId?: string;
}

export function SwipeFeed({ 
  submissions, 
  totalSubmissionCount,
  isAuthenticated, 
  hasSample,
  sampleId,
}: SwipeFeedProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localQueue, setLocalQueue] = useState(submissions);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update local queue when submissions prop changes
  useEffect(() => {
    setLocalQueue(submissions);
    setCurrentIndex(0);
  }, [submissions]);

  const handleSwipe = async (liked: boolean, success: boolean) => {
    // Only advance if the action succeeded
    if (success) {
      const newIndex = currentIndex + 1;
      
      // Check if we just reviewed the last card in local queue
      if (newIndex >= localQueue.length) {
        // Refresh from server to check if more submissions appeared
        setIsRefreshing(true);
        router.refresh();
        // Router refresh will re-fetch and update submissions prop
        // useEffect will reset the queue
      } else {
        // More cards in local queue, advance normally
        setCurrentIndex(newIndex);
      }
    }
    // If failed, stay on current card (user can retry)
  };

  const currentSubmission = localQueue[currentIndex];
  const hasMore = currentIndex < localQueue.length - 1;

  // Determine empty state based on total submissions vs unreviewed
  const noSubmissionsExist = totalSubmissionCount === 0;
  const allReviewed = totalSubmissionCount > 0 && localQueue.length === 0;
  const showCard = localQueue.length > 0 && currentSubmission;

  // State A: No submissions exist at all for today's sample
  if (noSubmissionsExist && !hasSample) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="space-y-3 max-w-sm">
          <p className="text-base font-bold text-text-primary">
            No sample today
          </p>
          <p className="text-xs text-text-secondary">
            Check back once today&apos;s sample is posted.
          </p>
        </div>
      </div>
    );
  }

  // State A: No submissions exist for today's sample yet
  if (noSubmissionsExist && hasSample) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="space-y-3 max-w-sm">
          <p className="text-base font-bold text-text-primary">
            No flips yet
          </p>
          <p className="text-xs text-text-secondary">
            {isAuthenticated
              ? "Be the first to flip today's sample."
              : "Sign in and be the first to submit."}
          </p>
          <Link
            href="/"
            className="inline-block mt-3 text-[10px] font-mono font-bold text-text-primary hover:text-white transition-colors uppercase tracking-wide underline underline-offset-2"
          >
            {isAuthenticated ? "Upload your flip →" : "Sign in →"}
          </Link>
        </div>
      </div>
    );
  }

  // State B: Submissions exist, but user has reviewed them all
  if (allReviewed || (localQueue.length > 0 && !currentSubmission)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="space-y-4 max-w-sm">
          <div
            className="w-16 h-16 mx-auto bg-surface-elevated border border-border-focus flex items-center justify-center mb-2"
            style={{ borderRadius: "var(--radius-minimal)" }}
          >
            <CheckIcon />
          </div>
          <div className="space-y-2">
            <p className="text-base font-bold text-text-primary">
              You&apos;re caught up
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              You&apos;ve listened to all available flips for today.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/leaderboard"
              className="inline-block px-4 py-2 text-[10px] font-mono font-bold text-text-secondary hover:text-text-primary border border-border hover:border-border-focus transition-colors uppercase tracking-wide bg-surface hover:bg-surface-elevated"
              style={{ borderRadius: "var(--radius-minimal)" }}
            >
              Leaderboard
            </Link>
            <Link
              href="/"
              className="inline-block px-4 py-2 text-[10px] font-mono font-bold text-text-primary hover:text-white transition-colors uppercase tracking-wide underline underline-offset-2"
            >
              Back to today
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State C: Show loading while refreshing
  if (isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="space-y-3 max-w-sm">
          <p className="text-sm text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // State C: Unreviewed submissions exist, show current card
  if (!showCard) {
    // Safety fallback - shouldn't reach here
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="space-y-3 max-w-sm">
          <p className="text-base font-bold text-text-primary">
            Something went wrong
          </p>
          <Link
            href="/"
            className="inline-block mt-3 text-[10px] font-mono font-bold text-text-primary hover:text-white transition-colors uppercase tracking-wide underline underline-offset-2"
          >
            Back to today
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      {/* Current Card */}
      <SwipeCard
        submission={currentSubmission}
        isAuthenticated={isAuthenticated}
        onSwipe={handleSwipe}
      />

      {/* Footer Hint */}
      {!isAuthenticated && (
        <div className="text-center mt-12">
          <p className="text-[10px] font-mono text-text-muted">
            <Link
              href="/sign-in"
              className="text-text-secondary hover:text-text-primary transition-colors font-semibold"
            >
              Sign in
            </Link>{" "}
            to like tracks and submit your own.
          </p>
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-text-primary"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
