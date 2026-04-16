import type { Metadata } from "next";
import Link from "next/link";
import { UploadButton } from "@/components/UploadButton";
import { SamplePlayer } from "@/components/SamplePlayer";
import { DownloadButton } from "@/components/DownloadButton";
import { CountdownLabel } from "@/components/CountdownLabel";
import { getCurrentSession, getTodaySample } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Today",
};

// Revalidate every 60 seconds for better performance
export const revalidate = 60;

export default async function TodayPage() {
  const [session, sample] = await Promise.all([
    getCurrentSession(),
    getTodaySample(),
  ]);

  const isAuthenticated = !!session;
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex-1 flex flex-col items-center px-4 sm:px-8 lg:px-12 xl:px-16 pt-5 pb-8">
      <div className="w-full max-w-[52rem] space-y-4">

        {/* Date label */}
        <p className="text-center text-[10px] font-mono tracking-[0.2em] uppercase text-text-secondary">
          {todayLabel}
        </p>

        {sample && sample.audio_url ? (
          <SamplePlayer
            audioUrl={sample.audio_url}
            title={sample.title}
            artist={sample.artist}
          />
        ) : (
          <div className="space-y-2 py-10 text-center">
            <p className="text-[10px] font-mono tracking-[0.18em] uppercase text-text-secondary">
              Today&apos;s Sample
            </p>
            {sample ? (
              <>
                <h1 className="text-[2rem] font-bold text-text-primary leading-[1.1] tracking-tight sm:text-[2.15rem]">
                  {sample.title}
                </h1>
                <p className="text-lg text-text-secondary font-medium leading-snug">{sample.artist}</p>
                <p className="pt-2 text-[11px] font-mono text-text-muted">
                  Audio preview unavailable.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-[2rem] font-bold text-text-primary leading-[1.1] tracking-tight sm:text-[2.15rem]">
                  No sample today
                </h1>
                <p className="text-base text-text-secondary">Check back soon</p>
              </>
            )}
          </div>
        )}

        {/* CTAs */}
        <div className="mx-auto flex w-full max-w-[40rem] gap-2 items-center">
          {sample ? (
            isAuthenticated && session?.user ? (
              <UploadButton
                sampleId={sample.id}
                userId={session.user.id}
                activeDate={today}
                className="px-3.5 py-2 text-[10px] tracking-[0.14em]"
              />
            ) : (
              <Link
                href="/sign-in"
                className="flex-1 btn btn-primary btn-md px-3.5 py-2 text-[10px] uppercase tracking-[0.14em]"
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
              className="px-3.5 py-2 text-[10px] tracking-[0.14em]"
            />
          )}
        </div>

        {/* Minimal footer - countdown */}
        {sample && (
          <div className="mx-auto flex w-full max-w-[40rem] items-center pt-0">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-secondary">
                Closes in
              </span>
              <span className="text-[12px] font-mono text-text-primary tabular-nums font-semibold">
                <CountdownLabel />
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
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


