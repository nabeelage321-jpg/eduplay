-- GAME NUMBERS v1 (2026-11-07, batch 1, final list items 11–14).
-- Run AFTER 010. Safe to re-run (IF NOT EXISTS everywhere, and the
-- backfill loop only touches rows that still have no number).
-- The owner runs this file: Supabase Dashboard -> SQL Editor ->
-- paste this whole file -> Run. "Success. No rows returned" is the
-- normal result. Until it runs, the game-number routes answer
-- setupReady:false / 503 with a plain "not set up yet" message and
-- no number is shown anywhere — nothing is faked.
--
-- WHAT THIS FILE ADDS:
--   activities.game_number — one SHORT number per game (6 digits,
--     starting at 100001), so a teacher or parent can say it, write
--     it on the board, or message it, and a kid can type it into the
--     search box and open the game directly. New games get one
--     automatically from the sequence default; the backfill below
--     gives the 5,112 programme games their numbers too, oldest
--     first (earliest games get the lowest numbers).
--   saved_game_numbers — one row per signed-in user's saved game
--     number (Dashboard "My saved games"), server-enforced UNIQUE
--     (user_id, game_number) so one user saves a number once.
--
-- TEAM READ PATH (Supabase SQL Editor):
--   SELECT game_number, title FROM activities
--     WHERE game_number IS NOT NULL ORDER BY game_number LIMIT 20;

CREATE SEQUENCE IF NOT EXISTS eduplay_game_number_seq START WITH 100001;

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS game_number INTEGER UNIQUE DEFAULT nextval('eduplay_game_number_seq');

-- Backfill, oldest first: the earliest games get the lowest numbers.
-- The loop only touches rows that still have no number, so re-running
-- this file never renumbers a game.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM activities WHERE game_number IS NULL ORDER BY created_at ASC NULLS LAST, id
  LOOP
    UPDATE activities SET game_number = nextval('eduplay_game_number_seq') WHERE id = r.id;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_activities_game_number
  ON activities(game_number);

CREATE TABLE IF NOT EXISTS saved_game_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL REFERENCES activities(game_number) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_game_numbers_one_per_user UNIQUE (user_id, game_number)
);

CREATE INDEX IF NOT EXISTS idx_saved_game_numbers_user
  ON saved_game_numbers(user_id, created_at DESC);

ALTER TABLE saved_game_numbers ENABLE ROW LEVEL SECURITY;
