# EduPlay Phase 2 — File Placement Guide

## WHERE EACH FILE GOES IN YOUR PROJECT

Copy each file from this zip into your project at the exact path shown.
Your project root is the `edtech/` folder from Phase 1.

---

## PART A — Activity Type Components (22 files)
### → Copy to: `src/components/activity-types/`

| File in this zip | Copy to |
|-----------------|---------|
| `src/components/activity-types/shared.ts` | `src/components/activity-types/shared.ts` |
| `src/components/activity-types/index.ts` | `src/components/activity-types/index.ts` |
| `src/components/activity-types/ActivityPlayer.tsx` | `src/components/activity-types/ActivityPlayer.tsx` |
| `src/components/activity-types/QuizActivity.tsx` | `src/components/activity-types/QuizActivity.tsx` |
| `src/components/activity-types/MatchUpActivity.tsx` | `src/components/activity-types/MatchUpActivity.tsx` |
| `src/components/activity-types/AnagramActivity.tsx` | `src/components/activity-types/AnagramActivity.tsx` |
| `src/components/activity-types/CrosswordActivity.tsx` | `src/components/activity-types/CrosswordActivity.tsx` |
| `src/components/activity-types/WordsearchActivity.tsx` | `src/components/activity-types/WordsearchActivity.tsx` |
| `src/components/activity-types/SpinWheelActivity.tsx` | `src/components/activity-types/SpinWheelActivity.tsx` |
| `src/components/activity-types/BalloonPopActivity.tsx` | `src/components/activity-types/BalloonPopActivity.tsx` |
| `src/components/activity-types/WhackAMoleActivity.tsx` | `src/components/activity-types/WhackAMoleActivity.tsx` |
| `src/components/activity-types/TrueFalseActivity.tsx` | `src/components/activity-types/TrueFalseActivity.tsx` |
| `src/components/activity-types/CategorizeActivity.tsx` | `src/components/activity-types/CategorizeActivity.tsx` |
| `src/components/activity-types/OrderActivity.tsx` | `src/components/activity-types/OrderActivity.tsx` |
| `src/components/activity-types/FillBlankActivity.tsx` | `src/components/activity-types/FillBlankActivity.tsx` |
| `src/components/activity-types/LabelledDiagramActivity.tsx` | `src/components/activity-types/LabelledDiagramActivity.tsx` |
| `src/components/activity-types/FlashcardsActivity.tsx` | `src/components/activity-types/FlashcardsActivity.tsx` |
| `src/components/activity-types/MissingWordActivity.tsx` | `src/components/activity-types/MissingWordActivity.tsx` |
| `src/components/activity-types/UnjumbleActivity.tsx` | `src/components/activity-types/UnjumbleActivity.tsx` |
| `src/components/activity-types/GameshowQuizActivity.tsx` | `src/components/activity-types/GameshowQuizActivity.tsx` |
| `src/components/activity-types/HangmanActivity.tsx` | `src/components/activity-types/HangmanActivity.tsx` |
| `src/components/activity-types/RandomWheelActivity.tsx` | `src/components/activity-types/RandomWheelActivity.tsx` |
| `src/components/activity-types/OpenBoxActivity.tsx` | `src/components/activity-types/OpenBoxActivity.tsx` |

---

## PART B — Creator Wizard (5 files)
### → Copy to: `src/components/creator/`

| File in this zip | Copy to |
|-----------------|---------|
| `src/components/creator/TypeSelector.tsx` | `src/components/creator/TypeSelector.tsx` |
| `src/components/creator/MetaForm.tsx` | `src/components/creator/MetaForm.tsx` |
| `src/components/creator/ItemEditor.tsx` | `src/components/creator/ItemEditor.tsx` |
| `src/components/creator/ActivityPreview.tsx` | `src/components/creator/ActivityPreview.tsx` |
| `src/components/creator/ActivityCreator.tsx` | `src/components/creator/ActivityCreator.tsx` |

---

## PART C — Activity UI Components (4 files)
### → Copy to: `src/components/activities/`

| File in this zip | Copy to |
|-----------------|---------|
| `src/components/activities/ActivityCard.tsx` | `src/components/activities/ActivityCard.tsx` |
| `src/components/activities/ActivityGrid.tsx` | `src/components/activities/ActivityGrid.tsx` |
| `src/components/activities/ActivityFilters.tsx` | `src/components/activities/ActivityFilters.tsx` |
| `src/components/activities/PrintExport.tsx` | `src/components/activities/PrintExport.tsx` |

