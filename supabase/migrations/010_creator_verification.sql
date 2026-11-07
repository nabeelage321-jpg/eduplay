-- SOCIAL-CREATOR VERIFICATION v1 (2026-11-07, build-list final 6,
-- item 13). Run AFTER 009. Safe to re-run (IF NOT EXISTS everywhere).
-- The owner runs this file: Supabase Dashboard -> SQL Editor ->
-- paste this whole file -> Run. "Success. No rows returned" is the
-- normal result. Until it runs, GET /api/creator-verification answers
-- setupReady:false and POST answers 503 with a plain "not set up yet"
-- message — the editor never opens on a missing table.
--
-- THE MODEL (code: src/lib/creator-verification.ts):
--   * Two creator types, handled separately. KIDS (recorded
--     users.role = 'student') make games for their friends only and
--     NEVER get the social editor / public posting.
--   * SOCIAL MEDIA CREATORS make games for reach/audience. They get
--     a social editor — GATED: they put our website link on their
--     social media and submit the profile/post URL here; status is
--     'pending' until the TEAM verifies the link by hand, then the
--     team sets status 'verified' and the editor tab opens.
--   * ENFORCEMENT: if a creator removes the link after verification,
--     the team sets status 'revoked' and the editor CLOSES (the
--     editor checks status at open time). Videos made in the social
--     editor carry OUR NAME (branded renders) so they are
--     identifiable as ours, and the team reaches out to the platform
--     to remove the reel/video. Automatic re-checking of the link is
--     PHASE 2 — the team re-checks by hand in this version.
--   * One verification row per creator (UNIQUE user_id). Submitting
--     a new link while verified sends the creator back to 'pending'
--     until the new link is verified.
--
-- TEAM READ PATH (Supabase SQL Editor):
--   SELECT user_id, platform, profile_url, status, created_at
--     FROM creator_verifications WHERE status = 'pending'
--     ORDER BY created_at;
--   -- verify the link is really on their social media, then:
--   UPDATE creator_verifications SET status = 'verified',
--     reviewed_at = now() WHERE user_id = '<uuid>';
--   -- if the link was removed after verification:
--   UPDATE creator_verifications SET status = 'revoked',
--     reviewed_at = now() WHERE user_id = '<uuid>';

CREATE TABLE IF NOT EXISTS creator_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'facebook')),
  profile_url TEXT NOT NULL CHECK (char_length(profile_url) BETWEEN 8 AND 500),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'revoked')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_verifications_status
  ON creator_verifications(status, created_at);

ALTER TABLE creator_verifications ENABLE ROW LEVEL SECURITY;
