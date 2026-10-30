-- AI-GENERATIONS TABLE 2026-10-30.
-- /api/ai/generate and /api/ai/usage already query this table, but no
-- migration ever created it, so both routes fail at the database (the
-- usage count falls back to 0, and generation recording silently fails).
-- Columns are exactly the ones existing code reads or writes:
--   generate/route.ts: teacher_id (filter + insert), created_at (filter),
--     prompt, result, model, tokens_used (insert)
--   usage/route.ts: teacher_id (filter), created_at (filter)
-- Run AFTER 004 (the users table this column references). Safe to re-run:
-- CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- Note: this table alone does not make live AI generation work — that
-- still needs an AI provider key, and Anthropic is NOT in use for EduPlay
-- (2026-10-30 decision), so no provider is assumed here.
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT,
  result TEXT,
  model TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_teacher_id ON ai_generations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at DESC);

-- Service-role access (used by API routes) bypasses RLS; enabling RLS
-- keeps anon-key reads out without blocking that path, as in 004.
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