---

## PART D — API Routes (3 files)
### → Copy to exact paths shown

| File in this zip | Copy to |
|-----------------|---------|
| `src/app/api/activities/route.ts` | `src/app/api/activities/route.ts` |
| `src/app/api/activities/[id]/route.ts` | `src/app/api/activities/[id]/route.ts` |
| `src/app/api/activities/[id]/play/route.ts` | `src/app/api/activities/[id]/play/route.ts` |

---

## PART E — Pages (4 files)
### → Copy to exact paths shown

| File in this zip | Copy to |
|-----------------|---------|
| `src/app/[locale]/activities/page.tsx` | `src/app/[locale]/activities/page.tsx` |
| `src/app/[locale]/activity/[id]/page.tsx` | `src/app/[locale]/activity/[id]/page.tsx` |
| `src/app/[locale]/activity/[id]/play/page.tsx` | `src/app/[locale]/activity/[id]/play/page.tsx` |
| `src/app/[locale]/create/page.tsx` | `src/app/[locale]/create/page.tsx` |

---

## PART F — Library Files (3 files)
### → Copy to exact paths shown

| File in this zip | Copy to |
|-----------------|---------|
| `src/lib/supabase/server.ts` | `src/lib/supabase/server.ts` |
| `src/lib/supabase/client.ts` | `src/lib/supabase/client.ts` |
| `src/lib/store/theme-store.ts` | `src/lib/store/theme-store.ts` *(replaces Phase 1 version)* |

---

## PART G — Types (1 file)
### → Replaces Phase 1 types

| File in this zip | Copy to |
|-----------------|---------|
| `src/types/index.ts` | `src/types/index.ts` *(replaces Phase 1 version)* |

---

## PART H — Translations (2 files)
### → Replaces Phase 1 messages

| File in this zip | Copy to |
|-----------------|---------|
| `messages/en.json` | `messages/en.json` *(replaces Phase 1 version — has all Phase 2 keys added)* |
| `messages/ur.json` | `messages/ur.json` *(replaces Phase 1 version — has all Phase 2 keys added)* |

---

## PART I — Tests (4 files)
### → Copy to: `src/tests/`

| File in this zip | Copy to |
|-----------------|---------|
| `src/tests/setup.ts` | `src/tests/setup.ts` |
| `src/tests/activity-scoring.test.ts` | `src/tests/activity-scoring.test.ts` |
| `src/tests/api-routes.test.ts` | `src/tests/api-routes.test.ts` |
| `src/tests/phase2.e2e.ts` | `src/tests/phase2.e2e.ts` |

---

## PART J — Config Files (3 files)
### → Copy to project root

| File in this zip | Copy to |
|-----------------|---------|
| `package.json` | `package.json` *(replaces Phase 1 version — adds Phase 2 deps)* |
| `vitest.config.ts` | `vitest.config.ts` |
| `playwright.config.ts` | `playwright.config.ts` |

---

## AFTER COPYING ALL FILES

Run these commands in order:

```bash
# 1. Install new dependencies
npm install

# 2. Check TypeScript — should show 0 errors
npm run type-check

# 3. Run unit tests — should all pass
npm test

# 4. Start dev server
npm run dev
```

Then visit:
- `http://localhost:3000/en/activities` — Browse activities
- `http://localhost:3000/en/create` — Create activity wizard
- `http://localhost:3000/en/activity/[id]` — View activity
- `http://localhost:3000/en/activity/[id]/play` — Play activity

---

## SUPABASE SETUP REQUIRED

Add these environment variables to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Run this SQL in your Supabase dashboard:

```sql
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type_id TEXT NOT NULL,
  locale TEXT DEFAULT 'en',
  teacher_id UUID REFERENCES auth.users(id),
  subject_id TEXT,
  grade_id TEXT,
  curriculum_id TEXT,
  topic_id TEXT,
  items JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activities_public ON activities(is_public, created_at DESC);
CREATE INDEX idx_activities_teacher ON activities(teacher_id);
CREATE INDEX idx_activities_type ON activities(type_id);

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public activities are viewable by everyone" ON activities FOR SELECT USING (is_public = true);
CREATE POLICY "Teachers can manage own activities" ON activities FOR ALL USING (auth.uid() = teacher_id);
```

---

## TOTAL: 52 FILES
