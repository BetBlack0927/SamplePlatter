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

  const previousCount = submission.play_count ?? 0;
  const { data, error } = await supabase.rpc("record_submission_play", {
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
