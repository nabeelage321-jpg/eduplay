-- Create activities table for EduPlay
-- Stores all educational activities/games

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  subject TEXT,
  grade TEXT,
  language TEXT DEFAULT 'en',
  curriculum TEXT,
  content JSONB NOT NULL,
  is_public BOOLEAN DEFAULT true,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_activities_grade ON activities(grade);
CREATE INDEX idx_activities_subject ON activities(subject);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_is_public ON activities(is_public);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_subject_grade ON activities(subject, grade);

-- Enable RLS (Row Level Security)
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read public activities
CREATE POLICY "Anyone can read public activities" ON activities
  FOR SELECT USING (is_public = true);

-- RLS Policy: Authenticated users can see all activities
CREATE POLICY "Authenticated users can see all activities" ON activities
  FOR SELECT USING (auth.role() = 'authenticated');

-- Update trigger to set updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
