"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/supabase/queries";
import type { Submission } from "@/types/database";

export interface CreateSubmissionInput {
  sampleId: string;
  title: string;
  audioUrl: string;
  storagePath: string;
  durationSeconds: number | null;
}

export interface CreateSubmissionResult {
  data?: Submission;
  error?: string;
}

/**
 * Inserts a submission row after the audio file has already been uploaded to
 * Supabase Storage by the browser. Auth is re-verified server-side.
 */
export async function createSubmission(
  input: CreateSubmissionInput
): Promise<CreateSubmissionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { error: "You must be signed in to submit." };
  }

  const { sampleId, title, audioUrl, storagePath, durationSeconds } = input;

  if (!title.trim()) {
    return { error: "Track title is required." };
  }
  if (!audioUrl || !storagePath) {
    return { error: "Audio file is required." };
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("submissions") as any)
    .insert({
      sample_id: sampleId,
      user_id: session.user.id,
      title: title.trim(),
      audio_url: audioUrl,
      storage_path: storagePath,
      duration_seconds: durationSeconds,
    })
    .select("*")
    .single();

  if (error) {
    // Unique constraint: user already submitted for this sample
    if (error.code === "23505") {
      return { error: "You've already submitted a flip for today's sample." };
    }
    return { error: error.message };
  }

  return { data: data as Submission };
}
