"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BattleCard } from "@/components/BattleCard";
import { BattleCharacter } from "@/components/BattleCharacter";
import { recordBattleVote } from "@/lib/actions/battles";
import {
  incrementExposure,
  pickNextBattleMatchup,
  type BattleMatchup,
} from "@/lib/battles";
import type { Submission } from "@/types/database";

type BattleSide = "left" | "right";

const RESULT_DELAY_MS = 950;

function cloneExposureMap(entries: [string, number][]) {
  return new Map(entries);
}

function getBattleSeenStorageKey(sampleId: string | null, viewerUserId?: string | null) {
  if (!sampleId) return null;
  return `freqy:battle-seen:${viewerUserId ?? "guest"}:${sampleId}`;
}

function mergeUniquePairKeys(values: Iterable<string>) {
  return [...new Set(values)];
}

function readStoredBattlePairKeys(storageKey: string | null) {
  if (!storageKey || typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return mergeUniquePairKeys(
      parsed.filter((value): value is string => typeof value === "string")
    );
  } catch (error) {
    console.error("battle session restore failed:", error);
    return [];
  }
}

export function BattleArena({
  sampleId,
  sampleTitle,
  sampleArtworkUrl,
  submissions,
  initialMatchup,
  initialSeenPairKeys,
  isAuthenticated,
  viewerUserId,
}: {
  sampleId: string | null;
  sampleTitle: string | null;
  sampleArtworkUrl?: string | null;
  submissions: Submission[];
  initialMatchup: BattleMatchup | null;
  initialSeenPairKeys?: string[];
  isAuthenticated: boolean;
  viewerUserId?: string | null;
}) {
  const leftAudioRef = useRef<HTMLAudioElement | null>(null);
  const rightAudioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const storageKey = getBattleSeenStorageKey(sampleId, viewerUserId);
  const [persistedPairKeys] = useState<string[]>(() => readStoredBattlePairKeys(storageKey));

  const [currentMatchup, setCurrentMatchup] = useState<BattleMatchup | null>(initialMatchup);
  const [playingSide, setPlayingSide] = useState<BattleSide | null>(null);
  const [resultSide, setResultSide] = useState<BattleSide | null>(null);
  const [currentTimes, setCurrentTimes] = useState<Record<BattleSide, number>>({
    left: 0,
    right: 0,
  });
  const [durations, setDurations] = useState<Record<BattleSide, number>>({
    left: initialMatchup?.left.duration_seconds ?? 0,
    right: initialMatchup?.right.duration_seconds ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seenPairKeys, setSeenPairKeys] = useState<string[]>(
    initialMatchup
      ? mergeUniquePairKeys([
          ...(initialSeenPairKeys ?? []),
          ...persistedPairKeys,
          initialMatchup.pairKey,
        ])
      : mergeUniquePairKeys([...(initialSeenPairKeys ?? []), ...persistedPairKeys])
  );
  const [exposureEntries, setExposureEntries] = useState<[string, number][]>(
    initialMatchup
      ? [
          [initialMatchup.left.id, 1],
          [initialMatchup.right.id, 1],
        ]
      : []
  );
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const reaction = useMemo(() => {
    if (resultSide === "left") return "slam-left" as const;
    if (resultSide === "right") return "slam-right" as const;
    if (playingSide === "left") return "lean-left" as const;
    if (playingSide === "right") return "lean-right" as const;
    return "idle" as const;
  }, [playingSide, resultSide]);

  function getAudio(side: BattleSide) {
    return side === "left" ? leftAudioRef.current : rightAudioRef.current;
  }

  function pauseAll() {
    leftAudioRef.current?.pause();
    rightAudioRef.current?.pause();
    setPlayingSide(null);
  }

  async function handleTogglePlayback(side: BattleSide) {
    if (!currentMatchup || isSubmitting) return;

    const activeAudio = getAudio(side);
    const otherSide: BattleSide = side === "left" ? "right" : "left";
    const otherAudio = getAudio(otherSide);

    if (!activeAudio) return;

    try {
      if (playingSide === side) {
        activeAudio.pause();
        setPlayingSide(null);
        return;
      }

      otherAudio?.pause();
      await activeAudio.play();
      setPlayingSide(side);
    } catch (playError) {
      console.error("battle playback failed:", playError);
    }
  }

  function handleScrub(side: BattleSide, value: number) {
    const audio = getAudio(side);
    if (!audio) return;

    audio.currentTime = value;
    setCurrentTimes((current) => ({ ...current, [side]: value }));
  }

  const advanceToNextMatchup = useCallback((nextSeenPairKeys = seenPairKeys) => {
    timeoutRef.current = null;

    const exposureBySubmission = cloneExposureMap(exposureEntries);
    const nextMatchup = pickNextBattleMatchup(submissions, {
      seenPairKeys: nextSeenPairKeys,
      exposureBySubmission,
    });

    if (!nextMatchup) {
      setCurrentTimes({ left: 0, right: 0 });
      setDurations({ left: 0, right: 0 });
      setPlayingSide(null);
      setResultSide(null);
      setIsSubmitting(false);
      setError(null);
      setSeenPairKeys(nextSeenPairKeys);
      setCurrentMatchup(null);
      return;
    }

    incrementExposure(exposureBySubmission, [nextMatchup.left.id, nextMatchup.right.id]);
    setExposureEntries([...exposureBySubmission.entries()]);
    setSeenPairKeys(mergeUniquePairKeys([...nextSeenPairKeys, nextMatchup.pairKey]));
    setCurrentTimes({ left: 0, right: 0 });
    setDurations({
      left: nextMatchup.left.duration_seconds ?? 0,
      right: nextMatchup.right.duration_seconds ?? 0,
    });
    setPlayingSide(null);
    setResultSide(null);
    setIsSubmitting(false);
    setError(null);
    setCurrentMatchup(nextMatchup);
  }, [exposureEntries, seenPairKeys, submissions]);

  useEffect(() => {
    if (!currentMatchup || persistedPairKeys.length === 0) return;
    if (!persistedPairKeys.includes(currentMatchup.pairKey)) return;

    window.setTimeout(() => {
      advanceToNextMatchup(
        mergeUniquePairKeys([
          ...(initialSeenPairKeys ?? []),
          ...persistedPairKeys,
          currentMatchup.pairKey,
        ])
      );
    }, 0);
  }, [advanceToNextMatchup, currentMatchup, initialSeenPairKeys, persistedPairKeys]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;

    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(seenPairKeys));
    } catch (error) {
      console.error("battle session save failed:", error);
    }
  }, [seenPairKeys, storageKey]);

  async function handlePick(side: BattleSide) {
    if (!currentMatchup || !sampleId || isSubmitting || !isAuthenticated) return;

    pauseAll();
    setError(null);
    setIsSubmitting(true);
    setResultSide(side);

    const winner = side === "left" ? currentMatchup.left : currentMatchup.right;
    const loser = side === "left" ? currentMatchup.right : currentMatchup.left;

    const result = await recordBattleVote({
      matchupId: currentMatchup.id,
      sampleId,
      leftSubmissionId: currentMatchup.left.id,
      rightSubmissionId: currentMatchup.right.id,
      winnerSubmissionId: winner.id,
      loserSubmissionId: loser.id,
    });

    if (!result.success) {
      setIsSubmitting(false);
      setResultSide(null);
      setError(result.error ?? "Could not record that battle.");
      return;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    const nextSeenPairKeys = mergeUniquePairKeys([...seenPairKeys, currentMatchup.pairKey]);
    setSeenPairKeys(nextSeenPairKeys);

    timeoutRef.current = window.setTimeout(() => {
      advanceToNextMatchup(nextSeenPairKeys);
    }, RESULT_DELAY_MS);
  }

  if (!sampleId || submissions.length < 2 || !currentMatchup) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="battle-empty-pulse flex h-14 w-14 items-center justify-center rounded-full border border-white/12 bg-white/[0.04]">
          <span className="h-2.5 w-2.5 rounded-full bg-white/80" />
        </div>
        <h2 className="mt-6 text-[2rem] font-semibold tracking-[-0.04em] text-text-primary">
          No matchups ready right now
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          More flips coming soon
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link href="/" className="btn btn-secondary btn-md rounded-full px-5">
            Back to Today
          </Link>
          {sampleTitle ? (
            <Link href="/" className="btn btn-primary btn-md rounded-full px-5">
              Upload your flip
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  const leftState =
    resultSide === "left"
      ? "winner"
      : resultSide === "right"
      ? "loser"
      : playingSide === "left"
      ? "playing"
      : "idle";

  const rightState =
    resultSide === "right"
      ? "winner"
      : resultSide === "left"
      ? "loser"
      : playingSide === "right"
      ? "playing"
      : "idle";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 sm:px-6 lg:px-8">
      <audio
        key={currentMatchup.left.id}
        ref={leftAudioRef}
        src={currentMatchup.left.audio_url}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          setDurations((current) => ({
            ...current,
            left: Number.isFinite(nextDuration) ? nextDuration : current.left,
          }));
        }}
        onTimeUpdate={(event) => {
          const nextTime = event.currentTarget.currentTime;
          setCurrentTimes((current) => ({
            ...current,
            left: nextTime,
          }));
        }}
        onPause={() =>
          setPlayingSide((current) => (current === "left" ? null : current))
        }
        onPlay={() => {
          rightAudioRef.current?.pause();
          setPlayingSide("left");
        }}
        onEnded={() => setPlayingSide((current) => (current === "left" ? null : current))}
      />

      <audio
        key={currentMatchup.right.id}
        ref={rightAudioRef}
        src={currentMatchup.right.audio_url}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          setDurations((current) => ({
            ...current,
            right: Number.isFinite(nextDuration) ? nextDuration : current.right,
          }));
        }}
        onTimeUpdate={(event) => {
          const nextTime = event.currentTarget.currentTime;
          setCurrentTimes((current) => ({
            ...current,
            right: nextTime,
          }));
        }}
        onPause={() =>
          setPlayingSide((current) => (current === "right" ? null : current))
        }
        onPlay={() => {
          leftAudioRef.current?.pause();
          setPlayingSide("right");
        }}
        onEnded={() => setPlayingSide((current) => (current === "right" ? null : current))}
      />

      <div className="grid flex-1 min-h-0 grid-cols-1 items-start gap-4 overflow-hidden lg:grid-cols-2 lg:gap-5">
        <BattleCard
          submission={currentMatchup.left}
          artworkUrl={sampleArtworkUrl ?? null}
          sideLabel="Flip A"
          state={leftState}
          currentTime={currentTimes.left}
          duration={durations.left}
          isBusy={isSubmitting}
          canPick={isAuthenticated}
          onTogglePlayback={() => handleTogglePlayback("left")}
          onScrub={(value) => handleScrub("left", value)}
          onPick={() => handlePick("left")}
        />

        <BattleCard
          submission={currentMatchup.right}
          artworkUrl={sampleArtworkUrl ?? null}
          sideLabel="Flip B"
          state={rightState}
          currentTime={currentTimes.right}
          duration={durations.right}
          isBusy={isSubmitting}
          canPick={isAuthenticated}
          onTogglePlayback={() => handleTogglePlayback("right")}
          onScrub={(value) => handleScrub("right", value)}
          onPick={() => handlePick("right")}
        />
      </div>

      <div className="shrink-0 flex flex-col items-center justify-center pt-3">
        <BattleCharacter reaction={reaction} />
        {!isAuthenticated ? (
          <p className="mt-1 text-[10px] font-mono tracking-[0.16em] text-text-muted/80">
            Sign in to cast the deciding vote.
          </p>
        ) : null}

        {error ? (
          <p className="mt-2 text-[11px] font-mono tracking-[0.14em] text-[#f08f8f]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
