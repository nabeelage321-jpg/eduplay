-- APPROVAL GATE + KID CREATOR BADGE 2026-10-30.
-- Run AFTER 001–006. Safe to re-run (IF NOT EXISTS everywhere).
-- What it adds:
--   activities.approval_status — 'pending' | 'approved' | 'rejected'.
--     Existing rows default to 'approved', so the 5,110 programme games
--     and every existing public game DO NOT change.
--   activities.approved_by / approved_at — who approved, and when.
--   users.role — the recorded server role ('teacher' | 'student' |
--     'parent' | 'admin'). Before this column, roles only lived in the
--     browser (localStorage RolePicker) and the server could never tell
--     a student from a teacher. Existing users get NULL until a role is
--     set; NULL is treated as a non-student by the API, so teacher games
--     do not change.
--   users.creator_badge — true once a student has earned 15 approved
--     games (counted by the /approve endpoint, never by hand).
-- How the owner runs it: Supabase Dashboard → SQL Editor → paste this
-- whole file → Run. "Success. No rows returned" is the normal result.
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

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS creator_badge BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_activities_approval
  ON activities(teacher_id, approval_status);
