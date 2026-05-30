-- Habit Tracker — Supabase Schema
-- Run this in the Supabase SQL Editor for your project.
-- Dashboard → SQL Editor → New query → paste all → Run

-- ─────────────────────────────────────────────
-- PROFILES
-- Auto-created for every new auth user via trigger.
-- ─────────────────────────────────────────────
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  onboarding_complete boolean default false,
  notifications_enabled boolean default false,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "own profile" on profiles for all using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- HABITS
-- ─────────────────────────────────────────────
create table if not exists habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles on delete cascade not null,
  name text not null,
  emoji text not null default '🎯',
  type text not null default 'simple' check (type in ('simple', 'count')),
  target_count int not null default 1,
  created_at date not null default current_date,
  reminder_enabled boolean default false,
  reminder_hour int default 8 check (reminder_hour between 0 and 23),
  reminder_minute int default 0 check (reminder_minute between 0 and 59),
  sort_order int default 0
);
alter table habits enable row level security;
create policy "own habits" on habits for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- HABIT COMPLETIONS
-- One row per habit per day. count=1 for simple habits,
-- count=N for count-type habits.
-- ─────────────────────────────────────────────
create table if not exists habit_completions (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references habits on delete cascade not null,
  user_id uuid references profiles on delete cascade not null,
  completed_date date not null default current_date,
  count int not null default 1,
  unique(habit_id, completed_date)
);
alter table habit_completions enable row level security;
create policy "own completions" on habit_completions for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- CHALLENGES
-- id is text to support preset IDs ('kickstart-3')
-- and custom IDs ('custom-<uuid>').
-- ─────────────────────────────────────────────
create table if not exists challenges (
  id text primary key,
  user_id uuid references profiles on delete cascade not null,
  name text not null,
  description text not null default '',
  emoji text not null default '🏆',
  duration_days int not null default 7,
  start_date date,
  completed boolean default false,
  reward_claimed boolean default false,
  is_custom boolean default false,
  created_at timestamptz default now()
);
alter table challenges enable row level security;
create policy "own challenges" on challenges for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- CHALLENGE COMPLETIONS
-- One row per challenge per day (when all habits were done).
-- ─────────────────────────────────────────────
create table if not exists challenge_completions (
  id uuid default gen_random_uuid() primary key,
  challenge_id text references challenges on delete cascade not null,
  user_id uuid references profiles on delete cascade not null,
  completed_date date not null,
  unique(challenge_id, completed_date)
);
alter table challenge_completions enable row level security;
create policy "own challenge completions" on challenge_completions for all using (auth.uid() = user_id);
