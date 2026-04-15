-- Migration 013: Create missing tables referenced in code
-- The GDPR data export and admin reset_users both reference these tables;
-- without them, those operations fail silently.

-- ── exams table ───────────────────────────────────────────────────────────────
create table if not exists public.exams (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references public.profiles(id) on delete cascade not null,
  subject    text        not null default 'Mathematics',
  board      text,
  exam_date  date,
  created_at timestamptz not null default now()
);

alter table public.exams enable row level security;

create policy exams_own on public.exams
  for all using (user_id::text = auth.uid()::text);

create index if not exists exams_user_idx on public.exams(user_id);

grant select, insert, update, delete on public.exams to authenticated;
grant all on public.exams to service_role;

-- ── flashcards table ──────────────────────────────────────────────────────────
-- Individual flashcard rows (front/back).
-- Note: profiles.flashcards JSONB column exists for legacy client-side storage;
-- new server-side writes use this table.
create table if not exists public.flashcards (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references public.profiles(id) on delete cascade not null,
  front      text        not null,
  back       text        not null,
  subject    text        not null default 'Mathematics',
  topic      text,
  tags       text[]      default '{}',
  created_at timestamptz not null default now()
);

alter table public.flashcards enable row level security;

create policy flashcards_own on public.flashcards
  for all using (user_id::text = auth.uid()::text);

create index if not exists flashcards_user_idx     on public.flashcards(user_id);
create index if not exists flashcards_subject_idx  on public.flashcards(user_id, subject);

grant select, insert, update, delete on public.flashcards to authenticated;
grant all on public.flashcards to service_role;
