-- ─── Migration 006: Adaptive Learning System ─────────────────────────────────
-- Adds spaced repetition (SM-2), mastery tracking, and learning profiles.
-- Run in Supabase SQL Editor or via: supabase db push

create extension if not exists "pgcrypto";

-- ── learning_profile column on profiles ──────────────────────────────────────
-- Stores derived teaching preferences inferred from behaviour:
--   { preferred_pace: "slow"|"normal"|"fast",
--     needs_scaffolding: bool,
--     explanation_depth: "brief"|"detailed" }
alter table public.profiles
  add column if not exists learning_profile jsonb default '{}'::jsonb;

-- ── topic_mastery table ───────────────────────────────────────────────────────
-- One row per (user, topic). Tracks SM-2 spaced-repetition state and a
-- 0-5 mastery level aligned with Bloom's taxonomy tiers.
create table if not exists public.topic_mastery (
  id                uuid    primary key default gen_random_uuid(),
  user_id           uuid    not null references public.profiles(id) on delete cascade,
  topic             text    not null,
  module            text,                         -- 'Pure 1' | 'Pure 2' | 'Statistics' | 'Mechanics'

  -- Bloom's-inspired mastery: 0 = unseen, 1 = recall, 2 = understand,
  --   3 = apply, 4 = analyse, 5 = evaluate/create
  mastery_level     integer not null default 0 check (mastery_level between 0 and 5),

  -- SM-2 algorithm state
  easiness_factor   float   not null default 2.5,
  interval_days     integer not null default 1,
  repetitions       integer not null default 0,

  -- Review scheduling
  last_reviewed     date,
  next_review_date  date    not null default current_date,

  -- Raw attempt counters (used to compute accuracy for mastery_level)
  total_attempts    integer not null default 0,
  correct_attempts  integer not null default 0,

  updated_at        timestamptz default now(),

  unique(user_id, topic)
);

alter table public.topic_mastery enable row level security;

drop policy if exists "tm_select_own" on public.topic_mastery;
drop policy if exists "tm_insert_own" on public.topic_mastery;
drop policy if exists "tm_update_own" on public.topic_mastery;
create policy "tm_select_own" on public.topic_mastery
  for select using (auth.uid() = user_id);

create policy "tm_insert_own" on public.topic_mastery
  for insert with check (auth.uid() = user_id);

create policy "tm_update_own" on public.topic_mastery
  for update using (auth.uid() = user_id);

grant all on public.topic_mastery to service_role;

create index if not exists tm_user_id_idx          on public.topic_mastery(user_id);
create index if not exists tm_review_date_idx      on public.topic_mastery(user_id, next_review_date);
create index if not exists tm_mastery_level_idx    on public.topic_mastery(user_id, mastery_level);

-- Keep updated_at current automatically
drop trigger if exists topic_mastery_updated_at on public.topic_mastery;
create trigger topic_mastery_updated_at
  before update on public.topic_mastery
  for each row execute function public.set_updated_at();

-- ── update_topic_mastery function ─────────────────────────────────────────────
-- Called after every answered question. Implements SM-2 and recomputes
-- mastery_level from the updated repetition/accuracy state.
--
-- SM-2 quality mapping:
--   incorrect             → quality 1  (forces reset)
--   correct, difficulty ≥ 4 → quality 3  (correct but hard)
--   correct, difficulty 2-3 → quality 4
--   correct, difficulty ≤ 1 → quality 5  (easy win)
create or replace function public.update_topic_mastery(
  p_user_id   uuid,
  p_topic     text,
  p_module    text,
  p_correct   boolean,
  p_difficulty integer   -- 1-5
) returns void language plpgsql security definer as $$
declare
  v_quality        integer;
  v_ef             float;
  v_interval       integer;
  v_reps           integer;
  v_total          integer;
  v_correct_count  integer;
  v_new_ef         float;
  v_new_interval   integer;
  v_new_reps       integer;
  v_new_mastery    integer;
  v_next_review    date;
  v_existing       record;
