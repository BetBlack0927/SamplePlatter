"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Submission } from "@/types/database";
import { LikeButton } from "@/components/LikeButton";

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
} = { el: null, setPlaying: null, setProgress: null };

function stopCurrent() {
  if (activeTrack.el) {
    activeTrack.el.pause();
    activeTrack.setPlaying?.(false);
    activeTrack.setProgress?.(0);
    activeTrack.el = null;
    activeTrack.setPlaying = null;
    activeTrack.setProgress = null;
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
  const duration = formatDuration(submission.duration_seconds);
  const hasAudio = !!submission.audio_url;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1

  const waveform = waveformForId(submission.id);

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
      // Register this card as the active track
      activeTrack.el = el;
      activeTrack.setPlaying = setIsPlaying;
      activeTrack.setProgress = setProgress;

      el.play().catch(() => {
        // Autoplay blocked or load error — revert
        setIsPlaying(false);
        activeTrack.el = null;
        activeTrack.setPlaying = null;
        activeTrack.setProgress = null;
      });
    }
  };

  return (
    <div className="group flex items-center gap-3 px-3 py-3 bg-surface border border-border hover:border-border-focus hover:bg-surface-elevated transition-all duration-100 rounded-sm">

      {/* Audio element */}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={submission.audio_url}
          preload="none"
          onPlay={() => setIsPlaying(true)}
          onPause={() => {
            setIsPlaying(false);
            if (activeTrack.el === audioRef.current) {
              activeTrack.el = null;
              activeTrack.setPlaying = null;
              activeTrack.setProgress = null;
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setProgress(0);
            if (activeTrack.el === audioRef.current) {
              activeTrack.el = null;
              activeTrack.setPlaying = null;
              activeTrack.setProgress = null;
            }
          }}
          onTimeUpdate={() => {
            const el = audioRef.current;
            if (el?.duration) setProgress(el.currentTime / el.duration);
          }}
        />
      )}

      {/* Rank */}
      <span className="w-6 shrink-0 text-right text-[11px] font-mono text-text-muted select-none">
        {rank ?? "—"}
      </span>

      {/* Avatar */}
      <div className="w-7 h-7 rounded-sm bg-surface-elevated border border-border shrink-0 overflow-hidden flex items-center justify-center">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[9px] font-mono font-semibold text-text-muted leading-none">
            {profile?.username?.slice(0, 2).toUpperCase() ?? "??"}
          </span>
        )}
      </div>

      {/* Producer + title */}
      <div className="w-36 shrink-0 min-w-0">
        <Link
          href={`/profile/${profile?.username ?? "#"}`}
          className="block text-sm font-medium text-text-primary hover:text-accent transition-colors truncate leading-tight"
          onClick={(e) => e.stopPropagation()}
        >
          {profile?.display_name ?? "Unknown"}
        </Link>
        <p className="text-[11px] text-text-secondary truncate leading-tight mt-0.5">
          {submission.title ?? (
            <span className="italic text-text-muted">untitled</span>
          )}
        </p>
      </div>

      {/* Waveform — click to play/pause, fills as track progresses */}
      <div
        className="flex-1 min-w-0 h-7 flex items-center gap-px overflow-hidden cursor-pointer"
        onClick={togglePlay}
        title={hasAudio ? (isPlaying ? "Pause" : "Play") : undefined}
      >
        {waveform.map((h, i) => {
          const barPos = i / waveform.length;
          const played = isPlaying && barPos < progress;
          return (
            <div
              key={i}
              className={`flex-1 rounded-full transition-colors duration-75 ${
                played
                  ? "bg-accent"
                  : isPlaying
                  ? "bg-border-focus"
                  : "bg-border-focus group-hover:bg-text-muted"
              }`}
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-3 shrink-0">
        {duration && (
          <span className="text-[11px] font-mono text-text-muted w-8 text-right tabular-nums">
            {duration}
          </span>
        )}
        <span className="text-[11px] font-mono text-text-secondary flex items-center gap-1">
          <EyeIcon />
          {submission.play_count}
        </span>

        <LikeButton
          submissionId={submission.id}
          initialLiked={submission.liked_by_user ?? false}
          initialCount={submission.like_count ?? 0}
          isAuthenticated={isAuthenticated}
        />
      </div>

      {/* Time */}
      <span className="hidden lg:block text-[11px] font-mono text-text-secondary w-12 text-right shrink-0 tabular-nums">
        {timeAgo}
      </span>

      {/* Play / Pause button */}
      <button
        onClick={togglePlay}
        disabled={!hasAudio}
        className={`w-7 h-7 shrink-0 rounded-sm border flex items-center justify-center transition-all duration-100 active:scale-95 ${
          isPlaying
            ? "border-accent/60 bg-accent-dim text-accent"
            : "border-border-focus bg-surface-elevated text-text-secondary hover:text-accent hover:border-accent/50 hover:bg-accent-dim"
        } disabled:opacity-30 disabled:cursor-not-allowed`}
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

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
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
