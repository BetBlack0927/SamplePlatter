import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import type { Profile, Sample, Submission } from "@/types/database";
import {
  buildProducerBattleStats,
  buildSubmissionBattleStats,
  getPairKey,
  sortBattleStats,
  type ProducerBattleStats,
  type SubmissionBattleStats,
} from "@/lib/battles";

/* ─── Auth types ─────────────────────────────────────────────── */

export interface AuthUser {
  id: string;
  email: string;
}

export interface SessionData {
  user: AuthUser;
  /** null only if the DB trigger hasn't run yet (race condition on first sign-up) */
  profile: Profile | null;
}

/* ─── Auth queries ───────────────────────────────────────────── */

const getCurrentSessionCached = cache(async (): Promise<SessionData | null> => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile: (data as Profile | null) ?? null,
  };
});

export async function getCurrentSession(): Promise<SessionData | null> {
  return getCurrentSessionCached();
}

export async function getIsAuthenticated(): Promise<boolean> {
  return !!(await getCurrentSession());
}

/* ─── Sample queries ─────────────────────────────────────────── */

export async function getTodaySample(): Promise<Sample | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("samples")
    .select("*")
    .eq("active_date", today)
    .single();

  return (data as Sample | null) ?? null;
}

/* ─── Leaderboard period type ────────────────────────────────── */

export type LeaderboardPeriod = "today" | "week" | "alltime";

/**
 * Returns an ISO timestamp for the start of the given period in UTC,
 * or null for "alltime".
 *
 * - today   → 00:00:00 UTC of the current date
 * - week    → 00:00:00 UTC seven days ago
 * - alltime → null (no date filter)
 */
function periodStartISO(period: LeaderboardPeriod): string | null {
  if (period === "alltime") return null;

  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  if (period === "week") d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString();
}

/* ─── Shared submission fetcher ──────────────────────────────── */

export type SubmissionSort = "top" | "new";

interface FetchSubmissionsOptions {
  /** Filter to a specific sample */
  sampleId?: string;
  /** Only return submissions created at or after this ISO timestamp */
  since?: string | null;
  /** Populate liked_by_user for this user */
  userId?: string;
  /** Max rows to return */
  limit?: number;
  /**
   * top (default) = order by like_count DESC then created_at DESC
   * new           = order by created_at DESC only
   */
  sort?: SubmissionSort;
}

/**
 * Internal query helper shared by getSubmissionsForSample and
 * getTopSubmissions. Uses the submissions_with_likes view for real like counts.
 * Ordered by like_count DESC then created_at DESC.
 */
