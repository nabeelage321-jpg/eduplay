-- THEME REQUESTS v1 (2026-11-07, build-list final 6, item 9).
-- Run AFTER 008. Safe to re-run (IF NOT EXISTS everywhere).
-- The owner runs this file: Supabase Dashboard -> SQL Editor ->
-- paste this whole file -> Run. "Success. No rows returned" is the
-- normal result. Until it runs, GET /api/theme-requests answers
-- setupReady:false and POST answers 503 with a plain "not set up yet"
-- message — nothing fakes a saved request.
--
-- WHAT THIS FILE ADDS:
--   theme_requests — one row per signed-in user's request for a
--     theme, with a server-enforced UNIQUE (user_id, theme_name)
--     guard so one user counts once per theme. Identical theme names
--     aggregate into a count (see src/lib/theme-requests.ts); a theme
--     is flagged once it reaches 100 requests. The flag is only a
--     flag: the team adds the theme in a later step, it is never
--     auto-created. Requests go TO THE EDUPLAY TEAM — there is no
--     user-to-user messaging on this platform and this table must
--     never be read as one.
--
-- TEAM READ PATH (Supabase SQL Editor):
--   SELECT theme_name, count(*) AS requests
--     FROM theme_requests GROUP BY theme_name ORDER BY requests DESC;
--   -- a theme at 100+ requests is flagged for adding.
--   UPDATE theme_requests SET ... -- not needed; requests are
--   read-only history. The team adds a theme by building it, then
--   deletes its rows with: DELETE FROM theme_requests WHERE
--   lower(theme_name) = lower('<name>');

CREATE TABLE IF NOT EXISTS theme_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme_name TEXT NOT NULL CHECK (char_length(theme_name) BETWEEN 1 AND 60),
  message TEXT CHECK (message IS NULL OR char_length(message) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT theme_requests_one_per_user UNIQUE (user_id, theme_name)
);

CREATE INDEX IF NOT EXISTS idx_theme_requests_name
  ON theme_requests(theme_name, created_at);

ALTER TABLE theme_requests ENABLE ROW LEVEL SECURITY;
