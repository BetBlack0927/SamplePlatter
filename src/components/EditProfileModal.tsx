"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/actions/profile";
import type { Profile } from "@/types/database";

interface EditProfileModalProps {
  profile: Profile;
  onClose: () => void;
}

type UploadStage = "idle" | "uploading" | "error";

export function EditProfileModal({ profile, onClose }: EditProfileModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio || "");
  const [soundcloudUrl, setSoundcloudUrl] = useState(profile.soundcloud_url || "");
  const [spotifyUrl, setSpotifyUrl] = useState(profile.spotify_url || "");
  const [avatarUrl] = useState(profile.avatar_url || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const bioLength = bio.length;
  const bioError = bioLength > 160;

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB");
      return;
    }

    setError(null);
    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (bioError) {
      setError("Bio must be 160 characters or less");
      return;
    }

    startTransition(async () => {
      try {
        let finalAvatarUrl = avatarUrl;

        // Upload avatar if a new file was selected
        if (avatarFile) {
          setUploadStage("uploading");

          const supabase = createClient();
          const fileExt = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
          const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
          const filePath = `${profile.id}/${fileName}`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, avatarFile, {
              contentType: avatarFile.type,
              upsert: true,
            });

          if (uploadError) {
            console.error("Avatar upload error:", uploadError);
            
            // Provide more specific error messages
            if (uploadError.message.includes("not found") || uploadError.message.includes("does not exist")) {
              setError("Storage bucket not set up. Please create 'avatars' bucket in Supabase Dashboard.");
            } else if (uploadError.message.includes("policy")) {
              setError("Upload permission denied. Check storage policies.");
            } else {
              setError(`Upload failed: ${uploadError.message}`);
            }
            
            setUploadStage("error");
            return;
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("avatars").getPublicUrl(filePath);

          finalAvatarUrl = publicUrl;
          setUploadStage("idle");
        }

        // Update profile via server action
        const formData = new FormData();
        formData.set("display_name", displayName);
        formData.set("bio", bio);
        formData.set("avatar_url", finalAvatarUrl);
        formData.set("soundcloud_url", soundcloudUrl);
        formData.set("spotify_url", spotifyUrl);

        const result = await updateProfile(formData);

        if (!result.success) {
          setError(result.error || "Failed to update profile");
          return;
        }

        // Success - refresh and close
        router.refresh();
        onClose();
      } catch (err) {
        console.error("Profile update error:", err);
        setError("An unexpected error occurred");
        setUploadStage("error");
      }
    });
  };

  const currentAvatar = avatarPreview || avatarUrl;
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || profile.username.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={isPending ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        className="fixed z-50 inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-0 sm:p-4"
      >
        <div
          className="w-full sm:max-w-md bg-background border border-border shadow-2xl"
          style={{ borderRadius: "var(--radius-minimal)" }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border bg-surface">
              <div>
                  <h2 className="text-sm font-bold text-text-primary tracking-tight">
                  Edit Profile
                </h2>
                  <p className="text-[10px] font-mono text-text-secondary mt-1">
                  Update your profile information
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors disabled:opacity-30"
                style={{ borderRadius: "var(--radius-minimal)" }}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="px-4 py-4 space-y-3">
              {/* Error */}
              {error && (
                <div
                  className="px-3 py-2 bg-error/10 border border-error/30"
                  style={{ borderRadius: "var(--radius-minimal)" }}
                >
                  <p className="text-[11px] font-mono text-error">{error}</p>
                </div>
              )}

              {/* Avatar upload */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono tracking-[0.08em] text-text-secondary font-semibold">
                  Profile Picture
                </label>
                <div className="flex items-center gap-3">
                  {/* Avatar preview */}
                  <div
                    className="w-16 h-16 bg-surface border border-border shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ borderRadius: "var(--radius-minimal)" }}
                  >
                    {currentAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentAvatar}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-mono font-bold text-text-muted">
                        {initials}
                      </span>
                    )}
                  </div>

                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                    className="btn btn-secondary btn-sm uppercase tracking-wider"
                  >
                    {uploadStage === "uploading" ? "Uploading..." : "Change"}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </div>
                <p className="text-[10px] font-mono text-text-muted">
                  JPG, PNG, or GIF · Max 2MB
                </p>
              </div>

              {/* Display name */}
              <div className="space-y-1">
                <label
                  htmlFor="display_name"
                  className="block text-[11px] font-mono tracking-[0.08em] text-text-secondary font-semibold"
                >
                  Display Name
                </label>
                <input
                  id="display_name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  required
                  className="w-full bg-surface border border-border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors"
                  style={{ borderRadius: "var(--radius-minimal)" }}
                />
              </div>

              {/* Bio */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="bio"
                    className="block text-[11px] font-mono tracking-[0.08em] text-text-secondary font-semibold"
                  >
                    Bio
                  </label>
                  <span
                    className={`text-[10px] font-mono tabular-nums ${
                      bioError ? "text-error" : "text-text-muted"
                    }`}
                  >
                    {bioLength}/160
                  </span>
                </div>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={160}
                  rows={3}
                  placeholder="Tell us about yourself..."
                  className="w-full bg-surface border border-border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors resize-none"
                  style={{ borderRadius: "var(--radius-minimal)" }}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="soundcloud_url"
                    className="block text-[11px] font-mono tracking-[0.08em] text-text-secondary font-semibold"
                  >
                    SoundCloud Link
                  </label>
                  <input
                    id="soundcloud_url"
                    type="url"
                    value={soundcloudUrl}
                    onChange={(e) => setSoundcloudUrl(e.target.value)}
                    placeholder="https://soundcloud.com/your-name"
                    className="w-full bg-surface border border-border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors"
                    style={{ borderRadius: "var(--radius-minimal)" }}
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="spotify_url"
                    className="block text-[11px] font-mono tracking-[0.08em] text-text-secondary font-semibold"
                  >
                    Spotify Link
                  </label>
                  <input
                    id="spotify_url"
                    type="url"
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                    placeholder="https://open.spotify.com/artist/..."
                    className="w-full bg-surface border border-border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors"
                    style={{ borderRadius: "var(--radius-minimal)" }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-4 pb-4">
              <button
                type="submit"
                disabled={isPending || bioError || uploadStage === "uploading"}
                className="flex-1 btn btn-primary btn-md uppercase tracking-wider"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="btn btn-secondary btn-md uppercase tracking-wider disabled:opacity-30"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

/* ─── Icons ─────────────────────────────────────────────────── */

function CloseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M1 1l10 10M11 1L1 11" />
    </svg>
  );
}