async function fetchSubmissions(
  opts: FetchSubmissionsOptions
): Promise<Submission[]> {
  const supabase = await createClient();

  const sort = opts.sort ?? "top";

  // Build query — cast to any to avoid Database-generic "never" inference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = (supabase.from("submissions_with_likes") as any).select("*");

  // Apply sort before filters so PostgREST can plan efficiently
  if (sort === "new") {
    q = q.order("created_at", { ascending: false });
  } else {
    q = q.order("like_count", { ascending: false }).order("created_at", { ascending: false });
  }

  if (opts.sampleId) q = q.eq("sample_id", opts.sampleId);
  if (opts.since) q = q.gte("created_at", opts.since);
  if (opts.limit) q = q.limit(opts.limit);

  const { data: rows } = await q;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedRows = (rows as any[]) ?? [];
  if (typedRows.length === 0) return [];

  // Profiles — one round-trip for all submitters
  const userIds = [...new Set(typedRows.map((r) => r.user_id as string))];
  const profilesPromise = supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  const profileMap = new Map(
    []
  );

  const likesPromise = opts.userId
    ? supabase
        .from("likes")
        .select("submission_id")
        .eq("user_id", opts.userId)
        .in("submission_id", typedRows.map((r) => r.id as string))
    : Promise.resolve({ data: null });

  const [{ data: profiles }, { data: userLikes }] = await Promise.all([
    profilesPromise,
    likesPromise,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((profiles as any[]) ?? []).forEach((p) => profileMap.set(p.id, p as Profile));

  const likedSet = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((userLikes as any[]) ?? []).forEach((l) => likedSet.add(l.submission_id));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typedRows.map((row: any) => ({
    ...(row as Omit<Submission, "profile" | "like_count" | "liked_by_user">),
    profile: profileMap.get(row.user_id) ?? undefined,
    like_count: row.like_count ?? 0,
    liked_by_user: likedSet.has(row.id),
  })) as Submission[];
}

/* ─── Public submission queries ──────────────────────────────── */

/**
 * All submissions for a specific sample, ranked by likes.
 * Used by the Listen page.
 */
export async function getSubmissionsForSample(
  sampleId: string,
  userId?: string,
  sort: SubmissionSort = "top"
): Promise<Submission[]> {
  return fetchSubmissions({ sampleId, userId, sort });
}

/**
 * Gets unreviewed submissions for the Listen/Swipe page.
 * Excludes submissions the user has already reviewed (liked or skipped).
 * Optionally excludes the user's own submissions.
 */
export async function getUnreviewedSubmissions(
  sampleId: string,
  userId?: string,
  excludeOwnSubmissions: boolean = true
): Promise<Submission[]> {
  const supabase = await createClient();

  // Get all reviewed submission IDs for this user
  const reviewedIds: string[] = [];
  if (userId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reviews } = await (supabase.from("submission_reviews") as any)
      .select("submission_id")
      .eq("user_id", userId);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((reviews as any[]) ?? []).forEach((r) => reviewedIds.push(r.submission_id));
  }

  // Fetch all submissions for the sample
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = (supabase.from("submissions_with_likes") as any)
    .select("*")
    .eq("sample_id", sampleId)
    .order("created_at", { ascending: false });

  // Exclude user's own submissions if requested
  if (userId && excludeOwnSubmissions) {
    q = q.neq("user_id", userId);
  }

  const { data: rows } = await q;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedRows = (rows as any[]) ?? [];

  // Filter out reviewed submissions
  const unreviewedRows = typedRows.filter(
    (r) => !reviewedIds.includes(r.id as string)
  );

  if (unreviewedRows.length === 0) return [];

  // Fetch profiles for all submitters
  const userIds = [...new Set(unreviewedRows.map((r) => r.user_id as string))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  const profileMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((profiles as any[]) ?? []).map((p) => [p.id, p as Profile])
  );

  // Fetch liked set for current user
  const likedSet = new Set<string>();
  if (userId) {
    const submissionIds = unreviewedRows.map((r) => r.id as string);
    const { data: userLikes } = await supabase
      .from("likes")
      .select("submission_id")
      .eq("user_id", userId)
      .in("submission_id", submissionIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((userLikes as any[]) ?? []).forEach((l) => likedSet.add(l.submission_id));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return unreviewedRows.map((row: any) => ({
    ...(row as Omit<Submission, "profile" | "like_count" | "liked_by_user">),
    profile: profileMap.get(row.user_id) ?? undefined,
    like_count: row.like_count ?? 0,
    liked_by_user: likedSet.has(row.id),
  })) as Submission[];
}

export async function getBattleCandidates(
  sampleId: string,
  userId?: string
): Promise<Submission[]> {
  const submissions = await fetchSubmissions({
    sampleId,
    userId,
    sort: "new",
    limit: 48,
  });

  if (!userId) return submissions;
  return submissions.filter((submission) => submission.user_id !== userId);
}

export async function getSeenBattlePairKeys(
  submissionIds: string[],
  userId?: string
): Promise<string[]> {
  if (!userId || submissionIds.length < 2) return [];

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("battle_votes") as any)
    .select("left_submission_id, right_submission_id")
    .eq("voter_user_id", userId)
    .in("left_submission_id", submissionIds)
    .in("right_submission_id", submissionIds);

  if (error || !data) return [];

  return [
    ...new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any[]).map((row) => getPairKey(row.left_submission_id, row.right_submission_id))
    ),
  ];
}

/* ─── Profile queries ───────────────────────────────────────── */

export interface ProfileStats {
  totalFlips: number;
  totalLikes: number;
  /** Consecutive calendar days (UTC) with at least one submission ending today
   *  or yesterday. Returns 0 if the user hasn't submitted recently. */
  streak: number;
}

export interface ProfilePageData {
  profile: Profile;
  stats: ProfileStats;
  submissions: Submission[];
}

/**
 * Returns full profile page data for a username, or null if not found.
 * Single function keeps all profile-related queries in one place.
 */
export async function getProfilePageData(
  username: string,
  currentUserId?: string
): Promise<ProfilePageData | null> {
  const viewerSessionPromise =
    currentUserId === undefined ? getCurrentSession() : Promise.resolve(null);
  const supabase = await createClient();

  // 1. Resolve profile by username
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profileData) return null;
  const profile = profileData as Profile;

  // 2. Fetch this user's submissions with like counts (newest first)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase.from("submissions_with_likes") as any)
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedRows = (rows as any[]) ?? [];

  const resolvedCurrentUserId =
    currentUserId ?? (await viewerSessionPromise)?.user.id;

  // 3. Stats — computed from the rows we already fetched (no extra queries)
  const totalFlips = typedRows.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalLikes = typedRows.reduce((sum: number, r: any) => sum + (r.like_count ?? 0), 0);
  const streak = calcStreak(typedRows.map((r) => r.created_at as string));

  // 4. Liked set for current viewer
  const likedSet = new Set<string>();
  const sampleIds = [...new Set(typedRows.map((r) => r.sample_id as string))];
  const likesPromise =
    resolvedCurrentUserId && typedRows.length > 0
      ? supabase
          .from("likes")
          .select("submission_id")
          .eq("user_id", resolvedCurrentUserId)
          .in("submission_id", typedRows.map((r) => r.id as string))
      : Promise.resolve({ data: null });
  const samplesPromise =
    sampleIds.length > 0
      ? supabase
      .from("samples")
      .select("id, title, active_date")
          .in("id", sampleIds)
      : Promise.resolve({ data: null });

  const [{ data: userLikes }, { data: samples }] = await Promise.all([
    likesPromise,
    samplesPromise,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((userLikes as any[]) ?? []).forEach((l) => likedSet.add(l.submission_id));

  // 5. Sample titles (one query for all distinct samples used)
  const sampleMap = new Map<string, { title: string; active_date: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((samples as any[]) ?? []).forEach((s: any) =>
    sampleMap.set(s.id, { title: s.title, active_date: s.active_date })
  );

  // 6. Assemble Submission objects
  const submissions: Submission[] = typedRows.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row: any): Submission => ({
      ...(row as Omit<Submission, "profile" | "like_count" | "liked_by_user" | "sample">),
      profile,
      like_count: row.like_count ?? 0,
      liked_by_user: likedSet.has(row.id),
      sample: sampleMap.get(row.sample_id),
    })
  );

  return { profile, stats: { totalFlips, totalLikes, streak }, submissions };
}

