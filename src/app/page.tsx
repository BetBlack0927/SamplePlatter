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
    <div className="flex-1 flex flex-col items-center px-4 pt-8 pb-12">
      <div className="w-full max-w-xs space-y-4">

        {/* Date label */}
        <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-text-muted text-center">
          {todayLabel}
        </p>

        {/* Artwork */}
        <div className="aspect-square w-full rounded-sm overflow-hidden">
          <CoverArt seed={sample ? `sample-${sample.id}` : `no-sample-${today}`} />
        </div>

        {/* Sample title + artist */}
        <div className="text-center space-y-0.5">
          <p className="text-[9px] font-mono tracking-[0.2em] uppercase text-accent">
            Today&apos;s Sample
          </p>
          {sample ? (
            <>
              <h1 className="text-xl font-bold text-text-primary leading-tight">
                {sample.title}
              </h1>
              <p className="text-sm text-text-secondary">{sample.artist}</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-text-primary leading-tight">
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
                className="flex-1 flex items-center justify-center gap-2 bg-accent text-black text-xs font-mono font-bold py-2.5 rounded-sm hover:bg-accent/90 active:scale-[0.98] transition-all"
              >
                <UploadIcon />
                Sign in to Submit
              </Link>
            )
          ) : (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 bg-surface border border-border text-text-muted text-xs font-mono font-bold py-2.5 rounded-sm cursor-not-allowed"
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

        {/* Session indicator */}
        {username && (
          <p className="text-center text-[10px] font-mono text-text-muted">
            Signed in as{" "}
            <Link
              href={`/profile/${username}`}
              className="text-text-secondary hover:text-accent transition-colors"
            >
              @{username}
            </Link>
          </p>
        )}

        {/* Prompt details */}
        {sample && (
          <div className="border border-border rounded-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted">
                Prompt Details
              </span>
            </div>
            <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {sample.tags?.length > 0 && (
                <MetaRow label="Genre" value={sample.tags.join(" / ")} />
              )}
              {sample.bpm && (
                <MetaRow label="BPM" value={String(sample.bpm)} mono />
              )}
              {sample.key && <MetaRow label="Key" value={sample.key} mono />}
            </div>
            <div className="px-3 py-2 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-text-secondary">
                {/* flip count will come from real data once submissions query is wired */}
                Flips submitted today
              </span>
              <Link
                href="/listen"
                className="text-[11px] font-mono text-accent hover:text-accent/80 transition-colors"
              >
                Listen →
              </Link>
            </div>
          </div>
        )}

        {/* Countdown */}
        {sample && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                Closes in
              </span>
              <span className="text-xs font-mono text-text-secondary tabular-nums">
                <CountdownLabel />
              </span>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              resets midnight UTC
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

/* ─── MetaRow ────────────────────────────────────────────────── */

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] font-mono uppercase tracking-widest text-text-muted mb-0.5">
        {label}
      </p>
      <p className={`text-xs text-text-primary ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
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


