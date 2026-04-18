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
  soundcloud_url text,
  spotify_url   text,
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


-- ─── submission_plays ───────────────────────────────────────────
-- Tracks meaningful playback. Counted once per browser session token.
create table public.submission_plays (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.submissions(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,
  session_id     text not null,
  created_at     timestamptz not null default now()
);

alter table public.submission_plays enable row level security;

create policy "Submission plays are publicly readable"
  on public.submission_plays for select using (true);

create policy "Anyone can insert submission plays"
  on public.submission_plays for insert with check (true);

create or replace function public.record_submission_play(
  p_submission_id uuid,
  p_session_id text,
  p_user_id uuid default null
)
returns integer language plpgsql security definer set search_path = public as $$
declare
  current_count integer := 0;
  should_insert boolean := true;
begin
  if p_user_id is not null then
    select not exists (
      select 1
      from public.submission_plays
      where submission_id = p_submission_id
        and user_id = p_user_id
        and created_at >= now() - interval '60 seconds'
    )
    into should_insert;
  else
    select not exists (
      select 1
      from public.submission_plays
      where submission_id = p_submission_id
        and session_id = p_session_id
        and created_at >= now() - interval '60 seconds'
    )
    into should_insert;
  end if;

  if should_insert then
    insert into public.submission_plays (submission_id, user_id, session_id)
    values (p_submission_id, p_user_id, p_session_id);

    update public.submissions
    set play_count = play_count + 1
    where id = p_submission_id
    returning play_count into current_count;
  else
    select play_count into current_count
    from public.submissions
    where id = p_submission_id;
  end if;

  return coalesce(current_count, 0);
end;
$$;


-- ─── Helpful views ────────────────────────────────────────────

-- Submission with like count (useful for feeds and leaderboard)
-- battle_matchups
-- Each row represents one head-to-head battle pairing shown to a user.
create table public.battle_matchups (
  id                  uuid primary key default gen_random_uuid(),
  sample_id           uuid not null references public.samples(id) on delete cascade,
  left_submission_id  uuid not null references public.submissions(id) on delete cascade,
  right_submission_id uuid not null references public.submissions(id) on delete cascade,
  created_at          timestamptz not null default now(),
  check (left_submission_id <> right_submission_id)
);

alter table public.battle_matchups enable row level security;

create policy "Battle matchups are publicly readable"
  on public.battle_matchups for select using (true);

create policy "Authenticated users can create battle matchups"
  on public.battle_matchups for insert with check (auth.uid() is not null);


-- battle_votes
-- Each row records one user's winner selection for a specific matchup.
create table public.battle_votes (
  id                   uuid primary key default gen_random_uuid(),
  matchup_id           uuid not null references public.battle_matchups(id) on delete cascade,
  left_submission_id   uuid not null references public.submissions(id) on delete cascade,
  right_submission_id  uuid not null references public.submissions(id) on delete cascade,
  winner_submission_id uuid not null references public.submissions(id) on delete cascade,
  loser_submission_id  uuid not null references public.submissions(id) on delete cascade,
  voter_user_id        uuid not null references public.profiles(id) on delete cascade,
  created_at           timestamptz not null default now(),
  unique (matchup_id, voter_user_id),
  check (left_submission_id <> right_submission_id),
  check (winner_submission_id <> loser_submission_id)
);

create index battle_votes_created_at_idx
  on public.battle_votes (created_at desc);
create index battle_votes_winner_submission_idx
  on public.battle_votes (winner_submission_id);
create index battle_votes_loser_submission_idx
  on public.battle_votes (loser_submission_id);
create index battle_votes_voter_user_idx
  on public.battle_votes (voter_user_id);

alter table public.battle_votes enable row level security;

create policy "Battle votes are publicly readable"
  on public.battle_votes for select using (true);

create policy "Users can insert their own battle votes"
  on public.battle_votes for insert with check (auth.uid() = voter_user_id);


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
