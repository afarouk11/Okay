-- Migration 003: Add Stripe billing columns to profiles
-- These columns are written by the Stripe webhook handler when a subscription is created.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_id     text;

-- Index for fast webhook lookups by stripe customer id
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
