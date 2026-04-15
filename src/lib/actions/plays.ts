"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/supabase/queries";

export interface RecordPlayResult {
  counted: boolean;
  playCount: number;
  error?: string;
}

export async function recordSubmissionPlay(
  submissionId: string,
  sessionId: string
): Promise<RecordPlayResult> {
  if (!submissionId || !sessionId) {
    return { counted: false, playCount: 0, error: "Missing play tracking data" };
  }

  const [session, supabase] = await Promise.all([getCurrentSession(), createClient()]);

  // Get current play count so we can tell whether this request inserted a new play.
  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("play_count")
    .eq("id", submissionId)
    .single();

  if (submissionError || !submission) {
    return {
      counted: false,
      playCount: 0,
      error: submissionError?.message ?? "Submission not found",
    };
  }

  const previousCount =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((submission as any)?.play_count as number | undefined) ?? 0;
  // Database function typing is hand-authored in this repo; cast to keep builds stable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("record_submission_play", {
    p_submission_id: submissionId,
    p_session_id: sessionId,
    p_user_id: session?.user.id ?? null,
  });

  if (error) {
    return { counted: false, playCount: previousCount, error: error.message };
  }

  const nextCount = typeof data === "number" ? data : previousCount;
  return {
    counted: nextCount > previousCount,
    playCount: nextCount,
  };
}
