import type { Metadata } from "next";
import Link from "next/link";
import { CoverArt } from "@/components/CoverArt";
import { UploadButton } from "@/components/UploadButton";
import { SamplePlayer } from "@/components/SamplePlayer";
import { DownloadButton } from "@/components/DownloadButton";
import { getCurrentSession, getTodaySample } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Today",
};

export default async function TodayPage() {
  const [session, sample] = await Promise.all([
    getCurrentSession(),
    getTodaySample(),
  ]);

  const isAuthenticated = !!session;
  const username = session?.profile?.username ?? null;
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex-1 flex flex-col items-center px-4 sm:px-8 lg:px-12 xl:px-16 pt-6 pb-10">
      <div className="w-full max-w-lg space-y-3">

        {/* Date label */}
        <p className="text-[9px] font-mono tracking-[0.25em] uppercase text-text-muted">
          {todayLabel}
        </p>

        {/* Artwork - larger, more dominant */}
        <div className="aspect-square w-full overflow-hidden" style={{ borderRadius: 'var(--radius-minimal)' }}>
          <CoverArt seed={sample ? `sample-${sample.id}` : `no-sample-${today}`} />
        </div>

        {/* Sample title + artist - stronger hierarchy */}
        <div className="space-y-1">
          <p className="text-[8px] font-mono tracking-[0.25em] uppercase text-text-muted">
            Today&apos;s Sample
          </p>
          {sample ? (
            <>
              <h1 className="text-2xl font-bold text-text-primary leading-[1.15] tracking-tight">
                {sample.title}
              </h1>
              <p className="text-base text-text-secondary font-medium">{sample.artist}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-text-primary leading-[1.15] tracking-tight">
                No sample today
              </h1>
              <p className="text-sm text-text-muted">Check back soon</p>
            </>
          )}
        </div>

        {/* Audio player */}
        {sample && sample.audio_url && (
          <SamplePlayer audioUrl={sample.audio_url} />
        )}

        {/* CTAs */}
        <div className="flex gap-2 items-center">
          {sample ? (
            isAuthenticated && session?.user ? (
              <UploadButton
                sampleId={sample.id}
                userId={session.user.id}
                activeDate={today}
              />
            ) : (
              <Link
                href="/sign-in"
                className="flex-1 btn btn-primary btn-md uppercase tracking-wider"
              >
                <UploadIcon />
                Sign in to Submit
              </Link>
            )
          ) : (
            <button
              disabled
              className="flex-1 btn btn-secondary btn-md cursor-not-allowed"
            >
              No sample today
            </button>
          )}
          {sample && (
            <DownloadButton
              audioUrl={sample.audio_url}
              storagePath={sample.storage_path}
              title={sample.title}
            />
          )}
        </div>

        {/* Minimal footer - countdown + listen link */}
        {sample && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-text-muted">
                Closes in
              </span>
              <span className="text-[11px] font-mono text-text-secondary tabular-nums font-semibold">
                <CountdownLabel />
              </span>
            </div>
            <Link
              href="/listen"
              className="text-[10px] font-mono font-bold text-text-primary hover:text-white transition-colors uppercase tracking-wide underline underline-offset-2"
            >
              Listen →
            </Link>
          </div>
        )}

        {/* Session indicator */}
        {username && (
          <p className="text-center text-[9px] font-mono text-text-muted pt-1">
            Signed in as{" "}
            <Link
              href={`/profile/${username}`}
              className="text-text-secondary hover:text-text-primary transition-colors font-semibold"
            >
              @{username}
            </Link>
          </p>
        )}

      </div>
    </div>
  );
}

/* ─── Countdown (static — replace with a client component for live ticking) ── */

function CountdownLabel() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  const h = Math.floor(diffMs / 3_600_000);
  const m = Math.floor((diffMs % 3_600_000) / 60_000);
  const s = Math.floor((diffMs % 60_000) / 1_000);
  return <>{`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`}</>;
}

/* ─── Icons ─────────────────────────────────────────────────── */

function UploadIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M6 9V2M3 4.5l3-3 3 3M1 9.5v1a.5.5 0 00.5.5h9a.5.5 0 00.5-.5v-1" />
    </svg>
  );
}


