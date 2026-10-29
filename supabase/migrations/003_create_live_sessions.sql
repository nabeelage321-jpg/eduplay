-- Batch 3 (INTERIM live multiplayer) — live session tables.
-- NOT applied by code. The owner must run this file in the Supabase
-- SQL editor (or via the Supabase CLI) before the /live flow works
-- against a real database. Until then the /api/live-sessions routes
-- return a clear 503 instead of fake data.
--
-- SECURITY NOTE (read before public launch): the policies below allow
-- anonymous read/insert/update on these two tables only, because
-- classroom students join without accounts. Game scores here are
-- client-reported (see the API routes) and carry no personal data
-- beyond a nickname. Tighten these policies (e.g. teacher-only
-- start/end, signed score submissions) before opening this to the
-- public; that hardening is a separate batch.

CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL DEFAULT 'Teacher',
  mode TEXT NOT NULL DEFAULT 'classic',
  room_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'ended')),
  current_question INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_room_code ON live_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_live_players_session_id ON live_players(session_id);
CREATE INDEX IF NOT EXISTS idx_live_players_score ON live_players(session_id, score DESC);

ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_players ENABLE ROW LEVEL SECURITY;

-- Classroom access: anyone can read sessions/players and join.
DROP POLICY IF EXISTS "Anyone can read live sessions" ON live_sessions;
CREATE POLICY "Anyone can read live sessions" ON live_sessions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can create live sessions" ON live_sessions;
CREATE POLICY "Anyone can create live sessions" ON live_sessions
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update live sessions" ON live_sessions;
CREATE POLICY "Anyone can update live sessions" ON live_sessions
  FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Anyone can read live players" ON live_players;
CREATE POLICY "Anyone can read live players" ON live_players
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can join live sessions" ON live_players;
CREATE POLICY "Anyone can join live sessions" ON live_players
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update live players" ON live_players;
CREATE POLICY "Anyone can update live players" ON live_players
  FOR UPDATE USING (true);
