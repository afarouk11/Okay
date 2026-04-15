-- ─── Synaptiq Initial Schema ──────────────────────────────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- or via: supabase db push (if using Supabase CLI)

-- ── Enable UUID extension ─────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Profiles table ────────────────────────────────────────────────────────────
-- Stores extended user data beyond what Supabase Auth provides.
-- Linked to auth.users via email (auth user is created separately via
-- the create_auth_user API action which calls /auth/v1/admin/users).

create table if not exists public.profiles (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  name         text,
  plan         text default 'student' check (plan in ('student', 'homeschool')),
  year         text,                          -- 'Year 12' | 'Year 13' | 'Other'
  subject      text default 'A-Level Mathematics',
  board        text default 'AQA',           -- AQA | Edexcel | OCR | WJEC
  target       text,                          -- Target grade e.g. 'A*'
  diffs        text[] default '{}',           -- ['adhd','dyslexia','dyscalculia']
  xp           integer default 0,
  level        integer default 1,
  stats        jsonb default '{}',            -- questionsAnswered, topicsExplored, etc.
  flashcards   jsonb default '[]',
  is_admin     boolean default false,         -- Set true for admin accounts
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Resources table ───────────────────────────────────────────────────────────
-- Stores uploaded mark schemes, past papers, and shared global resources.

create table if not exists public.resources (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  name          text not null,
  type          text,                         -- 'mark_scheme' | 'past_paper' | 'notes'
  subject       text,
  board         text,
  content       text,                         -- Truncated text content (first 500 chars)
  is_global     boolean default false,        -- True = visible to all users
  uploaded_at   timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Prevents users from reading each other's data via direct Supabase client calls.
-- The API routes use the service role key which bypasses RLS — that's intentional
-- so the backend can manage data on behalf of users.

alter table public.profiles  enable row level security;
alter table public.resources enable row level security;

-- Profiles: users can only read/update their own row
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid()::text = id::text);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid()::text = id::text);

-- Resources: users can read their own + global resources
drop policy if exists "resources_select" on public.resources;
drop policy if exists "resources_insert_own" on public.resources;
drop policy if exists "resources_delete_own" on public.resources;
create policy "resources_select" on public.resources
  for select using (
    user_id::text = auth.uid()::text
    or is_global = true
  );

create policy "resources_insert_own" on public.resources
  for insert with check (user_id::text = auth.uid()::text);

create policy "resources_delete_own" on public.resources
  for delete using (user_id::text = auth.uid()::text);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── Grant permissions to service role ────────────────────────────────────────
-- The API uses the service role key which already bypasses RLS,
-- but explicit grants ensure the role has DML access.
grant all on public.profiles  to service_role;
grant all on public.resources to service_role;

-- ── Set your admin account ────────────────────────────────────────────────────
-- After running this migration, run the following to grant admin access.
-- Replace the email with your actual admin email address.
--
-- update public.profiles
--   set is_admin = true
--   where email = 'your-admin@email.com';
