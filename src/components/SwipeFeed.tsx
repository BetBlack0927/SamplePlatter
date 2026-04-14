"use client";

import { useState, useEffect, useRef } from "react";
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
  const [localQueue, setLocalQueue] = useState(submissions);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const isRefetchingRef = useRef(false);

  // Update local queue when submissions prop changes
  useEffect(() => {
    setLocalQueue(submissions);
    setIsAdvancing(false);
    isRefetchingRef.current = false;
  }, [submissions]);

  // Trigger refetch when queue becomes empty
  useEffect(() => {
    if (shouldRefetch && !isRefetchingRef.current) {
      isRefetchingRef.current = true;
      setShouldRefetch(false);
      router.refresh();
    }
  }, [shouldRefetch, router]);

  const handleSwipe = async (liked: boolean, success: boolean) => {
    // Only advance if the action succeeded
    if (success) {
      // Check if there's a next card in the queue
      const hasNextCard = localQueue.length > 1;
      
      if (hasNextCard) {
        // OPTIMISTIC: Immediately remove current card and show next
        setIsAdvancing(true);
        
        // Use setTimeout to ensure smooth transition
        setTimeout(() => {
          setLocalQueue(prev => prev.slice(1));
          setIsAdvancing(false);
        }, 50); // Small delay for animation smoothness
        
      } else {
        // Last card in queue - trigger refetch after animation
        setIsAdvancing(true);
        
        setTimeout(() => {
          setLocalQueue([]);
          setShouldRefetch(true);
          setIsAdvancing(false);
        }, 350); // Wait for exit animation to complete
      }
    }
    // If failed, stay on current card (user can retry)
  };

  const currentSubmission = localQueue[0]; // Always use first item (we slice the queue)
  const hasMore = localQueue.length > 1;

  // NEVER show empty state during transitions
  if (isAdvancing) {
    // Keep UI stable during card transition
    // Don't render anything - let exit animation complete
    return (
      <div className="py-12">
        <div className="w-full max-w-md mx-auto min-h-[500px]" />
      </div>
    );
  }

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
  // ONLY show if truly empty (not during transition)
  if (allReviewed && !isAdvancing) {
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

  // State C: Unreviewed submissions exist, show current card
  if (!showCard && !isAdvancing) {
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
