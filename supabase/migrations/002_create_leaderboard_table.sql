-- Create leaderboard table for tracking game scores
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  time_taken INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_activity_id ON leaderboard(activity_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_played_at ON leaderboard(played_at DESC);

-- Enable RLS for leaderboard table
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read leaderboard
CREATE POLICY "Enable read access for all users" ON leaderboard
  FOR SELECT USING (true);

-- RLS Policy: Only service role can insert
CREATE POLICY "Enable insert for service role" ON leaderboard
  FOR INSERT WITH CHECK (true);

-- RLS Policy: Only service role can update
CREATE POLICY "Enable update for service role" ON leaderboard
  FOR UPDATE USING (true) WITH CHECK (true);
