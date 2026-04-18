"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  ProducerBattleStats,
  SubmissionBattleStats,
} from "@/lib/battles";

const WAVE_BARS = 34;
const MEDAL_LABELS = ["Diamond", "Platinum", "Gold"] as const;

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getMedalLabel(rank: number) {
  return MEDAL_LABELS[rank - 1] ?? null;
}

function getRowTone(rank: number) {
  if (rank === 1) return "leaderboard-row--diamond";
  if (rank === 2) return "leaderboard-row--platinum";
  if (rank === 3) return "leaderboard-row--gold";
  return "";
}

function buildWaveform(submissionId: string) {
  const chars = submissionId.split("");

  return Array.from({ length: WAVE_BARS }, (_, index) => {
    const source = chars[index % chars.length]?.charCodeAt(0) ?? 80;
    return 8 + ((source * (index + 7)) % 14);
  });
}

function InitialBox({
  label,
  size = "md",
}: {
  label: string;
  size?: "md" | "sm";
}) {
  return (
    <div
      className={`leaderboard-initial-box ${size === "sm" ? "leaderboard-initial-box--sm" : ""}`}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

function AvatarBox({
  src,
  alt,
  fallback,
  size = "md",
}: {
  src?: string | null;
  alt: string;
  fallback: string;
  size?: "md" | "sm";
}) {
  const className =
    size === "sm"
      ? "leaderboard-avatar leaderboard-avatar--sm"
      : "leaderboard-avatar";

  if (!src) {
    return <InitialBox label={fallback} size={size} />;
  }

  return (
    <div className={className}>
      <Image src={src} alt={alt} fill sizes={size === "sm" ? "44px" : "52px"} className="object-cover" />
    </div>
  );
}

function LeaderboardFlipRow({
  rank,
  stat,
  activeId,
  onRequestPlay,
}: {
  rank: number;
  stat: SubmissionBattleStats;
  activeId: string | null;
  onRequestPlay: (audio: HTMLAudioElement | null, submissionId: string) => Promise<void>;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(stat.submission.duration_seconds ?? 0);
  const rowTone = getRowTone(rank);
  const medal = getMedalLabel(rank);
  const waveform = buildWaveform(stat.submission.id);
  const isPlaying = activeId === stat.submission.id;
  const displayDuration = duration || stat.submission.duration_seconds || 0;
  const progress =
    displayDuration > 0 ? Math.min(currentTime / displayDuration, 1) : 0;
  const username = stat.submission.profile?.username ?? "freqy";
  const displayName =
    stat.submission.profile?.display_name || username;

  useEffect(() => {
    if (activeId !== stat.submission.id) {
      audioRef.current?.pause();
    }
  }, [activeId, stat.submission.id]);

  function handleScrub(value: number) {
    const audio = audioRef.current;
    if (!audio || displayDuration <= 0) return;

    audio.currentTime = value;
    setCurrentTime(value);
  }

  return (
    <div className={`leaderboard-row ${rowTone}`}>
      <audio
        ref={audioRef}
        src={stat.submission.audio_url}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          if (Number.isFinite(nextDuration)) {
            setDuration(nextDuration);
          }
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onPause={() => {
          if (activeId === stat.submission.id) {
            onRequestPlay(null, "");
          }
        }}
        onEnded={() => {
          onRequestPlay(null, "");
        }}
      />

      <div className="leaderboard-row__rank">{rank}</div>

      <AvatarBox
        src={stat.submission.profile?.avatar_url}
        alt={displayName}
        fallback={displayName}
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[1rem] font-semibold tracking-[-0.03em] text-text-primary sm:text-[1.08rem]">
            {displayName}
          </p>
          {medal ? <span className="leaderboard-medal">{medal}</span> : null}
        </div>
        <p className="truncate text-sm text-text-secondary">
          {stat.submission.title ?? "Untitled flip"}
        </p>
      </div>

      <div className="hidden min-w-0 items-center gap-4 lg:flex">
        <div className="leaderboard-waveform">
          <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: `repeat(${waveform.length}, minmax(0, 1fr))` }}>
            {waveform.map((height, index) => {
              const filled = index / waveform.length <= progress;
              return (
                <span
                  key={`${stat.submission.id}-${index}`}
                  className={`leaderboard-wave ${filled ? "leaderboard-wave--filled" : ""}`}
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>
          <input
            type="range"
            min={0}
            max={displayDuration || 0}
            step={0.1}
            value={Math.min(currentTime, displayDuration || 0)}
            onChange={(event) => handleScrub(Number(event.target.value))}
            className="leaderboard-scrub"
            aria-label={`Scrub ${stat.submission.title ?? "flip"}`}
            disabled={displayDuration <= 0}
          />
        </div>

        <div className="w-[92px] text-right text-[11px] font-mono tracking-[0.14em] text-text-secondary">
          {formatTime(currentTime)} / {formatTime(displayDuration)}
        </div>
      </div>

      <div className="hidden items-center gap-4 md:flex">
        <div className="text-right">
          <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-secondary">
            {formatPercent(stat.winRate)}
          </p>
          <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-muted">
            {stat.wins}W {stat.losses}L
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-secondary">
            {stat.battlesPlayed}
          </p>
          <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-text-muted">
            Battles
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRequestPlay(audioRef.current, stat.submission.id)}
        className="leaderboard-play"
        aria-label={isPlaying ? "Pause flip" : "Play flip"}
      >
        {isPlaying ? (
          <div className="flex gap-1">
            <span className="h-3.5 w-[3px] bg-current" />
            <span className="h-3.5 w-[3px] bg-current" />
          </div>
        ) : (
          <div className="ml-0.5 h-0 w-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-current" />
        )}
      </button>

      <div className="col-span-full mt-3 border-t border-white/8 pt-3 lg:hidden">
        <div className="leaderboard-waveform">
          <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: `repeat(${waveform.length}, minmax(0, 1fr))` }}>
            {waveform.map((height, index) => {
              const filled = index / waveform.length <= progress;
              return (
                <span
                  key={`${stat.submission.id}-mobile-${index}`}
                  className={`leaderboard-wave ${filled ? "leaderboard-wave--filled" : ""}`}
                  style={{ height: `${Math.max(6, height - 2)}px` }}
                />
              );
            })}
          </div>
          <input
            type="range"
            min={0}
            max={displayDuration || 0}
            step={0.1}
            value={Math.min(currentTime, displayDuration || 0)}
            onChange={(event) => handleScrub(Number(event.target.value))}
            className="leaderboard-scrub"
            aria-label={`Scrub ${stat.submission.title ?? "flip"}`}
            disabled={displayDuration <= 0}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-mono uppercase tracking-[0.15em] text-text-muted">
          <span>{formatTime(currentTime)} / {formatTime(displayDuration)}</span>
          <span>{formatPercent(stat.winRate)} • {stat.wins}W {stat.losses}L • {stat.battlesPlayed} battles</span>
        </div>
      </div>
    </div>
  );
}

function ProducerRow({
  rank,
  stat,
}: {
  rank: number;
  stat: ProducerBattleStats;
}) {
  const medal = getMedalLabel(rank);
  const rowTone = getRowTone(rank);

  return (
    <Link href={`/profile/${stat.username}`} className={`leaderboard-row ${rowTone}`}>
      <div className="leaderboard-row__rank">{rank}</div>

      <AvatarBox
        src={stat.avatarUrl}
        alt={stat.displayName}
        fallback={stat.displayName}
        size="sm"
      />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[1rem] font-semibold tracking-[-0.03em] text-text-primary">
            {stat.displayName}
          </p>
          {medal ? <span className="leaderboard-medal">{medal}</span> : null}
        </div>
        <p className="truncate text-sm text-text-secondary">@{stat.username}</p>
      </div>

      <div className="text-right">
        <p className="text-[1.05rem] font-semibold tracking-[-0.04em] text-text-primary">
          {formatPercent(stat.winRate)}
        </p>
        <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.14em] text-text-muted">
          {stat.totalWins}W / {stat.totalLosses}L
        </p>
      </div>
    </Link>
  );
}

function EmptySection({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="leaderboard-empty">
      <p className="text-lg font-semibold text-text-primary">{title}</p>
      <p className="mt-2 text-sm text-text-secondary">{body}</p>
    </div>
  );
}

export function LeaderboardPanels({
  topFlips,
  topProducers,
}: {
  topFlips: SubmissionBattleStats[];
  topProducers: ProducerBattleStats[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  async function handleRequestPlay(audio: HTMLAudioElement | null, submissionId: string) {
    if (!audio || !submissionId) {
      activeAudioRef.current = null;
      setActiveId(null);
      return;
    }

    if (activeId === submissionId) {
      audio.pause();
      activeAudioRef.current = null;
      setActiveId(null);
      return;
    }

    activeAudioRef.current?.pause();

    try {
      await audio.play();
      activeAudioRef.current = audio;
      setActiveId(submissionId);
    } catch (error) {
      console.error("leaderboard playback failed:", error);
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1.45fr_0.92fr]">
      <section className="space-y-4">
        <div className="leaderboard-section-header">
          <div className="flex items-center gap-3">
            <h2 className="text-[1.45rem] font-semibold tracking-[-0.04em] text-text-primary">
              Top flips
            </h2>
            <span className="leaderboard-count">{topFlips.length}</span>
          </div>
        </div>

        {topFlips.length === 0 ? (
          <EmptySection
            title="No battles yet"
            body="Once people start picking winners, the strongest flips will rise here."
          />
        ) : (
          <div className="space-y-[2px] border-t border-white/8 pt-4">
            {topFlips.map((stat, index) => (
              <LeaderboardFlipRow
                key={stat.submission.id}
                rank={index + 1}
                stat={stat}
                activeId={activeId}
                onRequestPlay={handleRequestPlay}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="leaderboard-section-header">
          <div className="flex items-center gap-3">
            <h2 className="text-[1.45rem] font-semibold tracking-[-0.04em] text-text-primary">
              Top producers
            </h2>
            <span className="leaderboard-count">{topProducers.length}</span>
          </div>
        </div>

        {topProducers.length === 0 ? (
          <EmptySection
            title="No producer standings yet"
            body="Battle winners will roll up into producer records as matchups come in."
          />
        ) : (
          <div className="space-y-[2px] border-t border-white/8 pt-4">
            {topProducers.map((stat, index) => (
              <ProducerRow key={stat.userId} rank={index + 1} stat={stat} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
