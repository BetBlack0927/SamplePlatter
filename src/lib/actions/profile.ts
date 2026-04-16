"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface UpdateProfileResult {
  success: boolean;
  error?: string;
}

function isMissingMusicLinkColumnError(error: { message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("soundcloud_url") ||
    message.includes("spotify_url") ||
    message.includes("column") ||
    message.includes("schema cache")
  );
}

function normalizeMusicUrl(
  value: string | null,
  allowedHosts: string[],
  label: string
): { value: string | null; error?: string } {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { value: null };

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { value: null, error: `${label} link is not a valid URL` };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    return { value: null, error: `${label} link must use ${allowedHosts[0]}` };
  }

  return { value: parsed.toString() };
}

/**
 * Update the authenticated user's profile (display_name, bio, avatar_url, music links).
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
    const soundcloudUrl = formData.get("soundcloud_url") as string | null;
    const spotifyUrl = formData.get("spotify_url") as string | null;

    // 3. Validate bio length
    if (bio && bio.length > 160) {
      return { success: false, error: "Bio must be 160 characters or less" };
    }

    const normalizedSoundcloud = normalizeMusicUrl(
      soundcloudUrl,
      ["soundcloud.com"],
      "SoundCloud"
    );
    if (normalizedSoundcloud.error) {
      return { success: false, error: normalizedSoundcloud.error };
    }

    const normalizedSpotify = normalizeMusicUrl(
      spotifyUrl,
      ["open.spotify.com", "spotify.com"],
      "Spotify"
    );
    if (normalizedSpotify.error) {
      return { success: false, error: normalizedSpotify.error };
    }

    // 4. Build update object
    const updates: {
      display_name?: string;
      bio?: string | null;
      avatar_url?: string | null;
      soundcloud_url?: string | null;
      spotify_url?: string | null;
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

    if (soundcloudUrl !== null) {
      updates.soundcloud_url = normalizedSoundcloud.value;
    }

    if (spotifyUrl !== null) {
      updates.spotify_url = normalizedSpotify.value;
    }

    // 5. Update profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profilesTable = supabase.from("profiles") as any;
    let { error: updateError } = await profilesTable
      .update(updates)
      .eq("id", user.id);

    // Backward compatibility: allow profile edits before the DB migration
    // for music links has been applied.
    if (updateError && isMissingMusicLinkColumnError(updateError)) {
      const legacyUpdates: {
        display_name?: string;
        bio?: string | null;
        avatar_url?: string | null;
        updated_at: string;
      } = {
        updated_at: updates.updated_at,
      };

      if (updates.display_name !== undefined) legacyUpdates.display_name = updates.display_name;
      if (updates.bio !== undefined) legacyUpdates.bio = updates.bio;
      if (updates.avatar_url !== undefined) legacyUpdates.avatar_url = updates.avatar_url;

      ({ error: updateError } = await profilesTable
        .update(legacyUpdates)
        .eq("id", user.id));
    }

    if (updateError) {
      console.error("Profile update error:", updateError);
      return { success: false, error: "Failed to update profile" };
    }

    // 6. Get username for revalidation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("username")
      .eq("id", user.id)
      .single();

    if (profile) {
      revalidatePath(`/profile/${(profile as { username: string }).username}`);
    }

    return { success: true };
  } catch (err) {
    console.error("updateProfile exception:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
}
