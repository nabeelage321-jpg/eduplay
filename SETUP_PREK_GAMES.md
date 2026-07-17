# 🎓 EduPlay Pre-K Games - Complete Setup Instructions

## Overview

This guide will walk you through creating 100 Pre-K educational games for EduPlay. 

**What you'll get:**
- 100 games across 5 subjects
- 5 categories per subject
- 4 game types per category
- 10 questions per game
- Age: 3-5 years (Pre-K)
- Pakistani curriculum

---

## STEP 1: Create the Database Table

### Using Supabase Web Console (Easiest)

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Sign in to your account

2. **Navigate to SQL Editor**
   - Click on your "edply" project
   - In the left sidebar, click **SQL Editor**
   - Click **New Query** (or + icon)

3. **Copy and Paste the Migration SQL**

```sql
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
```

4. **Execute the Query**
   - Click **Run** button (or `Ctrl+Enter`)
   - You should see: "Query executed successfully"

✅ **Table Created!**

---

## STEP 2: Seed 100 Pre-K Games

Once the table is created, seed the data:

```bash
# From the edply directory
node scripts/setup-prek.mjs
```

### What This Does:

1. ✅ Generates 100 Pre-K games with:
   - **Subjects**: Math, Urdu, English, Science, Islamiyat
   - **Categories per subject**: 5
   - **Game types**: quiz, flashcards, match-up, true-false
   - **Questions per game**: 10
   - **Grade**: pre-k (ages 3-5)
   - **Curriculum**: Pakistani

2. ✅ Inserts them into the `activities` table in batches

3. ✅ Verifies all 100 games were inserted

### Example Output:

```
🚀 EduPlay Pre-K Games Database Setup
=====================================

📝 Creating activities table and indexes...

🌱 Seeding 100 Pre-K games...

✅ Inserted 20/100 games
✅ Inserted 40/100 games
✅ Inserted 60/100 games
✅ Inserted 80/100 games
✅ Inserted 100/100 games

📊 Verifying data...

✅ Total Pre-K games in database: 100

📚 Games per subject:
   Math: 20
   Urdu: 20
   English: 20
   Science: 20
   Islamiyat: 20

========================================
✨ Setup complete! 100 Pre-K games ready to play!
========================================
```

---

## STEP 3: Verify the Games

### Via Browse Page

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Visit: http://localhost:3000/en/browse

3. You should see:
   - Grade filter (Pre-K selected)
   - Subject filter
   - Search box
   - 100 games displayed

### Via API

```bash
# Get all Pre-K games
curl "http://localhost:3000/api/browse-activities?grade=pre-k"

# Get Pre-K Math games
curl "http://localhost:3000/api/browse-activities?grade=pre-k&subject=Math"

# Get Pre-K Math quizzes
curl "http://localhost:3000/api/browse-activities?grade=pre-k&subject=Math&type=quiz"

# Search for specific game
curl "http://localhost:3000/api/browse-activities?grade=pre-k&search=counting"
```

### Via Supabase Console

In Supabase SQL Editor:

```sql
-- Total count
SELECT COUNT(*) as total FROM activities WHERE grade = 'pre-k';

-- Result: 100

-- Count by subject
SELECT subject, COUNT(*) as count 
FROM activities 
WHERE grade = 'pre-k' 
GROUP BY subject;

-- Result:
-- subject      | count
-- -------------|-------
-- Math         | 20
-- Urdu         | 20
-- English      | 20
-- Science      | 20
-- Islamiyat    | 20

-- Count by type
SELECT type, COUNT(*) as count 
FROM activities 
WHERE grade = 'pre-k' 
GROUP BY type;

-- Result:
-- type         | count
-- -------------|-------
-- quiz         | 25
-- flashcards   | 25
-- match-up     | 25
-- true-false   | 25
```

---

## STEP 4: Test the Browse Page

### Features Implemented:

