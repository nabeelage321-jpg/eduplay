# 🚀 QUICK START - Pre-K Games Setup

## Done ✅ What's Already Created:

- ✅ Database migration SQL file
- ✅ 100 Pre-K games seed data
- ✅ Browse page with filtering
- ✅ API endpoint for fetching games
- ✅ Setup scripts (Node)
- ✅ Documentation

---

## TODO (2 Steps to Complete):

### STEP 1: Create Database Table (5 min)

**Go to Supabase SQL Editor:**
1. https://app.supabase.com → Your Project
2. SQL Editor → New Query
3. **Paste this SQL:**

```sql
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

CREATE INDEX idx_activities_grade ON activities(grade);
CREATE INDEX idx_activities_subject ON activities(subject);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_is_public ON activities(is_public);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_subject_grade ON activities(subject, grade);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read public activities" ON activities
  FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated users can see all activities" ON activities
  FOR SELECT USING (auth.role() = 'authenticated');

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

4. Click **RUN** ✅

---

### STEP 2: Seed 100 Games (1 min)

```bash
# In your terminal:
npm run db:setup-prek

# Or:
node scripts/setup-prek.mjs
```

**Expected Output:**
```
✅ Inserted 100/100 games
📊 Total Pre-K games: 100

📚 Games per subject:
   Math: 20
   Urdu: 20
   English: 20
   Science: 20
   Islamiyat: 20

✨ Setup complete!
```

---

## VERIFY ✅

```bash
# Start dev server
npm run dev

# Visit: http://localhost:3000/en/browse
```

**You should see:**
- Grade filter: "Pre-K (3-5)"
- Subject filter with options
- 100 games in the list
- Each game shows: title, subject, type, grade, play count

---

## Test API

```bash
curl "http://localhost:3000/api/browse-activities?grade=pre-k"
```

Should return 100 games ✅

---

## File Reference

| Purpose | File |
|---------|------|
| SQL Migration | `supabase/migrations/001_create_activities_table.sql` |
| Browse Page | `src/app/[locale]/browse/page.tsx` |
| API Endpoint | `src/app/api/browse-activities/route.ts` |
| Setup Script | `scripts/setup-prek.mjs` |
| Seed Data | `src/lib/supabase/seed/prek-games.ts` |
| Full Guide | `SETUP_PREK_GAMES.md` |

---

## Games Breakdown

```
5 Subjects × 5 Categories × 4 Types = 100 Games

Math:       20 games (Counting, Shapes, Colors, Big&Small, Addition)
Urdu:       20 games (Alphabet, Words, Animals, Body Parts, Fruits)
English:    20 games (ABC, Words, Colors, Animals, Numbers)
Science:    20 games (Animals, Plants, Weather, Body, Food)
Islamiyat:  20 games (Allah, Prophet, Duas, Pillars, Months)

Game Types (25 each):
- Quiz (25)
- Flashcards (25)
- Match-up (25)
- True/False (25)
```

---

## Questions?

📖 See: `SETUP_PREK_GAMES.md` for complete guide
📊 See: `COMPLETION_SUMMARY.md` for detailed summary
🎮 See: `GAMES_PREVIEW.js` for game list
