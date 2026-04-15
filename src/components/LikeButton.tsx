"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleLike } from "@/lib/actions/likes";

interface LikeButtonProps {
  submissionId: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthenticated: boolean;
}

/**
 * Optimistic like toggle. Flips state immediately on click, calls the server
 * action in a transition, and reverts if the action fails.
 */
export function LikeButton({
  submissionId,
  initialLiked,
  initialCount,
  isAuthenticated,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Capture current state for potential rollback
    const prevLiked = liked;
    const prevCount = count;

    // Optimistic update
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);

    startTransition(async () => {
      const result = await toggleLike(submissionId);
      if (result.error) {
        // Rollback
        setLiked(prevLiked);
        setCount(prevCount);
      } else {
        // Sync with server truth
        setLiked(result.liked);
        setCount(result.likeCount);
      }
    });
  };

  if (!isAuthenticated) {
    return (
      <Link
        href="/sign-in"
        className="text-[11px] font-mono text-text-secondary hover:text-text-primary flex items-center gap-1 transition-colors font-semibold"
        title="Sign in to like"
        onClick={(e) => e.stopPropagation()}
      >
        <HeartIcon filled={false} />
        {count}
      </Link>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`text-[11px] font-mono flex items-center gap-1 transition-colors disabled:opacity-60 font-semibold ${
        liked
          ? "text-text-primary"
          : "text-text-secondary hover:text-text-primary"
      }`}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <HeartIcon filled={liked} />
      {count}
    </button>
  );
}

/* ─── Icon ────────────────────────────────────────────────────── */

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.3"
      className="shrink-0"
    >
      <path d="M6 10.5S1 7.5 1 4a2.5 2.5 0 015 0 2.5 2.5 0 015 0c0 3.5-5 6.5-5 6.5z" />
    </svg>
  );
}
