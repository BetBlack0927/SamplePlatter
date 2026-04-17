"use client";

import { useEffect, useOptimistic, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Submission } from "@/types/database";
import { SwipeCard } from "./SwipeCard";
import Link from "next/link";

interface SwipeFeedProps {
  submissions: Submission[];
  totalSubmissionCount: number;
  isAuthenticated: boolean;
  hasSample: boolean;
}

export function SwipeFeed({ 
  submissions, 
  totalSubmissionCount,
  isAuthenticated, 
  hasSample,
}: SwipeFeedProps) {
  const router = useRouter();
  const [localQueue, advanceQueue] = useOptimistic(
    submissions,
    (currentQueue: Submission[], action: "advance") =>
      action === "advance" ? currentQueue.slice(1) : currentQueue
  );
  const [outgoingCard, setOutgoingCard] = useState<{
    submission: Submission;
    direction: "left" | "right";
  } | null>(null);
  const [incomingCard, setIncomingCard] = useState<Submission | null>(null);
  const [isIncomingVisible, setIsIncomingVisible] = useState(false);
  const timeoutRefs = useRef<number[]>([]);

  const EXIT_DURATION_MS = 380;
  const ENTER_DELAY_MS = 70;
  const ENTER_DURATION_MS = 480;

  const clearScheduledTimeouts = () => {
    timeoutRefs.current.forEach((id) => window.clearTimeout(id));
    timeoutRefs.current = [];
  };

  useEffect(() => {
    return clearScheduledTimeouts;
  }, []);

  const scheduleTimeout = (callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    timeoutRefs.current.push(id);
  };

  const handleSwipe = async (liked: boolean, success: boolean) => {
    // Only advance if the action succeeded
    if (success) {
      const currentCard = localQueue[0];
      if (!currentCard || outgoingCard) return;

      // Check if there's a next card in the queue
      const hasNextCard = localQueue.length > 1;
      const nextCard = hasNextCard ? localQueue[1] : null;
      const direction = liked ? "right" : "left";

      clearScheduledTimeouts();
      setOutgoingCard({ submission: currentCard, direction });

      if (hasNextCard) {
        setIncomingCard(nextCard);

        scheduleTimeout(() => {
          setIsIncomingVisible(true);
        }, ENTER_DELAY_MS);

        scheduleTimeout(() => {
          advanceQueue("advance");
        }, EXIT_DURATION_MS);

        scheduleTimeout(() => {
          setOutgoingCard(null);
          setIncomingCard(null);
          setIsIncomingVisible(false);
        }, EXIT_DURATION_MS + ENTER_DURATION_MS);
      } else {
        scheduleTimeout(() => {
          advanceQueue("advance");
        }, EXIT_DURATION_MS);

        scheduleTimeout(() => {
          router.refresh();
        }, EXIT_DURATION_MS + ENTER_DELAY_MS);

        scheduleTimeout(() => {
          setOutgoingCard(null);
        }, EXIT_DURATION_MS + ENTER_DURATION_MS);
      }
    }
    // If failed, stay on current card (user can retry)
  };

  const currentSubmission = localQueue[0]; // Always use first item (we slice the queue)
  const isTransitioning = outgoingCard !== null;

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
          <p className="text-sm text-text-secondary leading-relaxed">
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
          <p className="text-sm text-text-secondary leading-relaxed">
            {isAuthenticated
              ? "Be the first to flip today's sample."
              : "Sign in and be the first to submit."}
          </p>
          <Link
            href="/"
            className="inline-block mt-3 text-[11px] font-mono font-bold text-text-primary hover:text-white transition-colors tracking-[0.12em] underline underline-offset-2"
          >
            {isAuthenticated ? "Upload your flip →" : "Sign in →"}
          </Link>
        </div>
      </div>
    );
  }

  // State B: Submissions exist, but user has reviewed them all
  // ONLY show if truly empty (not during transition)
  if (allReviewed && !isTransitioning) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 pb-10 text-center">
        <div className="listen-empty-pulse mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-elevated shadow-[0_0_30px_rgba(255,255,255,0.06)]">
          <div className="h-2.5 w-2.5 rounded-full bg-text-primary/80" />
        </div>
        <div className="space-y-2">
          <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-text-primary">
            You&apos;re caught up
          </h2>
          <p className="text-sm text-text-muted">
            Come back soon for the next batch.
          </p>
        </div>
      </div>
    );
  }

  // State C: Unreviewed submissions exist, show current card
  if (!showCard && !isTransitioning) {
    // Safety fallback - shouldn't reach here
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="space-y-3 max-w-sm">
          <p className="text-base font-bold text-text-primary">
            Something went wrong
          </p>
          <Link
            href="/"
            className="inline-block mt-3 text-[11px] font-mono font-bold text-text-primary hover:text-white transition-colors tracking-[0.12em] underline underline-offset-2"
          >
            Back to today
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center px-4 pb-8 pt-2">
      <div className="relative mx-auto flex w-full max-w-5xl items-center justify-center min-h-[42rem]">
        {showCard && !isTransitioning && (
          <SwipeCard
            key={`current-${currentSubmission.id}`}
            submission={currentSubmission}
            isAuthenticated={isAuthenticated}
            onSwipe={handleSwipe}
          />
        )}

        {outgoingCard && (
          <div className="absolute inset-x-0 top-0">
            <SwipeCard
              key={`outgoing-${outgoingCard.submission.id}`}
              submission={outgoingCard.submission}
              isAuthenticated={isAuthenticated}
              onSwipe={handleSwipe}
              animationState={
                outgoingCard.direction === "left" ? "exit-left" : "exit-right"
              }
            />
          </div>
        )}

        {incomingCard && (
          <div className="absolute inset-x-0 top-0">
            <SwipeCard
              key={`incoming-${incomingCard.id}`}
              submission={incomingCard}
              isAuthenticated={isAuthenticated}
              onSwipe={handleSwipe}
              animationState={isIncomingVisible ? "center" : "enter"}
            />
          </div>
        )}
      </div>

      {/* Footer Hint */}
      {!isAuthenticated && (
        <div className="mt-6 text-center shrink-0">
          <p className="text-[11px] font-mono text-text-muted">
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
