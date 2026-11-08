-- 013 — Live session records (2026-11-08).
-- Owner-run: run this file in the Supabase SQL editor.
--
-- Two columns, no data deleted, nothing renamed:
--   * live_sessions.teacher_id — which signed-in teacher hosted the
--     room. The create route already requires sign-in as the game's
--     owner, but it never stored who that was, so a teacher could
--     never list their own past rooms afterwards. Rooms hosted
--     before this runs simply have no teacher link and do not appear
--     in the teacher's rooms list.
--   * live_players.finished_at — when a player reported a finished
--     score. The score itself already lands in live_players.score;
--     this timestamp is what lets the host count "how many students
--     PLAYED" (finished) as opposed to merely joined. A player who
--     finishes with 0 correct still counts, because the timestamp
--     is set on the report, not on the score value.
--
-- Until this runs, the code keeps working: the create route retries
-- the insert without teacher_id, the score endpoint treats a
-- missing finished_at column as a no-op, and the "played" count
-- falls back to score > 0 / correct answers > 0.

ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS teacher_id TEXT;
CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher_id ON live_sessions(teacher_id);

ALTER TABLE live_players ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
