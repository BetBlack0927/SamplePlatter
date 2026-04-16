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
      className={`relative w-full max-w-[20rem] mx-auto transition-all duration-[440ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
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

      <div
        className="border px-4 pt-4 pb-6 shadow-[0_26px_90px_rgba(0,0,0,0.55)]"
        style={{
          borderRadius: "1.8rem",
          borderColor: "#8f8f8b",
          backgroundColor: "#e7e7e3",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -18px 40px rgba(0,0,0,0.05), 0 26px 90px rgba(0,0,0,0.55)",
        }}
      >
        <div
          className="overflow-hidden border-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
          style={{
            borderRadius: "0.4rem",
            borderColor: "#4e5356",
            backgroundColor: "#ddebf3",
          }}
        >
          <div className="flex items-center justify-between border-b px-3 py-1.5 text-[10px] font-bold text-[#1b1b1b]" style={{ borderColor: "#9fb5c2", backgroundColor: "#d2e2eb" }}>
            <span className="inline-flex items-center gap-1">
              <span className="h-0 w-0 border-y-[4px] border-y-transparent border-l-[6px] border-l-[#5c84a3]" />
              {isPlaying ? "Now Playing" : "Paused"}
            </span>
            <span>{Math.max(1, submission.like_count ?? 1)} of 14</span>
          </div>

          <div className="px-3 pt-3 pb-2">
            <div className="flex gap-3">
              <div
                className="h-20 w-20 shrink-0 overflow-hidden border-2"
                style={{ borderColor: "#2e3940", borderRadius: "0.18rem" }}
              >
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#1f2a23] text-[1.1rem] font-bold text-[#d9dedb]">
                    {profile?.username?.slice(0, 2).toUpperCase() ?? "??"}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1 text-[#161616]">
                <h2 className="line-clamp-2 text-[1.02rem] font-bold leading-[1.05]">
                  {submission.title || "Untitled"}
                </h2>
                <Link
                  href={`/profile/${profile?.username ?? "#"}`}
                  className="block truncate text-[13px] font-semibold text-[#202020] hover:underline"
                >
                  {profile?.display_name ?? "Unknown"}
                </Link>
                <p className="text-[11px] font-semibold text-[#4d4d4d]">
                  {submission.like_count ?? 0} like{(submission.like_count ?? 0) === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <div
                id={`progress-bar-${submission.id}`}
                className="relative h-3 cursor-pointer overflow-hidden border"
                style={{ borderColor: "#8aa8bb", borderRadius: "0.18rem", backgroundColor: "#eef6fb" }}
                onClick={handleSeek}
                onMouseDown={handleDragStart}
              >
                <div
                  className="absolute inset-y-0 left-0 transition-all"
                  style={{
                    width: `${playbackProgress * 100}%`,
                    backgroundColor: "#6fb8ee",
                  }}
                />
                <div className="absolute inset-0 flex items-end gap-px px-[2px] pb-[2px]">
                  {waveformBars.slice(0, 40).map((h, i) => {
                    const barProgress = i / 40;
                    const isPlayed = barProgress < playbackProgress;
                    return (
                      <div
                        key={i}
                        className={isPlayed ? (isPlaying ? "bg-[#2f81d8]" : "bg-[#597e9f]") : "bg-[#a7bbc8]"}
                        style={{
                          height: `${Math.max(18, h * 0.45)}%`,
                          width: "100%",
                          borderRadius: "1px",
                          opacity: isPlayed ? 0.95 : 0.7,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold text-[#222]">
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime((duration || submission.duration_seconds || 0) - currentTime)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-6 h-[13.25rem] w-[13.25rem] rounded-full border border-[#c9c9c5] bg-[#d8d8d5] shadow-[inset_0_2px_12px_rgba(255,255,255,0.75),inset_0_-6px_18px_rgba(0,0,0,0.08)]">
          <div className="absolute inset-x-0 top-5 text-center text-[12px] font-bold tracking-[0.14em] text-[#8d8d89]">
            MENU
          </div>

          <WheelButton
            className="absolute left-[1.05rem] top-1/2 -translate-y-1/2"
            onClick={() => handleSwipe("left")}
            disabled={animationState !== "center" || isPending}
            ariaLabel="Skip"
          >
            <XIcon soft />
          </WheelButton>

          <WheelButton
            className="absolute right-[1.05rem] top-1/2 -translate-y-1/2"
            onClick={() => handleSwipe("right")}
            disabled={animationState !== "center" || isPending || !isAuthenticated}
            variant="primary"
            ariaLabel="Like"
          >
            <HeartIcon filled={false} large />
          </WheelButton>

          <WheelButton
            className="absolute bottom-[1.05rem] left-1/2 -translate-x-1/2"
            onClick={togglePlay}
            disabled={!hasAudio}
            ariaLabel={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <PauseIcon soft /> : <PlayIcon soft />}
          </WheelButton>

          <button
            onClick={togglePlay}
            disabled={!hasAudio}
            aria-label={isPlaying ? "Pause track" : "Play track"}
            className="absolute left-1/2 top-1/2 flex h-[4.45rem] w-[4.45rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#ecece8] bg-[#f6f6f2] text-[#838380] shadow-[inset_0_1px_3px_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.08)] transition-all active:scale-95 disabled:opacity-40"
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.18em]">
              {isPlaying ? "Pause" : "Play"}
            </span>
          </button>
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={soft ? "text-[#8d8d89] ml-0.5" : "text-text-primary ml-0.5"}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ soft = false }: { soft?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={soft ? "text-[#8d8d89]" : "text-text-primary"}>
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

function XIcon({ soft = false }: { soft?: boolean }) {
  return (
    <svg
      width="22"
      height="22"
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

function WheelButton({
  className,
  onClick,
  disabled,
  variant = "secondary",
  ariaLabel,
  children,
}: {
  className: string;
  onClick: () => void;
  disabled: boolean;
  variant?: "secondary" | "primary";
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const isPrimary = variant === "primary";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${className} inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-[inset_0_1px_2px_rgba(255,255,255,0.85),0_2px_6px_rgba(0,0,0,0.14)] transition-all active:scale-95 disabled:opacity-40 ${
        isPrimary
          ? "border-[#d6d6d1] bg-[#f7f7f3] text-[#9b9b96] hover:border-[#c6c6c1] hover:bg-white hover:text-[#7e7ee8]"
          : "border-[#d2d2cd] bg-[#f2f2ee] text-[#94948f] hover:border-[#c0c0bb] hover:bg-[#fbfbf8] hover:text-[#72726e]"
      }`}
    >
      {children}
    </button>
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
