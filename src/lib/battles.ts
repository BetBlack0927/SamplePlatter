import type { Submission } from "@/types/database";

export interface BattleMatchup {
  id: string;
  left: Submission;
  right: Submission;
  pairKey: string;
}

export interface SubmissionBattleStats {
  submission: Submission;
  wins: number;
  losses: number;
  battlesPlayed: number;
  winRate: number;
}

export interface ProducerBattleStats {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalWins: number;
  totalLosses: number;
  battlesPlayed: number;
  winRate: number;
}

export interface BattleVoteRow {
  winner_submission_id: string;
  loser_submission_id: string;
  created_at: string;
}

export function createMatchupId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `battle-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getPairKey(leftId: string, rightId: string) {
  return [leftId, rightId].sort().join(":");
}

export function buildBattleMatchup(
  left: Submission,
  right: Submission,
  matchupId = createMatchupId()
): BattleMatchup {
  return {
    id: matchupId,
    left,
    right,
    pairKey: getPairKey(left.id, right.id),
  };
}

export function pickNextBattleMatchup(
  submissions: Submission[],
  options?: {
    seenPairKeys?: Iterable<string>;
    exposureBySubmission?: Map<string, number>;
    excludeIds?: Iterable<string>;
  }
): BattleMatchup | null {
  if (submissions.length < 2) return null;

  const seenPairKeys = new Set(options?.seenPairKeys ?? []);
  const excludeIds = new Set(options?.excludeIds ?? []);
  const exposureBySubmission = options?.exposureBySubmission ?? new Map<string, number>();

  const eligible = submissions.filter((submission) => !excludeIds.has(submission.id));
  if (eligible.length < 2) return null;

  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const minExposure = Math.min(
    ...shuffled.map((submission) => exposureBySubmission.get(submission.id) ?? 0)
  );

  const primaryPool = shuffled.filter(
    (submission) => (exposureBySubmission.get(submission.id) ?? 0) === minExposure
  );
  const left = primaryPool[Math.floor(Math.random() * primaryPool.length)];

  const remaining = shuffled.filter((submission) => submission.id !== left.id);
  const unseenCandidates = remaining.filter(
    (submission) => !seenPairKeys.has(getPairKey(left.id, submission.id))
  );
  if (unseenCandidates.length === 0) return null;

  const lowestOpponentExposure = Math.min(
    ...unseenCandidates.map((submission) => exposureBySubmission.get(submission.id) ?? 0)
  );
  const balancedOpponents = unseenCandidates.filter(
    (submission) =>
      (exposureBySubmission.get(submission.id) ?? 0) === lowestOpponentExposure
  );
  const right =
    balancedOpponents[Math.floor(Math.random() * balancedOpponents.length)] ??
    unseenCandidates[0];

  if (!right) return null;

  return Math.random() > 0.5
    ? buildBattleMatchup(left, right)
    : buildBattleMatchup(right, left);
}

export function incrementExposure(
  exposureBySubmission: Map<string, number>,
  submissionIds: string[]
) {
  submissionIds.forEach((submissionId) => {
    exposureBySubmission.set(
      submissionId,
      (exposureBySubmission.get(submissionId) ?? 0) + 1
    );
  });
}

export function buildSubmissionBattleStats(
  votes: BattleVoteRow[],
  submissions: Submission[]
): SubmissionBattleStats[] {
  const submissionMap = new Map(submissions.map((submission) => [submission.id, submission]));
  const recordMap = new Map<string, { wins: number; losses: number }>();

  votes.forEach((vote) => {
    const winnerRecord = recordMap.get(vote.winner_submission_id) ?? { wins: 0, losses: 0 };
    winnerRecord.wins += 1;
    recordMap.set(vote.winner_submission_id, winnerRecord);

    const loserRecord = recordMap.get(vote.loser_submission_id) ?? { wins: 0, losses: 0 };
    loserRecord.losses += 1;
    recordMap.set(vote.loser_submission_id, loserRecord);
  });

  return [...recordMap.entries()]
    .map(([submissionId, record]) => {
      const submission = submissionMap.get(submissionId);
      if (!submission) return null;

      const battlesPlayed = record.wins + record.losses;
      const winRate = battlesPlayed > 0 ? record.wins / battlesPlayed : 0;

      return {
        submission,
        wins: record.wins,
        losses: record.losses,
        battlesPlayed,
        winRate,
      } satisfies SubmissionBattleStats;
    })
    .filter((entry): entry is SubmissionBattleStats => entry !== null);
}

export function buildProducerBattleStats(
  submissionStats: SubmissionBattleStats[]
): ProducerBattleStats[] {
  const producerMap = new Map<
    string,
    {
      userId: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      totalWins: number;
      totalLosses: number;
      battlesPlayed: number;
    }
  >();

  submissionStats.forEach((stat) => {
    const profile = stat.submission.profile;
    if (!profile) return;

    const current = producerMap.get(profile.id) ?? {
      userId: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      totalWins: 0,
      totalLosses: 0,
      battlesPlayed: 0,
    };

    current.totalWins += stat.wins;
    current.totalLosses += stat.losses;
    current.battlesPlayed += stat.battlesPlayed;

    producerMap.set(profile.id, current);
  });

  return [...producerMap.values()].map((producer) => ({
    ...producer,
    winRate:
      producer.battlesPlayed > 0 ? producer.totalWins / producer.battlesPlayed : 0,
  }));
}

export function sortBattleStats<T extends { winRate: number; wins?: number; totalWins?: number }>(
  rows: T[]
) {
  return [...rows].sort((a, b) => {
    const winDelta = b.winRate - a.winRate;
    if (Math.abs(winDelta) > 0.0001) return winDelta;

    const aWins = "wins" in a ? (a.wins ?? 0) : (a.totalWins ?? 0);
    const bWins = "wins" in b ? (b.wins ?? 0) : (b.totalWins ?? 0);
    return bWins - aWins;
  });
}
