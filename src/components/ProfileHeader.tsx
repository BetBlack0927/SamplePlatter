"use client";

import { useState } from "react";
import { EditProfileModal } from "@/components/EditProfileModal";
import type { Profile } from "@/types/database";

interface ProfileHeaderProps {
  profile: Profile;
  isOwnProfile: boolean;
  stats: {
    totalFlips: number;
    totalLikes: number;
    streak: number;
  };
}

export function ProfileHeader({ profile, isOwnProfile, stats }: ProfileHeaderProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  const initials = profile.display_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || profile.username.slice(0, 2).toUpperCase();

  return (
    <>
      <div className="flex items-start gap-4 sm:gap-5 pb-5 border-b border-border">
        {/* Avatar */}
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 bg-surface border border-border shrink-0 flex items-center justify-center overflow-hidden"
          style={{ borderRadius: "var(--radius-minimal)" }}
        >
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-mono font-bold text-text-muted">
              {initials}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary leading-tight tracking-tight">
                {profile.display_name}
              </h1>
              <p className="text-sm font-mono text-text-secondary font-semibold">
                @{profile.username}
              </p>
            </div>

            {/* Edit button - only show for own profile */}
            {isOwnProfile && (
              <button
                onClick={() => setShowEditModal(true)}
                className="btn btn-ghost btn-sm uppercase tracking-wider border border-border hover:border-border-focus shrink-0"
              >
                Edit Profile
              </button>
            )}
          </div>

          {profile.bio ? (
            <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
              {profile.bio}
            </p>
          ) : (
            isOwnProfile && (
              <p className="text-sm text-text-muted italic max-w-2xl">
                No bio added yet.
              </p>
            )
          )}

          {/* Stats - inline with profile info */}
          <div className="flex gap-6 pt-1">
            <Stat label="Flips" value={String(stats.totalFlips)} />
            <Stat label="Likes" value={String(stats.totalLikes)} />
            {stats.streak > 0 && <Stat label="Streak" value={`${stats.streak}d`} />}
          </div>

          {isOwnProfile && (
            <p className="text-[10px] font-mono text-text-muted pt-0.5">
              This is your profile.
            </p>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal profile={profile} onClose={() => setShowEditModal(false)} />
      )}
    </>
  );
}

/* ─── Stat block ─────────────────────────────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-base sm:text-lg font-mono font-bold text-text-primary tabular-nums leading-none">
        {value}
      </p>
      <p className="mt-1 text-[10px] font-mono tracking-[0.12em] text-text-secondary font-semibold">
        {label}
      </p>
    </div>
  );
}
