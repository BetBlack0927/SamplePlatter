"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/supabase/queries";

export interface RecordBattleVoteInput {
  matchupId: string;
  sampleId: string;
  leftSubmissionId: string;
  rightSubmissionId: string;
  winnerSubmissionId: string;
  loserSubmissionId: string;
}

export interface RecordBattleVoteResult {
  success: boolean;
  error?: string;
}

interface BattleSubmissionLookupRow {
  id: string;
  user_id: string;
  sample_id: string;
}

interface ExistingBattleVoteRow {
  id: string;
}

export async function recordBattleVote(
  input: RecordBattleVoteInput
): Promise<RecordBattleVoteResult> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sign in to vote in battles." };
    }

    const {
      matchupId,
      sampleId,
      leftSubmissionId,
      rightSubmissionId,
      winnerSubmissionId,
      loserSubmissionId,
    } = input;

    const submissionIds = [
      leftSubmissionId,
      rightSubmissionId,
      winnerSubmissionId,
      loserSubmissionId,
    ];

    if (
      !matchupId ||
      !sampleId ||
      submissionIds.some((value) => !value) ||
      winnerSubmissionId === loserSubmissionId ||
      leftSubmissionId === rightSubmissionId
    ) {
      return { success: false, error: "Invalid matchup data." };
    }

    const supabase = await createClient();

    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("id, user_id, sample_id")
      .in("id", [...new Set(submissionIds)]);

    if (submissionsError || !submissions || submissions.length < 2) {
      return { success: false, error: "Could not validate battle submissions." };
    }

    const submissionMap = new Map(
      ((submissions ?? []) as BattleSubmissionLookupRow[]).map((row) => [row.id, row])
    );
    const left = submissionMap.get(leftSubmissionId);
    const right = submissionMap.get(rightSubmissionId);
    const winner = submissionMap.get(winnerSubmissionId);
    const loser = submissionMap.get(loserSubmissionId);

    if (!left || !right || !winner || !loser) {
      return { success: false, error: "Battle submissions are missing." };
    }

    if (
      left.sample_id !== sampleId ||
      right.sample_id !== sampleId ||
      winner.sample_id !== sampleId ||
      loser.sample_id !== sampleId
    ) {
      return { success: false, error: "Battle submissions do not belong to this sample." };
    }

    if (winner.id !== winnerSubmissionId || loser.id !== loserSubmissionId) {
      return { success: false, error: "Winner selection is invalid." };
    }

    const matchupIds = new Set([left.id, right.id]);
    if (!matchupIds.has(winner.id) || !matchupIds.has(loser.id)) {
      return { success: false, error: "Battle winner must come from the active matchup." };
    }

    if (winner.user_id === session.user.id || loser.user_id === session.user.id) {
      return { success: false, error: "You cannot vote on your own flip." };
    }

    // De-dupe by pair, not just matchup id, so revisiting the page cannot
    // create another vote for the same two submissions.
    const { data: existingPairVotes, error: existingPairVotesError } = await supabase
      .from("battle_votes")
      .select("id")
      .eq("voter_user_id", session.user.id)
      .in("left_submission_id", [leftSubmissionId, rightSubmissionId])
      .in("right_submission_id", [leftSubmissionId, rightSubmissionId])
      .limit(1);

    if (existingPairVotesError) {
      return { success: false, error: "Could not validate prior battle votes." };
    }

    if (((existingPairVotes as ExistingBattleVoteRow[] | null) ?? []).length > 0) {
      return { success: true };
    }

    // Persist matchup context first so repeated votes can be de-duped per matchup.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: matchupError } = await (supabase.from("battle_matchups") as any).upsert(
      {
        id: matchupId,
        sample_id: sampleId,
        left_submission_id: leftSubmissionId,
        right_submission_id: rightSubmissionId,
      },
      { onConflict: "id" }
    );

    if (matchupError) {
      return { success: false, error: "Could not save battle matchup." };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: voteError } = await (supabase.from("battle_votes") as any).insert({
      matchup_id: matchupId,
      left_submission_id: leftSubmissionId,
      right_submission_id: rightSubmissionId,
      winner_submission_id: winnerSubmissionId,
      loser_submission_id: loserSubmissionId,
      voter_user_id: session.user.id,
    });

    if (voteError) {
      if (voteError.code === "23505") {
        return { success: true };
      }

      return { success: false, error: "Could not save battle vote." };
    }

    revalidatePath("/listen");
    revalidatePath("/leaderboard");

    return { success: true };
  } catch (error) {
    console.error("recordBattleVote exception:", error);
    return { success: false, error: "An unexpected battle error occurred." };
  }
}
