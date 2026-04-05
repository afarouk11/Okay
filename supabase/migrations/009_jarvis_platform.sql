-- ── Migration 009 — Jarvis Platform Tables ───────────────────────────────────
-- chat_history, daily_plans tables for the Next.js Jarvis platform.
-- topic_mastery and mistakes tables already exist via 006_adaptive_learning.sql

-- ── chat_history ─────────────────────────────────────────────────────────────
create table if not exists public.chat_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  topic       text,
  created_at  timestamptz default now()
);

create index if not exists idx_chat_history_user_id   on public.chat_history(user_id);
create index if not exists idx_chat_history_created   on public.chat_history(created_at desc);

alter table public.chat_history enable row level security;
create policy "chat_history_own" on public.chat_history
  for all using (user_id::text = auth.uid()::text);

grant all on public.chat_history to service_role;

-- ── daily_plans ──────────────────────────────────────────────────────────────
create table if not exists public.daily_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  date        date not null,
  tasks       jsonb not null default '[]',
  created_at  timestamptz default now(),
  unique(user_id, date)
);

create index if not exists idx_daily_plans_user_date on public.daily_plans(user_id, date desc);

alter table public.daily_plans enable row level security;
create policy "daily_plans_own" on public.daily_plans
  for all using (user_id::text = auth.uid()::text);

grant all on public.daily_plans to service_role;

-- ── jarvis_memory (episodic memory for the widget, if not already created) ───
create table if not exists public.jarvis_memory (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  type        text not null,
  content     text not null,
  topic       text,
  created_at  timestamptz default now(),
  unique(user_id, type)
);

alter table public.jarvis_memory enable row level security;
create policy "jarvis_memory_own" on public.jarvis_memory
  for all using (user_id::text = auth.uid()::text);

grant all on public.jarvis_memory to service_role;
