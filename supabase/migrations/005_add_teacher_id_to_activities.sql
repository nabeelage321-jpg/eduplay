-- CREATE-SAVE FIX 2026-10-30 — activities.teacher_id.
-- Why this column did not exist is half of why Create-save could never
-- work: /api/activities/[id] PUT/DELETE select activities.teacher_id to
-- check ownership, but migration 001 never created that column, so every
-- ownership check failed. The other half was auth (see
-- src/lib/auth/session-user.ts): the routes now use the NextAuth session
-- and store the public.users id of the signed-in creator here.
--
-- Run AFTER 004 (the users table this column references). Safe to re-run:
-- ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- Existing rows (including all 4,830 programme games) keep teacher_id NULL:
-- NULL means "owned by no user", and the PUT/DELETE routes return 403 for
-- a NULL-teacher_id row, so programme games cannot be edited or deleted
-- through the API by any signed-in user.
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activities_teacher_id ON activities(teacher_id);
