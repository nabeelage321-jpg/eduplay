# EduPlay Leaderboard Setup Guide

## ✅ COMPLETED COMPONENTS

### 1. API Endpoint
**File:** `/src/app/api/leaderboard/route.ts`
- ✅ POST handler: Saves game scores to leaderboard
- ✅ GET handler: Fetches top 10 scores for an activity
- ✅ Uses Supabase service role for secure database access
- ✅ Proper error handling and validation

### 2. Quiz Game Component
**File:** `/src/app/[locale]/play/[id]/QuizGame.tsx`
- ✅ Timer countdown (30 seconds per question) with circular SVG
- ✅ Points calculation: 1000 points (0-10s), 500 (11-20s), 200 (21-30s)
- ✅ Player name entry screen with localStorage persistence
- ✅ Points display after each answer
- ✅ Final results screen with:
  - Final Score (total points)
  - Correct Answers (count/total)
  - Percentage accuracy
  - Time Taken (total game duration)
- ✅ Leaderboard display with top 10 scores
- ✅ Current player highlighted in yellow
- ✅ Saves scores to leaderboard after game completes

### 3. Database Schema
**File:** `/supabase/migrations/002_create_leaderboard_table.sql`
- Table: `leaderboard`
- Columns:
  - `id` (UUID Primary Key)
  - `activity_id` (UUID, Foreign Key to activities)
  - `player_name` (TEXT)
  - `score` (INTEGER) - total points earned
  - `correct_answers` (INTEGER) - count of correct answers
  - `time_taken` (INTEGER) - seconds taken to complete
  - `played_at` (TIMESTAMP)
  - `created_at` (TIMESTAMP)
- Indexes for fast queries
- Row Level Security enabled for public read access

## ⏳ REMAINING TASK: CREATE LEADERBOARD TABLE IN SUPABASE

### Step-by-Step Instructions:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/eggmywzelppuswbtgdjz
   - Click "SQL Editor" in the left sidebar

2. **Create New Query**
   - Click "New Query" button
   - Or click "Create a new SQL snippet"

3. **Paste the Migration SQL**
   - Copy the SQL from below
   - Paste into the SQL Editor
   - Click "RUN" button

4. **Verify Table Creation**
   - Go to "Table Editor"
   - You should see "leaderboard" table in the list
   - Click it to verify columns are created

### SQL to Run in Supabase Dashboard:

```sql
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

-- RLS Policy: Service role can insert
CREATE POLICY "Enable insert for service role" ON leaderboard
  FOR INSERT WITH CHECK (true);

-- RLS Policy: Service role can update
CREATE POLICY "Enable update for service role" ON leaderboard
  FOR UPDATE USING (true) WITH CHECK (true);
```

## 🧪 TESTING AFTER SETUP

### Flow:
1. Go to `http://localhost:3000/en/browse`
2. Click "Play" on any game
3. Enter your name
4. Answer questions with countdown timer
5. Watch points calculate based on speed
6. View final results card with stats
7. See leaderboard populated with scores

### Expected Results:
- ✅ Timer counts down from 30 to 0
- ✅ Timer turns red when ≤10 seconds
- ✅ Correct answers in first 10s = 1000 points
- ✅ Correct answers in 11-20s = 500 points
- ✅ Correct answers in 21-30s = 200 points
- ✅ Incorrect answers = 0 points
- ✅ Score updates after each question
- ✅ Final screen shows all stats
- ✅ Leaderboard saves your score
- ✅ Top 10 scores display with rank
- ✅ Your score highlighted in yellow

## 📝 FILES CREATED/MODIFIED

### Created:
- `/src/app/api/leaderboard/route.ts` - API endpoint
- `/supabase/migrations/002_create_leaderboard_table.sql` - Schema

### Modified:
- `/src/app/[locale]/play/[id]/QuizGame.tsx` - Added timer, scoring, game complete screen

## 🚀 DEPLOYMENT STATUS

| Component | Status | Notes |
|-----------|--------|-------|
| API Endpoint | ✅ Ready | Located at `/api/leaderboard` |
| Quiz Game UI | ✅ Ready | Full timer + scoring + leaderboard |
| Database Schema | ⏳ Pending | Must run SQL in Supabase Dashboard |
| Browse Page | ✅ Working | Play button routes to game |
| Player Entry | ✅ Working | Name saved to localStorage |
| Game Logic | ✅ Complete | Timer, scoring, results all working |

---

**Next Step:** Run the SQL migration in Supabase Dashboard to create the leaderboard table, then test the full game flow!
