import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/PageContainer";
import { SubmissionCard } from "@/components/SubmissionCard";
import { SectionHeader } from "@/components/SectionHeader";
import { CoverArt } from "@/components/CoverArt";
import { getCurrentSession, getArchiveDayData } from "@/lib/supabase/queries";

interface Props {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  return { title: `Archive · ${date}` };
}

export default async function ArchiveDayPage({ params }: Props) {
  const { date } = await params;

  // Validate date format to avoid spurious DB calls
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const session = await getCurrentSession();
  const data = await getArchiveDayData(date, session?.user.id);

  if (!data) notFound();

  const { sample, submissions } = data;
  const isAuthenticated = !!session;

  const formattedDate = new Date(date + "T00:00:00Z").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }
  );

  return (
    <PageContainer>
      <div className="space-y-8">

        {/* Back link */}
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7.5 2.5L4 6l3.5 3.5" />
          </svg>
          Archive
        </Link>

        {/* Sample header */}
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24">
            <CoverArt seed={sample.id} className="w-full h-full rounded-sm" />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1">
                {formattedDate}
              </p>
              <h1 className="text-xl font-bold text-text-primary leading-tight">
                {sample.title}
              </h1>
              <p className="text-sm text-text-secondary mt-0.5">{sample.artist}</p>
            </div>

            {/* Meta pills */}
            <div className="flex flex-wrap items-center gap-2">
              {sample.bpm && (
                <MetaPill label="BPM" value={String(sample.bpm)} />
              )}
              {sample.key && (
                <MetaPill label="Key" value={sample.key} />
              )}
              {sample.tags.length > 0 && sample.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm bg-surface border border-border text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Submissions */}
        <div>
          <SectionHeader
            title="Flips"
            count={submissions.length}
          />

          {submissions.length === 0 ? (
            <EmptyFlips />
          ) : (
            <div className="space-y-1">
              {submissions.map((submission, i) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  rank={i + 1}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </PageContainer>
  );
}

/* ─── Meta pill ─────────────────────────────────────────────── */

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-sm bg-surface border border-border">
      <span className="text-text-muted uppercase tracking-widest">{label}</span>
      <span className="text-text-secondary">{value}</span>
    </span>
  );
}

/* ─── Empty state ───────────────────────────────────────────── */

function EmptyFlips() {
  return (
    <div className="py-14 flex flex-col items-center gap-2 border border-dashed border-border rounded-sm text-center">
      <p className="text-sm text-text-secondary font-medium">No flips for this drop</p>
      <p className="text-xs font-mono text-text-muted">
        Nobody submitted a flip for this sample.
      </p>
    </div>
  );
}
