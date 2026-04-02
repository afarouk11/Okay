-- ─── Migration 008: Tasks ───────────────────────────────────────────────────
-- User tasks (study todos). When the GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO
-- environment variables are set, each new task is also pushed to the
-- repository's GitHub Issues so developers can track user-requested work.
-- Run in Supabase SQL Editor or via: supabase db push

create table if not exists public.tasks (
  id                  uuid         primary key default gen_random_uuid(),
  user_id             uuid         not null references public.profiles(id) on delete cascade,
  title               text         not null,
  description         text,
  due_date            date,
  done                boolean      not null default false,
  github_issue_number integer,
  created_at          timestamptz  not null default now()
);

alter table public.tasks enable row level security;

create policy "Users can manage own tasks"
  on public.tasks
  for all
  using (auth.uid() = user_id);

create index if not exists tasks_user_id_idx    on public.tasks(user_id);
create index if not exists tasks_created_at_idx on public.tasks(created_at desc);
