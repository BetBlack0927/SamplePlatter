"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/supabase/queries";
import { revalidatePath } from "next/cache";

export type ReviewAction = "liked" | "skipped";

export interface SaveReviewResult {
  success: boolean;
  error?: string;
}

/**
 * Saves a user's review action (like or skip) for a submission.
 * Uses upsert to handle potential race conditions.
 */
export async function saveReview(
  submissionId: string,
  action: ReviewAction
): Promise<SaveReviewResult> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    const supabase = await createClient();

    // Upsert review (insert or update if exists)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("submission_reviews") as any).upsert(
      {
        user_id: session.user.id,
        submission_id: submissionId,
        action,
      },
      {
        onConflict: "user_id,submission_id",
      }
    );

    if (error) {
      console.error("Save review error:", error);
      return { success: false, error: "Failed to save review" };
    }

    // Revalidate listen page to refresh queue
    revalidatePath("/listen");

    return { success: true };
  } catch (err) {
    console.error("saveReview exception:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Gets the list of submission IDs the user has already reviewed.
 * Used to filter the queue on the client side if needed.
 */
export async function getReviewedSubmissionIds(
  userId: string
): Promise<string[]> {
  try {
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("submission_reviews") as any)
      .select("submission_id")
      .eq("user_id", userId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data as any[]) ?? []).map((r) => r.submission_id as string);
  } catch (err) {
    console.error("getReviewedSubmissionIds exception:", err);
    return [];
  }
}