✅ **Browse Page** (`/en/browse`)
- Grade level filter (Pre-K, Kindergarten, Grade 1, Grade 2)
- Subject filter (All, Math, Urdu, English, Science, Islamiyat)
- Search functionality
- Game cards displaying:
  - Game title
  - Description
  - Subject badge
  - Game type badge
  - Grade level badge
  - Play count
  - "Play Now" button

✅ **API Endpoint** (`/api/browse-activities`)
- Supports filters: `grade`, `subject`, `type`, `search`
- Returns: `{ data, count, success }`
- All public games visible

---

## File Structure

```
edply/
├── supabase/
│   └── migrations/
│       └── 001_create_activities_table.sql     ← Migration SQL
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── browse-activities/
│   │   │       └── route.ts                     ← API for fetching games
│   │   └── [locale]/
│   │       └── browse/
│   │           ├── page.tsx                     ← Browse page
│   │           └── BrowseClient.tsx             ← Browse UI component
│   └── lib/
│       └── supabase/
│           └── seed/
│               └── prek-games.ts                ← Seed data generator
├── scripts/
│   └── setup-prek.mjs                           ← Setup & seeding script
└── DATABASE_SETUP.md                            ← This file
```

---

## Troubleshooting

### ❌ "Could not find the table 'public.activities'"

**Solution**: Run the migration SQL in Supabase (Step 1) before running the seed script.

### ❌ "Only 50 games inserted instead of 100"

**Solution**: Run the seed script again:
```bash
node scripts/setup-prek.mjs
```

### ❌ "CORS error when fetching from browse page"

**Solution**: Make sure your browse-activities API route is accessible:
```bash
curl http://localhost:3000/api/browse-activities?grade=pre-k
```

### ❌ "No games showing on browse page"

**Solution**: 
1. Verify table created: Go to Supabase → Tables → you should see `activities`
2. Verify data inserted: Run the count query in Supabase SQL Editor
3. Check API response: Test the API endpoint above

---

## Game Structure

Each game contains:

```json
{
  "id": "uuid",
  "title": "Math - Counting (quiz)",
  "description": "Pre-K quiz game for counting in Math",
  "type": "quiz",
  "subject": "Math",
  "grade": "pre-k",
  "language": "en",
  "curriculum": "Pakistani",
  "content": {
    "questions": [
      {
        "question": "How many apples? 🍎🍎🍎",
        "options": ["Two", "Three", "Four", "Five"],
        "correct": 1,
        "emoji": "🍎"
      },
      ...9 more questions
    ]
  },
  "is_public": true,
  "play_count": 0,
  "created_at": "2026-06-20T13:00:00Z"
}
```

---

## What's Included

### Games by Subject

#### 1. **Math** (20 games)
- Counting (1-10)
- Shapes
- Colors and Numbers
- Big and Small
- Simple Addition

#### 2. **Urdu** (20 games)
- Urdu Alphabet
- Simple Urdu Words
- Animals in Urdu
- Body Parts in Urdu
- Fruits in Urdu

#### 3. **English** (20 games)
- ABC Alphabet
- Simple Words
- Colors in English
- Animals in English
- Numbers 1-10

#### 4. **Science** (20 games)
- Animals and Sounds
- Plants and Trees
- Weather
- My Body Parts
- Food we Eat

#### 5. **Islamiyat** (20 games)
- Allah and His Names
- Prophet Muhammad (SAW)
- Basic Duas
- Five Pillars
- Islamic Months

---

## Next Steps

1. ✅ Run migration SQL
2. ✅ Seed games with script
3. ✅ Visit browse page
4. ✅ Test filtering and search

### Optional Enhancements:

- [ ] Add "Play" functionality to route to game player
- [ ] Add rating/like system
- [ ] Add game history tracking
- [ ] Add teacher dashboard
- [ ] Add more game types

---

## Questions?

- 📖 Check [EduPlay README](./README.md)
- 🐛 Review [Errors](./errors.txt)
- 📋 See [File Placement Guide](./FILE_PLACEMENT_GUIDE.md)

