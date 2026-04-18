"use client";

import Image from "next/image";
import Link from "next/link";
import type { Submission } from "@/types/database";

type BattleCardState = "idle" | "playing" | "winner" | "loser";

const WAVE_BARS = 28;

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function buildWaveform(submissionId: string) {
  const chars = submissionId.split("");

  return Array.from({ length: WAVE_BARS }, (_, index) => {
    const source = chars[index % chars.length]?.charCodeAt(0) ?? 80;
    return 10 + ((source * (index + 5)) % 18);
  });
}

export function BattleCard({
  submission,
  artworkUrl,
  sideLabel,
  state = "idle",
  currentTime,
  duration,
  isBusy = false,
  canPick = true,
  onTogglePlayback,
  onScrub,
  onPick,
}: {
  submission: Submission;
  artworkUrl?: string | null;
  sideLabel: string;
  state?: BattleCardState;
  currentTime: number;
  duration: number;
  isBusy?: boolean;
  canPick?: boolean;
  onTogglePlayback: () => void;
  onScrub: (value: number) => void;
  onPick: () => void;
}) {
  const waveform = buildWaveform(submission.id);
  const displayDuration = duration || submission.duration_seconds || 0;
  const progress = displayDuration > 0 ? Math.min(currentTime / displayDuration, 1) : 0;
  const username = submission.profile?.username ?? "freqy";
  const displayName = submission.profile?.display_name || "Anonymous";
  const largeAvatarUrl = submission.profile?.avatar_url;

  return (
    <article
      className="battle-card group relative overflow-hidden border border-white/10 bg-white/[0.03] p-4 text-left transition-all duration-300 sm:p-5"
      data-state={state}
      style={{ borderRadius: "26px" }}
    >
      {artworkUrl ? (
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
          <Image
            src={artworkUrl}
            alt=""
            fill
            sizes="50vw"
            className="object-cover blur-2xl"
          />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_58%)]" />

      <div className="relative flex items-center justify-between gap-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-text-muted">
          {sideLabel}
        </p>
        <div
          className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-text-secondary"
          style={{ borderRadius: "999px" }}
        >
          {state === "playing"
            ? "Live"
            : state === "winner"
            ? "Winner"
            : state === "loser"
            ? "Down"
            : "Ready"}
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-[112px_minmax(0,1fr)] gap-4 sm:grid-cols-[124px_minmax(0,1fr)]">
        <div className="relative h-28 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] sm:h-[124px]">
          {largeAvatarUrl ? (
            <Image
              src={largeAvatarUrl}
              alt={displayName}
              fill
              sizes="124px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_62%,transparent)]">
              <span className="text-3xl font-bold uppercase tracking-[0.18em] text-white/70">
                {displayName.slice(0, 2)}
              </span>
            </div>
          )}

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.22))]" />
        </div>

        <div className="flex min-w-0 flex-col">
          <h2 className="line-clamp-2 text-[1.35rem] font-semibold leading-[0.98] tracking-[-0.04em] text-text-primary sm:text-[1.55rem]">
            {submission.title ?? "Untitled flip"}
          </h2>

          <Link
            href={`/profile/${username}`}
            className="mt-2 inline-flex w-fit max-w-full items-center text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <span className="truncate">@{username}</span>
          </Link>

          <p className="mt-2 truncate text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
            {displayName}
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${waveform.length}, minmax(0, 1fr))` }}
        >
          {waveform.map((height, index) => {
            const filled = index / waveform.length <= progress;
            return (
              <span
                key={`${submission.id}-${index}`}
                className={`battle-wave-bar ${filled ? "battle-wave-bar--filled" : ""}`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        <div className="relative mt-3">
          <div className="h-px bg-white/10" />
          <div
            className="battle-progress absolute left-0 top-0 h-px bg-white/80"
            style={{ width: `${progress * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={displayDuration || 0}
            step={0.1}
            value={Math.min(currentTime, displayDuration || 0)}
            onChange={(event) => onScrub(Number(event.target.value))}
            className="battle-scrub absolute inset-x-0 top-[-8px] h-4 w-full cursor-pointer appearance-none bg-transparent"
            aria-label={`Scrub ${submission.title ?? "flip"}`}
            disabled={displayDuration <= 0}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] font-mono tracking-[0.16em] text-text-muted">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(displayDuration)}</span>
        </div>
      </div>

      <div className="relative mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlayback}
          className="battle-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-text-primary transition-all duration-150 hover:border-white/25 hover:bg-white/[0.1] active:scale-[0.97]"
          aria-label={state === "playing" ? "Pause track" : "Play track"}
          disabled={isBusy}
        >
          {state === "playing" ? (
            <div className="flex gap-1">
              <span className="h-4 w-1 rounded-full bg-current" />
              <span className="h-4 w-1 rounded-full bg-current" />
            </div>
          ) : (
            <div
              className="ml-0.5 h-0 w-0 border-y-[7px] border-y-transparent border-l-[10px] border-l-current"
              style={{ borderRight: 0 }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={onPick}
          disabled={!canPick || isBusy}
          className="battle-pick-button flex-1 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-[11px] font-mono font-bold uppercase tracking-[0.22em] text-text-primary transition-all duration-200 hover:border-white/30 hover:bg-white/[0.11] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {canPick ? "Pick this" : "Sign in to pick"}
        </button>
      </div>

      <div className="battle-card__impact-lines pointer-events-none absolute inset-0" />
    </article>
  );
}
