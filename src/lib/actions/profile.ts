"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface UpdateProfileResult {
  success: boolean;
  error?: string;
}

/**
 * Update the authenticated user's profile (display_name, bio, avatar_url).
 * Avatar URL should be pre-uploaded to Supabase Storage before calling this.
 */
export async function updateProfile(formData: FormData): Promise<UpdateProfileResult> {
  try {
    const supabase = await createClient();

    // 1. Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // 2. Extract fields from form data
    const displayName = formData.get("display_name") as string | null;
    const bio = formData.get("bio") as string | null;
    const avatarUrl = formData.get("avatar_url") as string | null;

    // 3. Validate bio length
    if (bio && bio.length > 160) {
      return { success: false, error: "Bio must be 160 characters or less" };
    }

    // 4. Build update object
    const updates: {
      display_name?: string;
      bio?: string | null;
      avatar_url?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (displayName !== null && displayName.trim()) {
      updates.display_name = displayName.trim();
    }

    if (bio !== null) {
      updates.bio = bio.trim() || null;
    }

    if (avatarUrl !== null) {
      updates.avatar_url = avatarUrl || null;
    }

    // 5. Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      return { success: false, error: "Failed to update profile" };
    }

    // 6. Get username for revalidation
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (profile) {
      revalidatePath(`/profile/${profile.username}`);
    }

    return { success: true };
  } catch (err) {
    console.error("updateProfile exception:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}
