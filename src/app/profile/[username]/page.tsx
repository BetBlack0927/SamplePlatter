import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { SubmissionCard } from "@/components/SubmissionCard";
import { ProfileHeader } from "@/components/ProfileHeader";
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

  const sessionPromise = getCurrentSession();
  const pageDataPromise = getProfilePageData(username);
  const [session, pageData] = await Promise.all([sessionPromise, pageDataPromise]);

  if (!pageData) notFound();

  const { profile, stats, submissions } = pageData;
  const isAuthenticated = !!session;
  const isOwnProfile = session?.user.id === profile.id;

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* ── Profile header ───────────────────────────────────── */}
        <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} stats={stats} />

        {/* ── Submissions ──────────────────────────────────────── */}
        <div>
          <SectionHeader title="Flips" count={submissions.length} />

          {submissions.length === 0 ? (
            <EmptyFlips isOwnProfile={isOwnProfile} />
          ) : (
            <div className="space-y-0.5">
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
          <span className="text-[10px] font-mono text-text-secondary font-semibold tabular-nums">
            {formatDate(submission.sample.active_date)}
          </span>
          <span className="text-text-muted text-[10px]">·</span>
          <Link
            href="/"
            prefetch={true}
            className="text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors truncate"
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
    <div className="py-12 flex flex-col items-center gap-2.5 border border-dashed border-border text-center" style={{ borderRadius: 'var(--radius-minimal)' }}>
      <p className="text-sm text-text-secondary font-semibold">No flips yet</p>
      <p className="text-[11px] font-mono text-text-muted">
        {isOwnProfile
          ? "Submit your first flip on the Today page."
          : "This producer hasn't submitted yet."}
      </p>
      {isOwnProfile && (
        <Link
          href="/"
          className="mt-2 text-[11px] font-mono font-bold text-text-primary hover:text-white transition-colors tracking-[0.12em] underline underline-offset-2"
        >
          Go to Today →
        </Link>
      )}
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
