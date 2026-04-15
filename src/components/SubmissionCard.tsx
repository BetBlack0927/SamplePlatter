"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Submission } from "@/types/database";
import { LikeButton } from "@/components/LikeButton";
import { recordSubmissionPlay } from "@/lib/actions/plays";
import { getOrCreatePlaybackSessionId } from "@/lib/playback-session";

/* ─── Module-level audio registry ───────────────────────────────
 * Shared across all SubmissionCard instances on the page so only
 * one track plays at a time. We keep the state setter so we can
 * directly flip the paused card back to idle without relying on
 * DOM events propagating through React's synthetic event system.
 * ────────────────────────────────────────────────────────────── */
const activeTrack: {
  el: HTMLAudioElement | null;
  setPlaying: ((v: boolean) => void) | null;
  setProgress: ((v: number) => void) | null;
  setCurrentTime: ((v: number) => void) | null;
} = { el: null, setPlaying: null, setProgress: null, setCurrentTime: null };

function stopCurrent() {
  if (activeTrack.el) {
    activeTrack.el.pause();
    activeTrack.setPlaying?.(false);
    activeTrack.setProgress?.(0);
    activeTrack.setCurrentTime?.(0);
    activeTrack.el = null;
    activeTrack.setPlaying = null;
    activeTrack.setProgress = null;
    activeTrack.setCurrentTime = null;
  }
}

/* ─── Component ─────────────────────────────────────────────── */

interface SubmissionCardProps {
  submission: Submission;
  rank?: number;
  isAuthenticated?: boolean;
}

export function SubmissionCard({
  submission,
  rank,
  isAuthenticated = false,
}: SubmissionCardProps) {
  const timeAgo = formatTimeAgo(submission.created_at);
  const profile = submission.profile;
  const hasAudio = !!submission.audio_url;
  const playTimerRef = useRef<number | null>(null);
  const isRecordingPlayRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [currentTime, setCurrentTime] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(
    submission.duration_seconds ?? 0
  );
  const [playCount, setPlayCount] = useState(submission.play_count);

  const waveform = waveformForId(submission.id);
  const displayDuration = durationSeconds || submission.duration_seconds || 0;
  const playbackLabel = displayDuration
    ? `${formatTime(currentTime)} / ${formatTime(displayDuration)}`
    : "";

  const clearPlayTimer = () => {
    if (playTimerRef.current !== null) {
      window.clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  };

  const registerActiveTrack = (el: HTMLAudioElement) => {
    activeTrack.el = el;
    activeTrack.setPlaying = setIsPlaying;
    activeTrack.setProgress = setProgress;
    activeTrack.setCurrentTime = setCurrentTime;
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || !hasAudio) return;

    if (isPlaying) {
      el.pause();
    } else {
      // Stop whatever else is playing and reset its state
      if (activeTrack.el && activeTrack.el !== el) {
        stopCurrent();
      }
      registerActiveTrack(el);

      el.play().catch(() => {
        // Autoplay blocked or load error — revert
        setIsPlaying(false);
        activeTrack.el = null;
        activeTrack.setPlaying = null;
        activeTrack.setProgress = null;
        activeTrack.setCurrentTime = null;
      });
    }
  };

  const seekToPosition = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !hasAudio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const nextDuration = el.duration || displayDuration;
    if (!nextDuration) return;

    if (activeTrack.el && activeTrack.el !== el) {
      stopCurrent();
    }

    registerActiveTrack(el);
    el.currentTime = ratio * nextDuration;
    setCurrentTime(ratio * nextDuration);
    setProgress(ratio);
  };

  useEffect(() => {
    isRecordingPlayRef.current = false;
    clearPlayTimer();

    return clearPlayTimer;
  }, [submission.id]);

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
        setPlayCount(result.playCount);
      }
      isRecordingPlayRef.current = false;
      playTimerRef.current = null;
    }, 3000);

    return clearPlayTimer;
  }, [hasAudio, isPlaying, submission.id]);

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 bg-surface border-l-2 border-l-transparent border-y border-y-transparent hover:border-l-accent/40 hover:border-y-border hover:bg-surface-elevated transition-all duration-100" style={{ borderRadius: 'var(--radius-minimal)' }}>

      {/* Audio element */}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={submission.audio_url}
          preload="none"
          onPlay={() => setIsPlaying(true)}
          onLoadedMetadata={() => {
            const el = audioRef.current;
            if (!el?.duration) return;
            setDurationSeconds(Math.round(el.duration));
          }}
          onPause={() => {
            setIsPlaying(false);
            if (activeTrack.el === audioRef.current) {
              activeTrack.el = null;
              activeTrack.setPlaying = null;
              activeTrack.setProgress = null;
              activeTrack.setCurrentTime = null;
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
            if (activeTrack.el === audioRef.current) {
              activeTrack.el = null;
              activeTrack.setPlaying = null;
              activeTrack.setProgress = null;
              activeTrack.setCurrentTime = null;
            }
          }}
          onTimeUpdate={() => {
            const el = audioRef.current;
            if (!el?.duration) return;
            setCurrentTime(el.currentTime);
            setProgress(el.currentTime / el.duration);
          }}
        />
      )}

      {/* Rank */}
      <span className="w-5 shrink-0 text-right text-[11px] font-mono text-text-secondary select-none tabular-nums font-semibold">
        {rank ?? "—"}
      </span>

      {/* Avatar */}
      <div className="w-7 h-7 bg-surface-elevated border border-border shrink-0 overflow-hidden flex items-center justify-center" style={{ borderRadius: 'var(--radius-minimal)' }}>
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[9px] font-mono font-bold text-text-muted leading-none">
            {profile?.username?.slice(0, 2).toUpperCase() ?? "??"}
          </span>
        )}
      </div>

      {/* Producer + title */}
      <div className="w-44 lg:w-48 shrink-0 min-w-0">
        <Link
          href={`/profile/${profile?.username ?? "#"}`}
          prefetch={true}
          className="block text-sm font-semibold text-text-primary hover:text-white transition-colors truncate leading-tight"
          onClick={(e) => e.stopPropagation()}
        >
          {profile?.display_name ?? "Unknown"}
        </Link>
        <p className="text-[11px] text-text-secondary truncate leading-snug mt-1">
          {submission.title ?? (
            <span className="italic text-text-muted">untitled</span>
          )}
        </p>
      </div>

      {/* Waveform — click to seek, fills as track progresses */}
      <div
        className="flex-1 min-w-0 h-7 flex items-center gap-px overflow-hidden cursor-pointer"
        onClick={seekToPosition}
        title={hasAudio ? "Seek" : undefined}
      >
        {waveform.map((h, i) => {
          const barPos = i / waveform.length;
          const played = barPos < progress;
          return (
            <div
              key={i}
              className={`flex-1 transition-colors duration-75 ${
                played
                  ? "bg-text-primary"
                  : isPlaying
                  ? "bg-border-focus"
                  : "bg-border group-hover:bg-border-focus"
              }`}
              style={{ height: `${h}%`, borderRadius: 'var(--radius-minimal)' }}
            />
          );
        })}
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-3 shrink-0">
        {playbackLabel && (
          <span className="text-[11px] font-mono text-text-secondary w-[6.25rem] text-right tabular-nums font-semibold">
            {playbackLabel}
          </span>
        )}
        <span className="text-[11px] font-mono text-text-secondary flex items-center gap-1 font-semibold">
          <EyeIcon />
          {playCount}
        </span>

        <LikeButton
          submissionId={submission.id}
          initialLiked={submission.liked_by_user ?? false}
          initialCount={submission.like_count ?? 0}
          isAuthenticated={isAuthenticated}
        />
      </div>

      {/* Time */}
      <span className="hidden lg:block text-[11px] font-mono text-text-muted w-10 text-right shrink-0 tabular-nums font-semibold">
        {timeAgo}
      </span>

      {/* Play / Pause button */}
      <button
        onClick={togglePlay}
        disabled={!hasAudio}
        className={`w-7 h-7 shrink-0 border flex items-center justify-center transition-all duration-100 active:scale-95 ${
          isPlaying
            ? "border-text-primary/60 bg-text-primary/10 text-text-primary"
            : "border-border bg-surface-elevated text-text-secondary hover:text-text-primary hover:border-border-focus hover:bg-surface-elevated"
        } disabled:opacity-30 disabled:cursor-not-allowed`}
        style={{ borderRadius: 'var(--radius-minimal)' }}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
    </div>
  );
}

