"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import type { Submission } from "@/types/database";
import { toggleLike } from "@/lib/actions/likes";
import { saveReview } from "@/lib/actions/reviews";
import { useRouter } from "next/navigation";

interface SwipeCardProps {
  submission: Submission;
  isAuthenticated: boolean;
  onSwipe: (liked: boolean, success: boolean) => void;
}

export function SwipeCard({ submission, isAuthenticated, onSwipe }: SwipeCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const profile = submission.profile;
  const hasAudio = !!submission.audio_url;

  const handleSwipe = async (direction: "left" | "right") => {
    if (isExiting || isPending) return;

    const liked = direction === "right";
    const action = liked ? "liked" : "skipped";

    // Clear any previous errors
    setError(null);

    // Pause audio if playing
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    // Trigger exit animation
    setIsExiting(true);
    setExitDirection(direction);

    // OPTIMISTIC: Notify parent immediately (don't wait for save)
    // This makes the UI feel instant
    setTimeout(() => {
      onSwipe(liked, true);
    }, 50); // Small delay for smooth animation start

    // Save review and like actions in background
    startTransition(async () => {
      try {
        // Save review (always do this for both like and skip)
        const reviewResult = await saveReview(submission.id, action);
        
        if (!reviewResult.success) {
          console.error("Failed to save review:", reviewResult.error);
          // Don't block UI - save failed but user already moved on
          // Could show a toast notification here if needed
        }

        // If liked, also save to likes table
        if (liked && isAuthenticated) {
          await toggleLike(submission.id);
        }

        // Refresh in background to sync state
        router.refresh();
      } catch (err) {
        console.error("Swipe action failed:", err);
        // Don't block UI - save failed but user already moved on
      }
    });
  };

  const togglePlay = () => {
    if (!hasAudio || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration;
    
    if (!isDragging) {
      setCurrentTime(current);
      setPlaybackProgress(total > 0 ? current / total : 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setPlaybackProgress(percentage);
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleSeek(e);
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging || !audioRef.current) return;
    
    const progressBar = document.getElementById(`progress-bar-${submission.id}`);
    if (!progressBar) return;
    
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setPlaybackProgress(percentage);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
      
      return () => {
        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [isDragging, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setPlaybackProgress(0);
    });

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  // Generate waveform bars
  const waveformBars = Array.from({ length: 60 }, (_, i) => {
    const h = 20 + Math.sin(i * 0.5) * 60 + Math.random() * 20;
    return Math.min(100, Math.max(20, h));
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`relative w-full max-w-md mx-auto transition-all duration-300 ${
        isExiting
          ? exitDirection === "left"
            ? "opacity-0 -translate-x-[120%] -rotate-12"
            : "opacity-0 translate-x-[120%] rotate-12"
          : "opacity-100 translate-x-0 rotate-0"
      }`}
    >
      {/* Hidden Audio Element */}
      {hasAudio && (
        <audio ref={audioRef} src={submission.audio_url} preload="metadata" />
      )}

      {/* Card */}
      <div
        className="bg-surface border border-border overflow-hidden"
        style={{ borderRadius: "var(--radius-minimal)" }}
      >
        {/* Waveform Visual - No Controls */}
        <div className="relative bg-black aspect-square flex items-center justify-center px-6">
          <div className="flex items-end justify-center gap-0.5 h-40 w-full">
            {waveformBars.map((h, i) => {
              const barProgress = i / waveformBars.length;
              const isPlayed = barProgress < playbackProgress;
              return (
                <div
                  key={i}
                  className={`flex-1 transition-all duration-150 ${
                    isPlayed
                      ? "bg-text-primary"
                      : "bg-border-focus"
                  } ${isPlaying && barProgress > playbackProgress - 0.05 && barProgress < playbackProgress + 0.05 ? "animate-pulse" : ""}`}
                  style={{ 
                    height: `${h}%`, 
                    borderRadius: "var(--radius-minimal)",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Track Info */}
        <div className="px-6 pt-4 pb-3">
          <h2 className="text-lg font-bold text-text-primary leading-tight mb-2 line-clamp-2">
            {submission.title || "Untitled"}
          </h2>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-[10px] font-mono text-text-secondary mb-4">
            <Link
              href={`/profile/${profile?.username ?? "#"}`}
              className="hover:text-text-primary transition-colors font-semibold"
            >
              by {profile?.display_name ?? "Unknown"}
            </Link>
            <span className="text-text-muted">·</span>
            <span className="flex items-center gap-1 text-text-muted">
              <HeartIcon filled={false} />
              {submission.like_count ?? 0}
            </span>
            <span className="text-text-muted">·</span>
            {submission.created_at && (
              <span className="text-text-muted">
                {new Date(submission.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Audio Controls Strip */}
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              disabled={!hasAudio}
              className="w-9 h-9 rounded-full border border-border bg-background flex items-center justify-center text-text-primary hover:border-border-focus hover:bg-surface transition-all active:scale-95 disabled:opacity-40 shrink-0"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Progress Bar / Scrubber */}
            <div className="flex-1">
              <div
                id={`progress-bar-${submission.id}`}
                className="relative h-1 bg-border cursor-pointer group"
                style={{ borderRadius: "var(--radius-minimal)" }}
                onClick={handleSeek}
                onMouseDown={handleDragStart}
              >
                {/* Progress Fill */}
                <div
                  className="absolute left-0 top-0 h-full bg-text-primary transition-all"
                  style={{ 
                    width: `${playbackProgress * 100}%`,
                    borderRadius: "var(--radius-minimal)",
                  }}
                />
                {/* Scrubber Knob */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-text-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${playbackProgress * 100}%`, marginLeft: "-6px" }}
                />
              </div>
            </div>

            {/* Time Display */}
            <div className="text-[9px] font-mono text-text-muted tabular-nums shrink-0">
              {formatTime(currentTime)} / {formatTime(duration || submission.duration_seconds || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 px-4 py-3 bg-error/10 border border-error/20 text-center" style={{ borderRadius: "var(--radius-minimal)" }}>
          <p className="text-xs text-error font-semibold">{error}</p>
        </div>
      )}

      {/* Action Buttons - Balanced */}
      <div className="flex items-center justify-center gap-8 mt-10">
        {/* Skip Button */}
        <button
          onClick={() => handleSwipe("left")}
          disabled={isExiting || isPending}
          className="w-14 h-14 rounded-full border border-border bg-surface flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-focus transition-all active:scale-95 disabled:opacity-40"
          aria-label="Skip"
        >
          <XIcon />
        </button>

        {/* Like Button - Balanced size */}
        <button
          onClick={() => handleSwipe("right")}
          disabled={isExiting || isPending || !isAuthenticated}
          className="w-14 h-14 rounded-full border border-border bg-surface flex items-center justify-center text-text-primary hover:text-white hover:border-text-primary/40 hover:bg-surface-elevated transition-all active:scale-95 disabled:opacity-40"
          aria-label="Like"
        >
          <HeartIcon filled={false} large />
        </button>
      </div>
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────────── */

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-primary ml-0.5">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-primary">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  );
}

function HeartIcon({ filled, large }: { filled: boolean; large?: boolean }) {
  const size = large ? 22 : 12;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
