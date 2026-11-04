-- KIDS SOCIAL APPROVAL v1 (2026-11-04, master-list original item C).
-- Run AFTER 001-006. DO NOT RUN 007: its teacher/parent approval gate
-- was superseded by the agreed kids social model, and this file covers
-- the columns 007 would have added that the new model still needs.
-- Safe to re-run (IF NOT EXISTS everywhere).
--
-- THE AGREED MODEL (code: src/lib/social-approval.ts):
--   * Gate applies to KIDS ONLY (recorded users.role = 'student'). A kid's
--     game stays private + pending until 3 testers approve it via its
--     test link, then it goes public automatically.
--   * Teachers, parents and creators bypass the gate entirely.
--   * A parent's approval counts as ONE of the 3, never a solo unlock.
--   * Sharing a test link never counts as an approval; "send to 12
--     friends" is invitation guidance, not a gate.
--   * Teachers/parents may REMOVE a bad item after it is live (private
--     again, status 'rejected'; editing it resubmits it for testing).
--   * The Creator badge (15 approved games) is ACHIEVEMENT DISPLAY ONLY.
--     It is computed live from approved games — NO stored creator_badge
--     column is created here, on purpose, so no code path can ever read
--     a badge as a publish bypass again.
--
-- WHAT THIS FILE ADDS:
--   activities.approval_status — 'pending' | 'approved' | 'rejected'.
--     Existing rows default to 'approved', so the 5,110 programme games
--     and every existing public game DO NOT change.
--   activities.approved_by / approved_at — kept for compatibility with
--     the existing API (test approvals leave approved_by NULL, because
--     testers are not users; approved_at records the publish moment).
--   users.role — the recorded server role ('teacher' | 'student' |
--     'parent' | 'admin'). Existing users get NULL until a role is set;
--     NULL is treated as a non-student, so teacher games do not change.
--   game_test_approvals — one row per tester approval, with a
--     server-enforced UNIQUE (game_id, tester_device_key) guard plus
--     the nickname check the API route performs. Nicknames only.
--   parent_links — kid -> parent invites. A kid (role 'student') creates
--     a code; a signed-in parent accepts it. Kid profiles stay name-only:
--     no kid email or password is created anywhere.
--
-- ACCESS: the API routes use the service-role client, which bypasses
-- RLS; enabling RLS keeps anon-key reads out without blocking that path.
-- Until the owner runs this file, the new routes answer with a plain
-- "not set up yet" state and kid games stay private (safe default).
--
-- How the owner runs it: Supabase Dashboard -> SQL Editor -> paste this
-- whole file -> Run. "Success. No rows returned" is the normal result.

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT
    CHECK (role IN ('teacher', 'student', 'parent', 'admin'));

CREATE INDEX IF NOT EXISTS idx_activities_approval
  ON activities(teacher_id, approval_status);

CREATE TABLE IF NOT EXISTS game_test_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  tester_nickname TEXT NOT NULL CHECK (char_length(tester_nickname) BETWEEN 1 AND 20),
  tester_device_key TEXT NOT NULL CHECK (char_length(tester_device_key) BETWEEN 1 AND 128),
  approver_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approver_role TEXT CHECK (approver_role IN ('teacher', 'student', 'parent', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT game_test_approvals_one_per_device UNIQUE (game_id, tester_device_key)
);

CREATE INDEX IF NOT EXISTS idx_game_test_approvals_game
  ON game_test_approvals(game_id, created_at);

ALTER TABLE game_test_approvals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS parent_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  link_code TEXT NOT NULL UNIQUE,
  kid_name TEXT NOT NULL DEFAULT 'Kid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_parent_links_kid
  ON parent_links(kid_user_id);

CREATE INDEX IF NOT EXISTS idx_parent_links_parent
  ON parent_links(parent_user_id);

ALTER TABLE parent_links ENABLE ROW LEVEL SECURITY;