/**
 * Counts consecutive calendar days (UTC) that have at least one submission,
 * starting from the most recent submission and working backwards.
 * The streak is active only if the user submitted today or yesterday.
 */
function calcStreak(createdAts: string[]): number {
  if (createdAts.length === 0) return 0;

  const toDate = (iso: string) => iso.split("T")[0]; // "YYYY-MM-DD"
  const addDays = (date: string, n: number) => {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().split("T")[0];
  };

  const today = toDate(new Date().toISOString());
  const yesterday = addDays(today, -1);

  // Unique dates, sorted descending
  const dates = [...new Set(createdAts.map(toDate))].sort().reverse();

  // Streak must start from today or yesterday to be "active"
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if (dates[i] === addDays(dates[i - 1], -1)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/* ─── Leaderboard queries ────────────────────────────────────── */

export interface LeaderboardData {
  topFlips: SubmissionBattleStats[];
  topProducers: ProducerBattleStats[];
  period: LeaderboardPeriod;
}

function isMissingBattleTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? error.code : undefined;
  const message = "message" in error ? String(error.message ?? "") : "";
  const normalizedMessage = message.toLowerCase();

  return (
    code === "42P01" ||
    normalizedMessage.includes("battle_votes") ||
    normalizedMessage.includes("battle_matchups")
  );
}

/**
 * Top flips (by like count) and top producers (by total likes) for the
 * given time period.
 *
 * Period date filtering applied to submission created_at:
 *   today   → submissions created today (UTC midnight to now)
 *   week    → submissions created in the last 7 days
 *   alltime → all submissions ever
 *
 * Like counts are always all-time totals for each submission — we rank
 * submissions that were created within the period, by their cumulative likes.
 */
export async function getLeaderboardData(
  period: LeaderboardPeriod = "today",
  userId?: string // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<LeaderboardData> {
  const since = periodStartISO(period);
  const supabase = await createClient();
  const minimumBattles = 3;

  // Top producers — aggregate likes per user across the same period
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let voteQuery: any = (supabase.from("battle_votes") as any).select(
      "winner_submission_id, loser_submission_id, created_at"
    );

    if (since) {
      voteQuery = voteQuery.gte("created_at", since);
    }

    const { data: voteRows, error: voteError } = await voteQuery;

    if (voteError) {
      return { topFlips: [], topProducers: [], period };
    }

    const votes = (voteRows ?? []) as {
      winner_submission_id: string;
      loser_submission_id: string;
      created_at: string;
    }[];

    if (votes.length === 0) {
      return { topFlips: [], topProducers: [], period };
    }

    const submissionIds = [
      ...new Set(
        votes.flatMap((vote) => [vote.winner_submission_id, vote.loser_submission_id])
      ),
    ];

    const submissions = await fetchSubmissions({ limit: 200, sort: "new" });
    const relevantSubmissions = submissions.filter((submission) =>
      submissionIds.includes(submission.id)
    );

    if (relevantSubmissions.length === 0) {
      return { topFlips: [], topProducers: [], period };
    }

    const submissionStats = buildSubmissionBattleStats(votes, relevantSubmissions);
    const producerStats = buildProducerBattleStats(submissionStats);

    const rankedFlips = submissionStats.filter(
      (entry) => entry.battlesPlayed >= minimumBattles
    );
    const rankedProducers = producerStats.filter(
      (entry) => entry.battlesPlayed >= minimumBattles
    );

    return {
      topFlips: sortBattleStats(
        rankedFlips.length > 0 ? rankedFlips : submissionStats
      ).slice(0, 10),
      topProducers: sortBattleStats(
        rankedProducers.length > 0 ? rankedProducers : producerStats
      ).slice(0, 10),
      period,
    };
  } catch (error) {
    if (isMissingBattleTableError(error)) {
      return { topFlips: [], topProducers: [], period };
    }

    console.error("getLeaderboardData battle mode failed:", error);
    return { topFlips: [], topProducers: [], period };
  }
}
