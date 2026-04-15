"use client";

import { useRef, useState, useCallback } from "react";
import { VinylRecord } from "@/components/VinylRecord";

interface SamplePlayerProps {
  audioUrl: string;
  title: string;
  artist: string;
}

export function SamplePlayer({ audioUrl, title, artist }: SamplePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
    } else {
      el.play();
    }
  };

  const onTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    setCurrentTime(el.currentTime);
    setProgress(el.currentTime / el.duration);
  }, []);

  const onLoadedMetadata = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    setDuration(el.duration);
  }, []);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * el.duration;
    setCurrentTime(ratio * el.duration);
    setProgress(ratio);
  };

  return (
    <section className="space-y-3.5 sm:space-y-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        preload="metadata"
      />

      <VinylRecord isPlaying={isPlaying} onToggle={togglePlay} />

      <div className="space-y-0.5 text-center">
        <p className="text-[10px] font-mono tracking-[0.18em] uppercase text-text-secondary">
          Today&apos;s Sample
        </p>
        <div className="space-y-0">
          <h1 className="text-[1.96rem] font-bold text-text-primary leading-[1.02] tracking-tight sm:text-[2.32rem]">
            {title}
          </h1>
          <p className="text-[1.05rem] sm:text-[1.16rem] text-[#b5b5b5] font-medium leading-snug">
            {artist}
          </p>
        </div>
      </div>

      <div
        className="mx-auto w-full max-w-[40rem] bg-surface border border-border px-3.5 py-3 sm:px-4 sm:py-3.5"
        style={{ borderRadius: "var(--radius-minimal)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-9 h-9 bg-text-primary flex items-center justify-center shrink-0 hover:bg-white active:scale-95 transition-all shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
            style={{ borderRadius: "var(--radius-minimal)" }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div className="flex-1 space-y-1">
            <div
              className="flex h-7 items-center gap-[1px] overflow-hidden cursor-pointer relative"
              onClick={seek}
              title="Seek"
            >
              {WAVEFORM.map((h, i) => {
                const barPos = i / WAVEFORM.length;
                const played = barPos < progress;
                return (
                  <div
                    key={i}
                    className={`flex-1 transition-colors duration-75 ${
                      played ? "bg-text-primary" : "bg-border-focus"
                    }`}
                    style={{ height: `${h}%`, borderRadius: "var(--radius-minimal)" }}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-end text-[10px] font-mono text-text-secondary font-semibold tabular-nums">
              <span>
                {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : "—:—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function formatTime(s: number): string {
  if (!isFinite(s)) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/* ─── Icons ───────────────────────────────────────────────────── */

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="#000">
      <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="#000">
      <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
      <rect x="6" y="1" width="2.5" height="8" rx="0.5" />
    </svg>
  );
}

/* ─── Static waveform shape ───────────────────────────────────── */

const WAVEFORM = [
  30, 55, 70, 45, 80, 60, 35, 75, 50, 65, 40, 85, 55, 70, 45, 80, 30, 60, 75,
  50, 65, 40, 55, 70, 80, 45, 60, 35, 75, 50, 30, 55, 70, 45, 80, 60, 35, 75,
  50, 65,
];
