"use client";

import { useState } from "react";
import type { Submission } from "@/types/database";
import { SwipeCard } from "./SwipeCard";
import Link from "next/link";

interface SwipeFeedProps {
  submissions: Submission[];
  isAuthenticated: boolean;
  hasSample: boolean;
}

export function SwipeFeed({ submissions, isAuthenticated, hasSample }: SwipeFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewedCount, setViewedCount] = useState(0);

  const handleSwipe = (liked: boolean, success: boolean) => {
    // Only advance if the action succeeded
    if (success) {
      setViewedCount((prev) => prev + 1);
      setCurrentIndex((prev) => prev + 1);
    }
    // If failed, stay on current card (user can retry)
  };

  const currentSubmission = submissions[currentIndex];
  const hasMore = currentIndex < submissions.length - 1;

  // Empty state
  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="space-y-3 max-w-sm">
          <p className="text-base font-bold text-text-primary">
            {hasSample ? "No flips yet" : "No sample today"}
          </p>
          <p className="text-xs text-text-secondary">
            {hasSample
              ? isAuthenticated
                ? "Be the first to flip today's sample."
                : "Sign in and be the first to submit."
              : "Check back once today's sample is posted."}
          </p>
          {hasSample && (
            <Link
              href="/"
              className="inline-block mt-3 text-[10px] font-mono font-bold text-text-primary hover:text-white transition-colors uppercase tracking-wide underline underline-offset-2"
            >
              {isAuthenticated ? "Upload your flip →" : "Sign in →"}
            </Link>
          )}
        </div>
      </div>
    );
  }

  // All done state
  if (!currentSubmission) {
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
              {submissions.length > 0 ? "You're caught up" : "No flips yet"}
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              {submissions.length > 0
                ? "You've listened to all available flips for today."
                : "Be the first to submit a flip for today's sample."}
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
              {submissions.length > 0 ? "Back to today" : "Submit a flip"}
            </Link>
          </div>
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
