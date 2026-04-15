-- ─── Synaptiq Migration 002 ────────────────────────────────────────────────────
-- Adds missing columns to profiles and creates all app tables.
-- Applied 2026-03-17 via Supabase MCP.

create extension if not exists "pgcrypto";

-- ── Add missing columns to profiles ──────────────────────────────────────────
alter table public.profiles
  add column if not exists plan                 text default 'student',
  add column if not exists subscription_status  text default 'free',
  add column if not exists learning_difficulty  text default 'none',
  add column if not exists year_group           text default '',
  add column if not exists subjects             text[] default '{}',
  add column if not exists board                text default 'AQA',
  add column if not exists exam_board           text default '',
  add column if not exists target               text default '',
  add column if not exists target_grade         text default '',
  add column if not exists is_admin             boolean default false,
  add column if not exists streak               integer default 0,
  add column if not exists longest_streak       integer default 0,
  add column if not exists questions_answered   integer default 0,
  add column if not exists accuracy             numeric(5,2) default 0,
  add column if not exists last_active          date;

-- ── set_updated_at trigger function ──────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Notes table ───────────────────────────────────────────────────────────────
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  title      text not null default 'Untitled',
  content    text not null default '',
  subject    text default '',
  tags       text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.notes enable row level security;
drop policy if exists "notes_own" on public.notes;
create policy "notes_own" on public.notes
  for all using (user_id::text = auth.uid()::text);
grant all on public.notes to service_role;
drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ── Progress table ─────────────────────────────────────────────────────────────
create table if not exists public.progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  subject    text not null default '',
  topic      text default '',
  score      integer default 0,
  total      integer default 0,
  xp_earned  integer default 0,
  session_at timestamptz default now()
);
alter table public.progress enable row level security;
drop policy if exists "progress_own" on public.progress;
create policy "progress_own" on public.progress
  for all using (user_id::text = auth.uid()::text);
grant all on public.progress to service_role;

-- ── Activity log table ────────────────────────────────────────────────────────
create table if not exists public.activity_log (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references public.profiles(id) on delete cascade,
  type      text not null default '',
  detail    text default '',
  xp        integer default 0,
  logged_at timestamptz default now()
);
alter table public.activity_log enable row level security;
drop policy if exists "activity_log_own" on public.activity_log;
create policy "activity_log_own" on public.activity_log
  for all using (user_id::text = auth.uid()::text);
grant all on public.activity_log to service_role;

-- ── Mistakes table ────────────────────────────────────────────────────────────
create table if not exists public.mistakes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  subject     text default '',
  topic       text default '',
  question    text default '',
  user_answer text default '',
  correct     text default '',
  logged_at   timestamptz default now()
);
alter table public.mistakes enable row level security;
drop policy if exists "mistakes_own" on public.mistakes;
create policy "mistakes_own" on public.mistakes
  for all using (user_id::text = auth.uid()::text);
grant all on public.mistakes to service_role;

-- ── Chat history table ────────────────────────────────────────────────────────
create table if not exists public.chat_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null default '',
  subject    text default '',
  created_at timestamptz default now()
);
alter table public.chat_history enable row level security;
drop policy if exists "chat_history_own" on public.chat_history;
create policy "chat_history_own" on public.chat_history
  for all using (user_id::text = auth.uid()::text);
grant all on public.chat_history to service_role;

-- ── increment_user_stats RPC ──────────────────────────────────────────────────
create or replace function public.increment_user_stats(
  uid           uuid,
  xp_add        integer default 0,
  questions_add integer default 0
)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set
    xp                 = coalesce(xp, 0) + xp_add,
    questions_answered = coalesce(questions_answered, 0) + questions_add,
    updated_at         = now()
  where id = uid;
end;
$$;
grant execute on function public.increment_user_stats to service_role;
