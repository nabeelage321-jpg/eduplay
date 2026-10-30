-- AUTH BATCH 2026-10-30 — users table.
-- Why this table did not exist is the reason AI generation could never work
-- for a signed-in user: /api/ai/* looks up public.users by email and returns
-- 404 "User not found" when there is no row, and the Stripe webhook updates
-- tier / stripe_subscription_id / subscription_status on the same table.
-- Run AFTER 001–003. The NextAuth signIn callback upserts one row per Google
-- email (never overwriting is_premium / tier / stripe columns).
-- Columns are exactly the ones existing code selects or updates:
--   AI routes: id, is_premium, locale
--   Stripe webhook: tier, stripe_subscription_id, subscription_status
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  locale TEXT DEFAULT 'en',
  tier TEXT NOT NULL DEFAULT 'free',
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Service-role access (used by API routes and the auth callback) bypasses
-- RLS; enabling RLS keeps anon-key reads out without blocking that path.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
