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
  const hasMusicLinks = !!profile.soundcloud_url || !!profile.spotify_url;

  const initials = profile.display_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || profile.username.slice(0, 2).toUpperCase();

  return (
    <>
      <div
        className="border border-border bg-surface px-4 py-4 sm:px-5 sm:py-5"
        style={{ borderRadius: "var(--radius-minimal)" }}
      >
        <div className="flex items-start gap-4 sm:gap-5">
        {/* Avatar */}
        <div
          className="w-16 h-16 sm:w-20 sm:h-20 bg-surface-elevated border border-border shrink-0 flex items-center justify-center overflow-hidden"
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
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0 space-y-1">
              <h1 className="text-2xl sm:text-[2rem] font-bold text-text-primary leading-none tracking-tight">
                {profile.display_name}
              </h1>
              <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-text-secondary font-semibold">
                @{profile.username}
              </p>
            </div>

            {/* Edit button - only show for own profile */}
            {isOwnProfile && (
              <button
                onClick={() => setShowEditModal(true)}
                className="btn btn-ghost btn-sm uppercase tracking-wider border border-border hover:border-border-focus shrink-0 self-start"
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

          {hasMusicLinks ? (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {profile.soundcloud_url ? (
                <MusicLink
                  href={profile.soundcloud_url}
                  label="SoundCloud"
                  accent="soundcloud"
                >
                  <SoundCloudIcon />
                </MusicLink>
              ) : null}
              {profile.spotify_url ? (
                <MusicLink
                  href={profile.spotify_url}
                  label="Spotify"
                  accent="spotify"
                >
                  <SpotifyIcon />
                </MusicLink>
              ) : null}
            </div>
          ) : (
            isOwnProfile && (
              <p className="text-[10px] font-mono text-text-muted">
                Add your SoundCloud or Spotify so people can find your music.
              </p>
            )
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Stat label="Flips" value={String(stats.totalFlips)} />
            <Stat label="Likes" value={String(stats.totalLikes)} />
            {stats.streak > 0 && <Stat label="Streak" value={`${stats.streak}d`} />}
          </div>
        </div>
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
    <div
      className="min-w-[4.75rem] border border-border bg-background px-2.5 py-2"
      style={{ borderRadius: "var(--radius-minimal)" }}
    >
      <p className="text-base sm:text-lg font-mono font-bold text-text-primary tabular-nums leading-none">
        {value}
      </p>
      <p className="mt-1 text-[9px] font-mono tracking-[0.14em] uppercase text-text-secondary font-semibold">
        {label}
      </p>
    </div>
  );
}

function MusicLink({
  href,
  label,
  accent,
  children,
}: {
  href: string;
  label: string;
  accent: "spotify" | "soundcloud";
  children: React.ReactNode;
}) {
  const isSpotify = accent === "spotify";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 border px-2.5 py-1.5 text-[11px] font-mono font-semibold tracking-[0.08em] transition-all duration-150 ${
        isSpotify
          ? "hover:bg-[rgba(30,215,96,0.18)] hover:border-[rgba(30,215,96,0.42)] hover:text-[#b8ffd0]"
          : "hover:bg-[rgba(255,119,0,0.18)] hover:border-[rgba(255,119,0,0.42)] hover:text-[#ffd0a4]"
      }`}
      style={{
        borderRadius: "var(--radius-minimal)",
        borderColor: isSpotify ? "rgba(30, 215, 96, 0.26)" : "rgba(255, 119, 0, 0.26)",
        backgroundColor: isSpotify
          ? "rgba(30, 215, 96, 0.10)"
          : "rgba(255, 119, 0, 0.10)",
        color: isSpotify ? "#7ff0ac" : "#ffb066",
      }}
    >
      {children}
      {label}
      <ExternalLinkIcon />
    </a>
  );
}

function SoundCloudIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M4.8 9H3.9V4.7l.9-.5V9Zm1.4 0h-.9V3.6l.9-.4V9Zm1.4 0h-.9V3l.9-.1V9Zm1.4 0h-.9V3.2c1 .1 1.8.9 1.8 1.9 0 0 1.1.1 1.1 1.3C11 8.1 10.2 9 9.2 9Z" />
      <path d="M2.5 9h-.8V5.6l.8-.4V9ZM1.2 9H.5V6.5l.7-.3V9Z" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" />
      <path d="M3.4 4.9c1.7-.5 3.5-.4 5 .4" strokeLinecap="round" />
      <path d="M3.9 6.5c1.3-.4 2.6-.3 3.8.3" strokeLinecap="round" />
      <path d="M4.5 8c.9-.2 1.7-.2 2.4.2" strokeLinecap="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M4 8 8.5 3.5" strokeLinecap="round" />
      <path d="M5.5 3.5h3v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
