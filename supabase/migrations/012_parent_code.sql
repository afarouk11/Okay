-- Migration 009: Add parent_code to profiles for the parent dashboard
-- parent_code is a plain text 6-character code set by the student.
-- When null, parent access is disabled for that account.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_code text default null;

-- Optional: index for fast lookup when validating access codes
CREATE INDEX IF NOT EXISTS profiles_parent_code_idx
  ON public.profiles (parent_code)
  WHERE parent_code IS NOT NULL;