/* ─── Icons ─────────────────────────────────────────────────── */

function PlayIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
      <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
      <rect x="1.5" y="1.5" width="2.5" height="7" rx="0.5" />
      <rect x="6" y="1.5" width="2.5" height="7" rx="0.5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z" />
      <circle cx="6" cy="6" r="1.5" />
    </svg>
  );
}

/* ─── Helpers ───────────────────────────────────────────────── */

function formatTimeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function formatTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "";
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safeSeconds / 60);
  const s = safeSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function waveformForId(id: string): number[] {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  }
  return WAVEFORM_SEEDS[h % WAVEFORM_SEEDS.length];
}

const WAVEFORM_SEEDS: number[][] = [
  [30, 55, 70, 45, 80, 60, 35, 75, 50, 65, 40, 85, 55, 70, 45, 80, 30, 60, 75, 50, 65, 40, 55, 70, 80, 45, 60, 35, 75, 50],
  [60, 40, 75, 55, 30, 70, 85, 45, 60, 35, 80, 50, 65, 40, 75, 55, 30, 70, 45, 80, 60, 35, 75, 50, 65, 40, 85, 55, 70, 45],
  [45, 80, 35, 65, 50, 75, 40, 85, 55, 30, 70, 60, 45, 80, 35, 65, 50, 75, 40, 85, 30, 60, 75, 50, 65, 40, 55, 70, 80, 45],
  [70, 35, 60, 80, 45, 55, 75, 40, 65, 50, 30, 85, 70, 35, 60, 80, 45, 55, 30, 65, 75, 50, 40, 85, 60, 35, 70, 55, 80, 45],
  [50, 75, 40, 65, 85, 30, 60, 55, 70, 45, 80, 35, 50, 75, 40, 65, 85, 30, 60, 55, 45, 80, 35, 70, 50, 65, 40, 75, 55, 30],
];
