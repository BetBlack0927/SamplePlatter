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
  const [duration, setDuration] = useState(submission.duration_seconds ?? 0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<"idle" | "liked" | "skipped">("idle");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchOffsetX, setTouchOffsetX] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const playTimerRef = useRef<number | null>(null);
  const isRecordingPlayRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

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

    setActionFeedback(liked ? "liked" : "skipped");
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setActionFeedback("idle");
    }, 520);

    if (liked) {
      window.setTimeout(() => {
        onSwipe(true, true);
      }, 160);
    } else {
      onSwipe(liked, true);
    }

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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (animationState !== "center" || isPending) return;
    setTouchStartX(e.touches[0]?.clientX ?? null);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0]?.clientX ?? touchStartX;
    setTouchOffsetX(currentX - touchStartX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null) return;
    const threshold = 72;
    if (touchOffsetX <= -threshold) {
      void handleSwipe("left");
    } else if (touchOffsetX >= threshold) {
      void handleSwipe("right");
    }
    setTouchStartX(null);
    setTouchOffsetX(0);
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
    if (Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const totalDuration =
      audioRef.current.duration || duration || submission.duration_seconds || 0;
    if (!totalDuration) return;

    const newTime = percentage * totalDuration;
    
    audioRef.current.currentTime = newTime;
    setDuration(totalDuration);
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
    const totalDuration =
      audioRef.current.duration || duration || submission.duration_seconds || 0;
    if (!totalDuration) return;

    const newTime = percentage * totalDuration;
    
    audioRef.current.currentTime = newTime;
    setDuration(totalDuration);
    setCurrentTime(newTime);
    setPlaybackProgress(percentage);
  }, [duration, isDragging, submission.duration_seconds, submission.id]);

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
    isRecordingPlayRef.current = false;
    clearPlayTimer();

    return clearPlayTimer;
  }, [clearPlayTimer, submission.id]);

  useEffect(() => {
    if (!isPlaying || !audioRef.current || isDragging) {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const syncProgress = () => {
      if (!audioRef.current) return;
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || duration || submission.duration_seconds || 0;
      setCurrentTime(current);
      setPlaybackProgress(total > 0 ? current / total : 0);
      animationFrameRef.current = window.requestAnimationFrame(syncProgress);
    };

    animationFrameRef.current = window.requestAnimationFrame(syncProgress);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [duration, isDragging, isPlaying, submission.duration_seconds]);

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
        const noiseA = seededWaveformValue(submission.id, i);
        const noiseB = seededWaveformValue(submission.id, i + 97);
        const h = 18 + noiseA * 72 + noiseB * 10;
        return Math.min(92, Math.max(16, h));
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
      className={`relative mx-auto w-full max-w-[29rem] transition-all duration-[460ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        animationState === "exit-left"
          ? "opacity-0 -translate-x-20 translate-y-2 scale-[0.985]"
          : animationState === "exit-right"
          ? "opacity-0 translate-x-20 translate-y-2 scale-[0.985]"
          : animationState === "enter"
          ? "opacity-0 translate-y-6 scale-[0.985]"
          : "opacity-100 translate-x-0 translate-y-0 rotate-0 scale-100"
      }`}
      style={{
        transform:
          animationState === "center"
            ? `translateX(${touchOffsetX}px) scale(${
                actionFeedback === "liked" ? 1.03 : 1
              })`
            : undefined,
        opacity:
          animationState === "center"
            ? Math.max(0.7, 1 - Math.abs(touchOffsetX) / 420)
            : undefined,
      }}
    >
      {/* Hidden Audio Element */}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={submission.audio_url}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      )}

      <div
        className="mx-auto flex w-full max-w-[23rem] flex-col items-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`w-full transition-transform duration-300 ${
            actionFeedback === "liked" ? "scale-[1.03]" : actionFeedback === "skipped" ? "scale-[0.985]" : ""
          }`}
        >
          <div
            className={`relative mx-auto aspect-square w-full max-w-[18.75rem] overflow-hidden rounded-[1.8rem] bg-[#141414] shadow-[0_30px_80px_rgba(0,0,0,0.52)] ${
              isPlaying ? "listen-screen-active" : ""
            }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.15))]" />
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className={`h-full w-full object-cover transition-transform duration-500 ${isPlaying ? "listen-art-breathe" : ""}`}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#1a1d21] text-[4rem] font-bold text-[#f3f3f1]">
                {profile?.username?.slice(0, 2).toUpperCase() ?? "??"}
              </div>
            )}
            <div className="absolute inset-0 rounded-[1.8rem] ring-1 ring-white/8" />
            <div className="absolute -inset-5 -z-10 rounded-[2.2rem] bg-white/5 blur-3xl" />
          </div>

          <div className="mt-5 space-y-2 text-center">
            <h2 className="text-[1.75rem] font-semibold leading-[0.98] tracking-[-0.06em] text-text-primary sm:text-[2.15rem]">
              {submission.title || "Untitled"}
            </h2>
            <Link
              href={`/profile/${profile?.username ?? "#"}`}
              className="block text-[0.94rem] font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              @{profile?.username ?? profile?.display_name ?? "unknown"}
            </Link>
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
              {submission.like_count ?? 0} like{(submission.like_count ?? 0) === 1 ? "" : "s"}
            </p>
          </div>

          <div className="mx-auto mt-5 w-full max-w-[23rem] space-y-2">
            <div
              id={`progress-bar-${submission.id}`}
              className="relative h-8 cursor-pointer overflow-hidden rounded-full"
              onClick={handleSeek}
              onMouseDown={handleDragStart}
            >
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/12" />
              <div
                className={`absolute left-0 top-1/2 h-px -translate-y-1/2 ${isPlaying ? "listen-progress-fill" : "bg-white/45"}`}
                style={{ width: `${playbackProgress * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center gap-1.5 px-1">
                {waveformBars.slice(0, 52).map((h, i) => {
                  const barProgress = i / 52;
                  const isPlayed = barProgress < playbackProgress;
                  return (
                    <div
                      key={i}
                      className={isPlayed ? "bg-white/80" : "bg-white/18"}
                      style={{
                        height: `${Math.max(18, h * 0.35)}%`,
                        width: "100%",
                        borderRadius: "999px",
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] text-text-muted">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || submission.duration_seconds || 0)}</span>
            </div>
          </div>

          <div className="mx-auto mt-5 flex w-full max-w-[16.5rem] items-center justify-between gap-3">
            <ActionButton
              onClick={() => void handleSwipe("left")}
              disabled={animationState !== "center" || isPending}
              label="Skip"
              active={actionFeedback === "skipped"}
            >
              <XIcon />
            </ActionButton>

            <ActionButton
              onClick={togglePlay}
              disabled={!hasAudio}
              label={isPlaying ? "Pause" : "Play"}
              primary
              active={isPlaying}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </ActionButton>

            <ActionButton
              onClick={() => void handleSwipe("right")}
              disabled={animationState !== "center" || isPending || !isAuthenticated}
              label="Like"
              active={actionFeedback === "liked"}
            >
              <HeartIcon filled={actionFeedback === "liked"} />
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 px-4 py-3 bg-error/10 border border-error/20 text-center" style={{ borderRadius: "var(--radius-minimal)" }}>
          <p className="text-xs text-error font-semibold">{error}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────────── */

function PlayIcon({ soft = false }: { soft?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={soft ? "text-[#8d8d89] ml-0.5" : "text-current ml-0.5"}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ soft = false }: { soft?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={soft ? "text-[#8d8d89]" : "text-current"}>
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  );
}

function HeartIcon({ filled, large }: { filled: boolean; large?: boolean }) {
  const size = large ? 22 : 18;
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

function XIcon({ soft = false }: { soft?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={soft ? "#8d8d89" : "currentColor"}
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ActionButton({
  onClick,
  disabled,
  label,
  primary = false,
  active = false,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  primary?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-200 active:scale-95 disabled:opacity-35 ${
          primary
            ? active
              ? "border-white/28 bg-white text-black shadow-[0_0_35px_rgba(255,255,255,0.18)]"
              : "border-white/15 bg-white/92 text-black shadow-[0_10px_30px_rgba(255,255,255,0.08)]"
            : active
            ? "border-white/30 bg-white/12 text-white shadow-[0_0_25px_rgba(255,255,255,0.1)]"
            : "border-white/12 bg-white/6 text-white/88 hover:border-white/20 hover:bg-white/10"
        }`}
      >
        {children}
      </button>
      <span className="text-[9px] leading-none font-mono uppercase tracking-[0.16em] text-text-muted">
        {label}
      </span>
    </div>
  );
}

function seededWaveformValue(seed: string, index: number) {
  let h = 2166136261 ^ index;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i) + index * 17;
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}
