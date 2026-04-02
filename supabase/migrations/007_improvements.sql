-- ─── Migration 007: Operational Improvements ──────────────────────────────────
-- 1. Admin audit log — immutable record of every admin action for security and
--    debugging. Rows are insert-only; no RLS needed (service-role only).
-- 2. Persistent trial message counter — replaces the in-memory per-instance
--    counter in api/chat.js so the daily trial cap survives serverless cold
--    starts and concurrent instances.
-- Run in Supabase SQL Editor or via: supabase db push

-- ── admin_audit_log ───────────────────────────────────────────────────────────

create table if not exists public.admin_audit_log (
  id           bigserial    primary key,
  action       text         not null,
  ip           text,
  metadata     jsonb        default '{}'::jsonb,
  performed_at timestamptz  not null default now()
);

-- Only the service role can insert; no direct user access
grant insert on public.admin_audit_log to service_role;

create index if not exists aal_action_idx       on public.admin_audit_log(action);
create index if not exists aal_performed_at_idx on public.admin_audit_log(performed_at desc);

-- ── Persistent trial message counter on profiles ──────────────────────────────
-- trial_messages_today      — incremented each time a trial user sends a chat
--                             message; reset to 0 when the date changes.
-- trial_messages_reset_date — the calendar date (YYYY-MM-DD) of the last reset.
--                             When today > this date the counter is treated as 0.

alter table public.profiles
  add column if not exists trial_messages_today      integer not null default 0,
  add column if not exists trial_messages_reset_date date;
