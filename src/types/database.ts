/**
 * Domain types for Freqy.
 *
 * When you connect a Supabase project, replace this file by running:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  soundcloud_url: string | null;
  spotify_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sample {
  id: string;
  title: string;
  artist: string;
  bpm: number | null;
  key: string | null;
  tags: string[];
  artwork_url: string | null;
  audio_url: string;
  storage_path: string;
  /** ISO date string (YYYY-MM-DD). Each date has at most one active sample. */
  active_date: string;
  created_by: string;
  created_at: string;
}

export interface Submission {
  id: string;
  sample_id: string;
  user_id: string;
  title: string | null;
  audio_url: string;
  storage_path: string;
  duration_seconds: number | null;
  play_count: number;
  created_at: string;
  /** Joined relations — optional, populated by specific queries */
  profile?: Profile;
  like_count?: number;
  liked_by_user?: boolean;
  /** Sample context — populated by profile/history queries */
  sample?: { title: string; active_date: string };
}

export interface Like {
  id: string;
  submission_id: string;
  user_id: string;
  created_at: string;
}

export interface SubmissionPlay {
  id: string;
  submission_id: string;
  user_id: string | null;
  session_id: string;
  created_at: string;
}

/* ─── Supabase Database type shell ─────────────────────────── */
/* Matches the shape expected by @supabase/supabase-js generics */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
        Relationships: [];
      };
      samples: {
        Row: Sample;
        Insert: Omit<Sample, "id" | "created_at">;
        Update: Partial<Omit<Sample, "id" | "created_at">>;
        Relationships: [];
      };
      submissions: {
        Row: Omit<Submission, "profile" | "like_count" | "liked_by_user">;
        Insert: Omit<Submission, "id" | "play_count" | "created_at" | "profile" | "like_count" | "liked_by_user">;
        Update: Partial<Omit<Submission, "id" | "created_at" | "profile" | "like_count" | "liked_by_user">>;
        Relationships: [];
      };
      likes: {
        Row: Like;
        Insert: Omit<Like, "id" | "created_at">;
        Update: Partial<Omit<Like, "id" | "created_at">>;
        Relationships: [];
      };
      submission_plays: {
        Row: SubmissionPlay;
        Insert: Omit<SubmissionPlay, "id" | "created_at">;
        Update: Partial<Omit<SubmissionPlay, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      record_submission_play: {
        Args: {
          p_submission_id: string;
          p_session_id: string;
          p_user_id?: string | null;
        };
        Returns: number;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
