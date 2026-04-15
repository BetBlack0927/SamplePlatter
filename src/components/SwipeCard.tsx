"use client";

import { useState, useTransition, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import type { Submission } from "@/types/database";
import { toggleLike } from "@/lib/actions/likes";
import { saveReview } from "@/lib/actions/reviews";
import { recordSubmissionPlay } from "@/lib/actions/plays";
import { getOrCreatePlaybackSessionId } from "@/lib/playback-session";

interface SwipeCardProps {
  submission: Submission;
  isAuthenticated: boolean;
  onSwipe: (liked: boolean, success: boolean) => void;
  animationState?: "center" | "enter" | "exit-left" | "exit-right";
}

export function SwipeCard({
  submission,
  isAuthenticated,
  onSwipe,
  animationState = "center",
}: SwipeCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const playTimerRef = useRef<number | null>(null);
  const isRecordingPlayRef = useRef(false);

  const profile = submission.profile;
  const hasAudio = !!submission.audio_url;

  const handleSwipe = async (direction: "left" | "right") => {
    if (animationState !== "center" || isPending) return;

    const liked = direction === "right";
    const action = liked ? "liked" : "skipped";

    // Clear any previous errors
    setError(null);

    // Pause audio if playing
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    // Notify parent immediately so the visual handoff starts at once.
    onSwipe(liked, true);

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

        // Note: router.refresh() is NOT called here to avoid slowing down navigation
        // SwipeFeed will handle refetch only when queue becomes empty
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

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration;
    
    if (!isDragging) {
      setCurrentTime(current);
      setPlaybackProgress(total > 0 ? current / total : 0);
    }
  }, [isDragging]);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  }, []);

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

  const handleDragMove = useCallback((e: MouseEvent) => {
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
  }, [duration, isDragging, submission.id]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setPlaybackProgress(0);
  }, []);

  const clearPlayTimer = useCallback(() => {
    if (playTimerRef.current !== null) {
      window.clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
      
      return () => {
        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [handleDragEnd, handleDragMove, isDragging]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [handleEnded, handleLoadedMetadata, handleTimeUpdate]);

  useEffect(() => {
    isRecordingPlayRef.current = false;
    clearPlayTimer();

    return clearPlayTimer;
  }, [clearPlayTimer, submission.id]);

  useEffect(() => {
    if (!isPlaying || !hasAudio || isRecordingPlayRef.current) {
      if (!isPlaying) clearPlayTimer();
      return;
    }

    playTimerRef.current = window.setTimeout(async () => {
      const sessionId = getOrCreatePlaybackSessionId();
      if (!sessionId) return;

      isRecordingPlayRef.current = true;
      const result = await recordSubmissionPlay(submission.id, sessionId);
      if (!result.error) {
        // Count updated server-side; list rows will reflect fresh values on query refresh.
      }
      isRecordingPlayRef.current = false;
      playTimerRef.current = null;
    }, 3000);

    return clearPlayTimer;
  }, [clearPlayTimer, hasAudio, isPlaying, submission.id]);

  const waveformBars = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const seed = submission.id.charCodeAt(i % submission.id.length) || 0;
        const h = 20 + Math.sin(i * 0.5) * 55 + (seed % 18);
        return Math.min(100, Math.max(20, h));
      }),
    [submission.id]
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`relative w-full max-w-md mx-auto transition-all duration-[440ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        animationState === "exit-left"
          ? "opacity-0 -translate-x-[118%] translate-y-1 rotate-[-10deg] scale-[0.98]"
          : animationState === "exit-right"
          ? "opacity-0 translate-x-[118%] translate-y-1 rotate-[10deg] scale-[0.98]"
          : animationState === "enter"
          ? "opacity-0 translate-y-8 scale-[0.985]"
          : "opacity-100 translate-x-0 translate-y-0 rotate-0 scale-100"
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
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-xl font-bold text-text-primary leading-tight mb-2.5 line-clamp-2">
            {submission.title || "Untitled"}
          </h2>

          {/* Metadata */}
          <div className="flex items-center gap-3.5 text-[11px] font-mono text-text-secondary mb-5 flex-wrap">
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
              className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center text-text-primary hover:border-border-focus hover:bg-surface transition-all active:scale-95 disabled:opacity-40 shrink-0"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Progress Bar / Scrubber */}
            <div className="flex-1">
              <div
                id={`progress-bar-${submission.id}`}
                className="relative h-1.5 bg-border cursor-pointer group"
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
            <div className="text-[11px] font-mono text-text-secondary tabular-nums shrink-0">
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
          disabled={animationState !== "center" || isPending}
          className="w-14 h-14 rounded-full border border-border bg-surface flex items-center justify-center text-text-muted hover:text-text-primary hover:border-border-focus transition-all active:scale-95 disabled:opacity-40"
          aria-label="Skip"
        >
          <XIcon />
        </button>

        {/* Like Button - Balanced size */}
        <button
          onClick={() => handleSwipe("right")}
          disabled={animationState !== "center" || isPending || !isAuthenticated}
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
