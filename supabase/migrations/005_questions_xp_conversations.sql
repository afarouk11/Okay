-- ─── Migration 005: Questions, XP Logs, Conversations, Trial & Webhooks ──────
-- Run in Supabase SQL Editor or via: supabase db push

create extension if not exists "pgcrypto";

-- ── trial_ends_at on profiles ────────────────────────────────────────────────
alter table public.profiles
  add column if not exists trial_ends_at       timestamptz,
  add column if not exists trial_started_at    timestamptz,
  add column if not exists full_name           text,
  add column if not exists year_group          text,
  add column if not exists exam_board          text,
  add column if not exists target_grade        text,
  add column if not exists adhd_mode           boolean default false,
  add column if not exists dyslexia_mode       boolean default false,
  add column if not exists dyscalculia_mode    boolean default false,
  add column if not exists stripe_customer_id  text,
  add column if not exists stripe_subscription_id text;

-- Default trial_ends_at for any existing rows that don't have it
update public.profiles
  set trial_started_at = created_at,
      trial_ends_at    = created_at + interval '7 days'
  where trial_ends_at is null and created_at is not null;

-- ── questions_answered table ─────────────────────────────────────────────────
create table if not exists public.questions_answered (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  topic           text,
  module          text,          -- 'Pure 1' | 'Pure 2' | 'Statistics' | 'Mechanics'
  board           text,
  difficulty      integer,       -- 1-5
  question_text   text,
  correct_answer  text,
  user_answer     text,
  is_correct      boolean default false,
  is_photo_question boolean default false,
  xp_earned       integer default 0,
  created_at      timestamptz default now()
);

alter table public.questions_answered enable row level security;

drop policy if exists "qa_select_own" on public.questions_answered;
drop policy if exists "qa_insert_own" on public.questions_answered;
create policy "qa_select_own" on public.questions_answered
  for select using (auth.uid() = user_id);

create policy "qa_insert_own" on public.questions_answered
  for insert with check (auth.uid() = user_id);

grant all on public.questions_answered to service_role;
create index if not exists qa_user_id_idx on public.questions_answered(user_id);
create index if not exists qa_topic_idx   on public.questions_answered(user_id, topic);

-- ── xp_logs table ────────────────────────────────────────────────────────────
create table if not exists public.xp_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     integer not null,
  reason     text,
  created_at timestamptz default now()
);

alter table public.xp_logs enable row level security;

drop policy if exists "xp_select_own" on public.xp_logs;
drop policy if exists "xp_insert_own" on public.xp_logs;
create policy "xp_select_own" on public.xp_logs
  for select using (auth.uid() = user_id);

create policy "xp_insert_own" on public.xp_logs
  for insert with check (auth.uid() = user_id);

grant all on public.xp_logs to service_role;
create index if not exists xp_user_id_idx on public.xp_logs(user_id);

-- ── streak_logs table ─────────────────────────────────────────────────────────
create table if not exists public.streak_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  date             date not null,
  questions_count  integer default 0,
  created_at       timestamptz default now(),
  unique(user_id, date)
);

alter table public.streak_logs enable row level security;

drop policy if exists "sl_select_own" on public.streak_logs;
drop policy if exists "sl_insert_own" on public.streak_logs;
create policy "sl_select_own" on public.streak_logs
  for select using (auth.uid() = user_id);

create policy "sl_insert_own" on public.streak_logs
  for insert with check (auth.uid() = user_id);

grant all on public.streak_logs to service_role;

-- ── conversations table ───────────────────────────────────────────────────────
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  messages   jsonb not null default '[]',
  topic      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.conversations enable row level security;

drop policy if exists "conv_select_own" on public.conversations;
drop policy if exists "conv_insert_own" on public.conversations;
drop policy if exists "conv_update_own" on public.conversations;
create policy "conv_select_own" on public.conversations
  for select using (auth.uid() = user_id);

create policy "conv_insert_own" on public.conversations
  for insert with check (auth.uid() = user_id);

create policy "conv_update_own" on public.conversations
  for update using (auth.uid() = user_id);

grant all on public.conversations to service_role;
create index if not exists conv_user_id_idx on public.conversations(user_id);

drop trigger if exists conversations_updated_at on public.conversations;
create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ── processed_webhooks table (idempotency) ───────────────────────────────────
create table if not exists public.processed_webhooks (
  event_id   text primary key,
  created_at timestamptz default now()
);

grant all on public.processed_webhooks to service_role;

-- ── Helper: save_answer RPC ───────────────────────────────────────────────────
-- Call from frontend: supabase.rpc('save_answer', { ... })
create or replace function public.save_answer(
  p_user_id         uuid,
  p_topic           text,
  p_module          text,
  p_board           text,
  p_difficulty      integer,
  p_question_text   text,
  p_correct_answer  text,
  p_user_answer     text,
  p_is_correct      boolean,
  p_is_photo        boolean default false
) returns void language plpgsql security definer as $$
declare
  v_xp integer := case when p_is_correct then 10 else 2 end;
begin
  insert into public.questions_answered
    (user_id, topic, module, board, difficulty, question_text,
     correct_answer, user_answer, is_correct, is_photo_question, xp_earned)
  values
    (p_user_id, p_topic, p_module, p_board, p_difficulty, p_question_text,
     p_correct_answer, p_user_answer, p_is_correct, p_is_photo, v_xp);

  insert into public.xp_logs (user_id, amount, reason)
  values (p_user_id, v_xp, case when p_is_correct then 'Correct answer' else 'Attempted question' end);

  update public.profiles
  set xp                 = coalesce(xp, 0) + v_xp,
      questions_answered = coalesce(questions_answered, 0) + 1
  where id = p_user_id;

  -- Upsert today's streak log
  insert into public.streak_logs (user_id, date, questions_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, date)
  do update set questions_count = streak_logs.questions_count + 1;
end;
$$;
