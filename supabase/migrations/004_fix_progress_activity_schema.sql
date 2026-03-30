-- Migration 004: Fix column mismatches between progress.js API and the schema
-- progress.js writes: accuracy, questions_done, last_practiced, onConflict(user_id,subject,topic)
-- activity_log writes: date, questions_done, xp_earned, onConflict(user_id,date)

-- ── Fix progress table ────────────────────────────────────────────────────────
ALTER TABLE public.progress
  ADD COLUMN IF NOT EXISTS accuracy        numeric(5,2) default 0,
  ADD COLUMN IF NOT EXISTS questions_done  integer      default 0,
  ADD COLUMN IF NOT EXISTS last_practiced  timestamptz  default now();

-- Unique index required for the upsert onConflict in progress.js
CREATE UNIQUE INDEX IF NOT EXISTS progress_user_subject_topic_idx
  ON public.progress (user_id, subject, topic);

-- ── Fix activity_log table ────────────────────────────────────────────────────
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS date           date         default current_date,
  ADD COLUMN IF NOT EXISTS questions_done integer      default 0,
  ADD COLUMN IF NOT EXISTS xp_earned      integer      default 0;

-- Unique index required for the upsert onConflict in progress.js
CREATE UNIQUE INDEX IF NOT EXISTS activity_log_user_date_idx
  ON public.activity_log (user_id, date);
