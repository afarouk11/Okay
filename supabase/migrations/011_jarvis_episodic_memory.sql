-- ─── Jarvis Episodic Memory ───────────────────────────────────────────────────
-- Stores a record for every Jarvis tutoring session so that the assistant
-- can recall where the student left off, surface recent errors, and track
-- mastery over time.
--
-- Apply via: Supabase SQL Editor → New query, or `supabase db push`.

-- ── jarvis_sessions table ─────────────────────────────────────────────────────

create table if not exists public.jarvis_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  session_date    timestamptz not null default now(),
  topic           text,                        -- e.g. 'Calculus', 'Statistics'
  mastery_score   numeric(4,3)                 -- 0.000 – 1.000
                    check (mastery_score is null or (mastery_score >= 0 and mastery_score <= 1)),
  specific_errors text[] not null default '{}',-- e.g. ARRAY['Chain Rule sign flip']
  duration_ms     integer                      -- session length in milliseconds
                    check (duration_ms is null or duration_ms >= 0),
  created_at      timestamptz not null default now()
);

-- Index for fast per-user lookups sorted by recency
create index if not exists jarvis_sessions_user_date_idx
  on public.jarvis_sessions (user_id, session_date desc);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.jarvis_sessions enable row level security;

drop policy if exists "Users can read own Jarvis sessions" on public.jarvis_sessions;
drop policy if exists "Users can insert own Jarvis sessions" on public.jarvis_sessions;
drop policy if exists "Users can delete own Jarvis sessions" on public.jarvis_sessions;
-- Users can only read their own sessions
create policy "Users can read own Jarvis sessions"
  on public.jarvis_sessions for select
  using (auth.uid() = user_id);

-- Users can insert sessions for themselves only
create policy "Users can insert own Jarvis sessions"
  on public.jarvis_sessions for insert
  with check (auth.uid() = user_id);

-- Users can delete their own sessions (e.g. privacy / data deletion)
create policy "Users can delete own Jarvis sessions"
  on public.jarvis_sessions for delete
  using (auth.uid() = user_id);
