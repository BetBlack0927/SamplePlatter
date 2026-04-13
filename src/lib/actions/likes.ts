"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/supabase/queries";

export interface ToggleLikeResult {
  liked: boolean;
  likeCount: number;
  error?: string;
}

/**
 * Toggles a like on a submission for the current authenticated user.
 * Inserts a row if the user hasn't liked it yet; deletes it if they have.
 * Returns the canonical liked state + fresh count from the DB.
 */
export async function toggleLike(
  submissionId: string
): Promise<ToggleLikeResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { liked: false, likeCount: 0, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const userId = session.user.id;

  // Check if this user already liked this submission
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from("likes") as any)
    .select("id")
    .eq("submission_id", submissionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Unlike
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("likes") as any)
      .delete()
      .eq("submission_id", submissionId)
      .eq("user_id", userId);

    if (error) return { liked: true, likeCount: 0, error: error.message };
  } else {
    // Like
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("likes") as any).insert({
      submission_id: submissionId,
      user_id: userId,
    });

    if (error) {
      // Unique violation means someone raced us — treat as already liked
      if (error.code === "23505") {
        return { liked: true, likeCount: 0, error: undefined };
      }
      return { liked: false, likeCount: 0, error: error.message };
    }
  }

  // Return fresh count
  const { count } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("submission_id", submissionId);

  return {
    liked: !existing,
    likeCount: count ?? 0,
  };
}
