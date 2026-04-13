import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { SubmissionCard } from "@/components/SubmissionCard";
import { getCurrentSession, getProfilePageData } from "@/lib/supabase/queries";
import type { Submission } from "@/types/database";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;

  const session = await getCurrentSession();
  const pageData = await getProfilePageData(username, session?.user.id);

  if (!pageData) notFound();

  const { profile, stats, submissions } = pageData;
  const isAuthenticated = !!session;
  const isOwnProfile = session?.user.id === profile.id;

  const initials = profile.display_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || profile.username.slice(0, 2).toUpperCase();

  return (
    <PageContainer>
      <div className="space-y-10">

        {/* ── Profile header ───────────────────────────────────── */}
        <div className="flex items-start gap-5 sm:gap-6">

          {/* Avatar */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm bg-surface border border-border shrink-0 flex items-center justify-center overflow-hidden">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-base font-mono font-semibold text-text-secondary">
                {initials}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h1 className="text-xl font-bold text-text-primary leading-tight">
                {profile.display_name}
              </h1>
              <p className="text-sm font-mono text-text-muted">
                @{profile.username}
              </p>
            </div>

            {profile.bio && (
              <p className="text-sm text-text-secondary max-w-md leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Stats */}
            <div className="flex gap-6 pt-1">
              <Stat label="Flips" value={String(stats.totalFlips)} />
              <Stat label="Likes" value={String(stats.totalLikes)} />
              {stats.streak > 0 && (
                <Stat label="Streak" value={`${stats.streak}d`} />
              )}
            </div>

            {isOwnProfile && (
              <p className="text-[10px] font-mono text-text-muted pt-1">
                This is your profile.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* ── Submissions ──────────────────────────────────────── */}
        <div>
          <SectionHeader title="Flips" count={submissions.length} />

          {submissions.length === 0 ? (
            <EmptyFlips isOwnProfile={isOwnProfile} />
          ) : (
            <div className="space-y-1">
              {submissions.map((submission) => (
                <FlipRow
                  key={submission.id}
                  submission={submission}
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

/* ─── FlipRow — SubmissionCard + optional sample label ─────── */

function FlipRow({
  submission,
  isAuthenticated,
}: {
  submission: Submission;
  isAuthenticated: boolean;
}) {
  return (
    <div>
      {submission.sample && (
        <div className="flex items-center gap-2 px-1 mb-1">
          <span className="text-[10px] font-mono text-text-muted">
            {formatDate(submission.sample.active_date)}
          </span>
          <span className="text-text-muted text-[10px]">·</span>
          <Link
            href="/"
            className="text-[10px] font-mono text-text-muted hover:text-accent transition-colors truncate"
          >
            {submission.sample.title}
          </Link>
        </div>
      )}
      <SubmissionCard submission={submission} isAuthenticated={isAuthenticated} />
    </div>
  );
}

/* ─── Empty state ───────────────────────────────────────────── */

function EmptyFlips({ isOwnProfile }: { isOwnProfile: boolean }) {
  return (
    <div className="py-14 flex flex-col items-center gap-2 border border-dashed border-border rounded-sm text-center">
      <p className="text-sm text-text-secondary font-medium">No flips yet</p>
      <p className="text-xs font-mono text-text-muted">
        {isOwnProfile
          ? "Submit your first flip on the Today page."
          : "This producer hasn't submitted yet."}
      </p>
      {isOwnProfile && (
        <Link
          href="/"
          className="mt-2 text-[11px] font-mono text-accent hover:text-accent/80 transition-colors"
        >
          Go to Today →
        </Link>
      )}
    </div>
  );
}

/* ─── Stat block ─────────────────────────────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-base font-mono font-semibold text-text-primary tabular-nums">
        {value}
      </p>
      <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
        {label}
      </p>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
