-- ─────────────────────────────────────────────────────────────
-- Sample Platter — Initial Database Schema
-- Run this in the Supabase SQL editor to bootstrap your project.
-- ─────────────────────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ─── profiles ─────────────────────────────────────────────────
-- One row per authenticated user. Created via trigger on signup.
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text not null,
  avatar_url    text,
  bio           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read any profile; only update their own.
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─── samples ──────────────────────────────────────────────────
-- Each row is a daily sample (the thing people chop/flip).
-- active_date must be unique — only one sample per day.
create table public.samples (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  artist        text not null,
  bpm           integer,
  key           text,                          -- e.g. "Am", "C#maj"
  tags          text[] not null default '{}',
  artwork_url   text,
  audio_url     text not null,
  storage_path  text not null,                 -- Supabase Storage path
  active_date   date unique not null,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now()
);

alter table public.samples enable row level security;

create policy "Samples are publicly readable"
  on public.samples for select using (true);

-- Only admins should insert/update — handled via Supabase dashboard roles or service key.


-- ─── submissions ──────────────────────────────────────────────
-- Each row is a user-uploaded flip/chop of today's sample.
create table public.submissions (
  id               uuid primary key default gen_random_uuid(),
  sample_id        uuid not null references public.samples(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  title            text,
  audio_url        text not null,
  storage_path     text not null,
  duration_seconds integer,
  play_count       integer not null default 0,
  created_at       timestamptz not null default now(),
  -- One submission per user per sample (can relax later)
  unique (sample_id, user_id)
);

alter table public.submissions enable row level security;

create policy "Submissions are publicly readable"
  on public.submissions for select using (true);

create policy "Users can insert their own submissions"
  on public.submissions for insert with check (auth.uid() = user_id);

create policy "Users can update their own submissions"
  on public.submissions for update using (auth.uid() = user_id);

create policy "Users can delete their own submissions"
  on public.submissions for delete using (auth.uid() = user_id);


-- ─── likes ────────────────────────────────────────────────────
-- A user can like a submission once.
create table public.likes (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.submissions(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (submission_id, user_id)
);

alter table public.likes enable row level security;

create policy "Likes are publicly readable"
  on public.likes for select using (true);

create policy "Users can insert their own likes"
  on public.likes for insert with check (auth.uid() = user_id);

create policy "Users can delete their own likes"
  on public.likes for delete using (auth.uid() = user_id);


-- ─── Helpful views ────────────────────────────────────────────

-- Submission with like count (useful for feeds and leaderboard)
create or replace view public.submissions_with_likes as
select
  s.*,
  count(l.id)::integer as like_count
from public.submissions s
left join public.likes l on l.submission_id = s.id
group by s.id;


-- ─── Storage buckets (create via dashboard or this SQL) ───────
-- insert into storage.buckets (id, name, public) values ('samples', 'samples', true);
-- insert into storage.buckets (id, name, public) values ('submissions', 'submissions', true);
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
