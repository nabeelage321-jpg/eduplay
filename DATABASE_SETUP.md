# EduPlay Pre-K Games - Database Setup Guide

## Quick Start

### Option 1: Automatic Setup (Recommended)

```bash
# This will attempt to create the database schema and seed 100 Pre-K games
npm run db:setup-prek
```

### Option 2: Manual SQL Execution

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your "edply" project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the SQL from `supabase/migrations/001_create_activities_table.sql`
6. Click **Run**

### Option 3: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase migration up
```

---

## What Gets Created

### Table: `activities`

```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY,
  title TEXT,
  description TEXT,
  type TEXT,              -- quiz, flashcards, match-up, true-false
  subject TEXT,           -- Math, Urdu, English, Science, Islamiyat
  grade TEXT,             -- pre-k, kg, 1, 2, etc.
  language TEXT,          -- en, ur, ar, etc.
  curriculum TEXT,        -- Pakistani, etc.
  content JSONB,          -- { "questions": [...] }
  is_public BOOLEAN,
  play_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Indexes Created

- `idx_activities_grade`
- `idx_activities_subject`
- `idx_activities_type`
- `idx_activities_is_public`
- `idx_activities_created_at`
- `idx_activities_subject_grade`

---

## Seed Data

**100 Pre-K Games** with:
- 5 Subjects (Math, Urdu, English, Science, Islamiyat)
- 5 Categories per subject
- 4 Game Types per category (quiz, flashcards, match-up, true-false)
- 10 Questions per game
- Age: 3-5 years
- Curriculum: Pakistani

### Run Seeding

```bash
node scripts/setup-prek.mjs
```

### Verify Count

```bash
# Check via API
curl "http://localhost:3000/api/browse-activities?grade=pre-k"

# Or query directly in Supabase
SELECT COUNT(*) FROM activities WHERE grade = 'pre-k';
```

---

## Browse Games

Once seeded, visit: **http://localhost:3000/en/browse**

Features:
- Filter by grade level
- Filter by subject
- Search games
- View game details

---

## API Endpoints

### Get Activities with Filters

```
GET /api/browse-activities?grade=pre-k&subject=Math&search=counting
```

Response:
```json
{
  "data": [...],
  "count": 20,
  "success": true
}
```

---

## Troubleshooting

### "Could not find the table 'public.activities'"

**Solution**: Run the SQL migration manually
- Go to Supabase SQL Editor
- Copy SQL from `supabase/migrations/001_create_activities_table.sql`
- Run it

### Table already exists?

No problem! The setup script will skip the table creation and proceed with seeding.

### Only partial games seeded?

Run seeding again:
```bash
node scripts/setup-prek.mjs
```

---

## File Locations

- **Migration SQL**: `supabase/migrations/001_create_activities_table.sql`
- **Seed Script**: `scripts/setup-prek.mjs`
- **Seed Data Code**: `src/lib/supabase/seed/prek-games.ts`
- **Browse Page**: `src/app/[locale]/browse/`
- **API Route**: `src/app/api/browse-activities/route.ts`