begin
  -- Map answer + difficulty to SM-2 quality score (0-5)
  if not p_correct then
    v_quality := 1;
  elsif p_difficulty >= 4 then
    v_quality := 3;
  elsif p_difficulty >= 2 then
    v_quality := 4;
  else
    v_quality := 5;
  end if;

  -- Load existing mastery row (or use defaults for new topic)
  select easiness_factor, interval_days, repetitions, total_attempts, correct_attempts
  into v_existing
  from public.topic_mastery
  where user_id = p_user_id and topic = p_topic;

  if not found then
    v_ef      := 2.5;
    v_interval := 1;
    v_reps    := 0;
    v_total   := 0;
    v_correct_count := 0;
  else
    v_ef      := v_existing.easiness_factor;
    v_interval := v_existing.interval_days;
    v_reps    := v_existing.repetitions;
    v_total   := v_existing.total_attempts;
    v_correct_count := v_existing.correct_attempts;
  end if;

  -- Update attempt counters
  v_total         := v_total + 1;
  v_correct_count := v_correct_count + (case when p_correct then 1 else 0 end);

  -- ── SM-2 core ──
  if v_quality < 3 then
    -- Incorrect: reset repetitions and interval, keep EF
    v_new_reps     := 0;
    v_new_interval := 1;
    v_new_ef       := v_ef;
  else
    -- Correct: update EF and advance interval
    v_new_ef := greatest(1.3,
      v_ef + 0.1 - (5.0 - v_quality) * (0.08 + (5.0 - v_quality) * 0.02)
    );
    v_new_reps := v_reps + 1;
    if v_reps = 0 then
      v_new_interval := 1;
    elsif v_reps = 1 then
      v_new_interval := 6;
    else
      v_new_interval := round(v_interval * v_new_ef);
    end if;
  end if;

  v_next_review := current_date + v_new_interval;

  -- ── Compute mastery level (0-5) ──
  -- Requires increasing repetitions and accuracy thresholds
  declare
    v_accuracy float := case when v_total > 0 then v_correct_count::float / v_total else 0 end;
  begin
    if v_new_reps >= 5 and v_accuracy >= 0.9 then
      v_new_mastery := 5;
    elsif v_new_reps >= 4 and v_accuracy >= 0.8 then
      v_new_mastery := 4;
    elsif v_new_reps >= 3 and v_accuracy >= 0.7 then
      v_new_mastery := 3;
    elsif v_new_reps >= 2 and v_accuracy >= 0.6 then
      v_new_mastery := 2;
    elsif v_new_reps >= 1 then
      v_new_mastery := 1;
    else
      v_new_mastery := 0;
    end if;
  end;

  -- Upsert topic_mastery row
  insert into public.topic_mastery
    (user_id, topic, module, mastery_level, easiness_factor, interval_days,
     repetitions, last_reviewed, next_review_date, total_attempts, correct_attempts)
  values
    (p_user_id, p_topic, p_module, v_new_mastery, v_new_ef, v_new_interval,
     v_new_reps, current_date, v_next_review, v_total, v_correct_count)
  on conflict (user_id, topic) do update set
    module           = excluded.module,
    mastery_level    = excluded.mastery_level,
    easiness_factor  = excluded.easiness_factor,
    interval_days    = excluded.interval_days,
    repetitions      = excluded.repetitions,
    last_reviewed    = excluded.last_reviewed,
    next_review_date = excluded.next_review_date,
    total_attempts   = excluded.total_attempts,
    correct_attempts = excluded.correct_attempts;
end;
$$;

-- ── Extend save_answer to also update topic_mastery ───────────────────────────
-- Replaces the existing save_answer RPC to add the mastery update call.
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
  -- Record the answered question
  insert into public.questions_answered
    (user_id, topic, module, board, difficulty, question_text,
     correct_answer, user_answer, is_correct, is_photo_question, xp_earned)
  values
    (p_user_id, p_topic, p_module, p_board, p_difficulty, p_question_text,
     p_correct_answer, p_user_answer, p_is_correct, p_is_photo, v_xp);

  -- Log XP transaction
  insert into public.xp_logs (user_id, amount, reason)
  values (p_user_id, v_xp,
    case when p_is_correct then 'Correct answer' else 'Attempted question' end);

  -- Update profile totals
  update public.profiles
  set xp                 = coalesce(xp, 0) + v_xp,
      questions_answered = coalesce(questions_answered, 0) + 1
  where id = p_user_id;

  -- Upsert today's streak log
  insert into public.streak_logs (user_id, date, questions_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, date)
  do update set questions_count = streak_logs.questions_count + 1;

  -- Update SM-2 topic mastery (new in migration 006)
  perform public.update_topic_mastery(
    p_user_id, p_topic, p_module, p_is_correct, p_difficulty
  );
end;
$$;
