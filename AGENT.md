# AGENT.md — EduPlay Platform Master Context

You are a senior full-stack engineer building **EduPlay**, a multilingual interactive
learning platform. Read this entire file before writing a single line of code.
This file is the single source of truth for the entire project.

---

## 1. WHAT WE ARE BUILDING

EduPlay is a platform where teachers create interactive learning activities (quizzes,
games, worksheets) and students play them live or independently. Think Wordwall +
Kahoot + Blooket combined — but multilingual, gender-adaptive, and programmatic-SEO-first.

**Core differentiators:**
- 11 languages including Urdu (RTL) and Arabic (RTL)
- Gender-adaptive UI: Ladies theme / Gents theme / Kids theme
- 10 kids sub-themes (Space, Ocean, Jungle, Princess, Superhero, Dinosaur, Candy, Farm, Robot, Magic)
- Programmatic SEO: 8 template types generating 400K+ auto-indexed pages
- Pakistan-first launch → global country-by-country expansion
- AI activity generation via Claude API (Haiku model, free tier first)

---

## 2. TECH STACK — NEVER DEVIATE FROM THIS

```
Frontend:   Next.js 14 (App Router) + TypeScript (strict mode)
Styling:    Tailwind CSS + CSS custom properties for theming
Animation:  Framer Motion
State:      Zustand (persisted with localStorage)
i18n:       next-intl (RTL auto for ur + ar)
Backend:    Next.js API routes (no separate server for phases 1-4)
Database:   Supabase (PostgreSQL)
Realtime:   Socket.io (Phase 3 only)
Auth:       NextAuth.js (Google + email)
AI:         Anthropic Claude API — claude-haiku-4-5 (cheap), claude-sonnet-4-6 (premium)
Payments:   Stripe (Phase 6)
Deploy:     Vercel + Supabase
Testing:    Vitest (unit) + Playwright (E2E)
```

---

## 3. FOLDER STRUCTURE — ALWAYS USE THIS EXACT STRUCTURE

```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx           ← locale root layout
│   │   ├── page.tsx             ← home (onboarding or homepage)
│   │   ├── activities/
│   │   │   ├── page.tsx
│   │   │   ├── [subject]/
│   │   │   │   └── page.tsx     ← T2 SEO template
│   │   │   └── [subject]/[grade]/[type]/
│   │   │       └── page.tsx     ← T3 SEO template
│   │   ├── activity/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx     ← T4 individual activity
│   │   │   └── [id]/play/
│   │   │       └── page.tsx     ← game screen
│   │   ├── create/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── teacher/
│   │   │   └── [username]/
│   │   │       └── page.tsx     ← T7 teacher profile
│   │   └── topics/
│   │       └── [topic]/
│   │           └── page.tsx     ← T5 topic page
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── activities/
│       ├── ai/generate/
│       └── game/socket/
├── components/
│   ├── ui/                      ← reusable: Button, Card, Input, Modal, Badge
│   ├── layout/                  ← Navbar, Footer, Sidebar, ThemeSwitcher
│   ├── onboarding/              ← OnboardingScreen (already built Phase 1)
│   ├── home/                    ← HomePage, HeroSection, StatsBar
│   ├── activities/              ← ActivityCard, ActivityGrid, ActivityPlayer
│   ├── activity-types/          ← Quiz, MatchUp, Anagram, etc. (Phase 2)
│   ├── creator/                 ← ActivityCreator wizard (Phase 2)
│   ├── game/                    ← LiveGame, Leaderboard, GameModes (Phase 3)
│   └── ai/                      ← AIGenerator, PromptInput (Phase 4)
├── lib/
│   ├── store/
│   │   ├── theme-store.ts       ← already built
│   │   ├── auth-store.ts
│   │   └── game-store.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── ai/
│   │   └── claude.ts
│   ├── seo/
│   │   └── metadata.ts
│   └── i18n.ts                  ← already built
├── styles/
│   └── globals.css              ← already built — ALL 13 themes defined here
├── types/
│   └── index.ts                 ← already built — all types defined here
└── tests/
    ├── setup.ts
    ├── *.test.ts                ← Vitest unit tests
    └── *.e2e.ts                 ← Playwright E2E tests
messages/
├── en.json                      ← already built
├── ur.json                      ← already built
└── [ar,hi,es,fr,bn,pt,ru,id,zh].json
```

---

## 4. THEME SYSTEM — CRITICAL, NEVER BREAK THIS

The entire UI adapts via CSS custom properties on the `<html>` tag:

```html
<html data-theme="ladies">           ← ladies | gents | kids
<html data-theme="kids" data-kids-theme="space">   ← 10 kids options
```

**Every component MUST use CSS variables, never hardcoded colors:**
```tsx
// ✅ CORRECT
style={{ color: 'var(--color-primary)', background: 'var(--color-surface)' }}
className="text-primary bg-surface"   // tailwind aliases to CSS vars

// ❌ WRONG — never do this
style={{ color: '#D63384' }}
className="text-pink-500"
```

**Theme store (already built):**
```ts
import { useThemeStore } from '@/lib/store/theme-store'
const { audience, kidsTheme, setAudience, setKidsTheme } = useThemeStore()
```

**CSS variable reference:**
```css
--color-primary          ← main brand color
--color-primary-light    ← hover states
--color-primary-dark     ← active states
--color-background       ← page background
--color-surface          ← card/component background
--color-surface-alt      ← subtle section background
--color-text-primary     ← headings, important text
--color-text-secondary   ← body text
--color-text-muted       ← hints, placeholders
--color-border           ← borders, dividers
--color-success/warning/danger
--radius / --radius-sm / --radius-lg
--font-display / --font-body
--shadow / --shadow-card
--gradient-hero / --gradient-btn
```

---

## 5. SUPPORTED LANGUAGES

| Code | Language   | Dir | Status        |
|------|------------|-----|---------------|
| en   | English    | LTR | ✅ Phase 1    |
| ur   | Urdu       | RTL | ✅ Phase 1    |
| ar   | Arabic     | RTL | Phase 2       |
| hi   | Hindi      | LTR | Phase 2       |
| es   | Spanish    | LTR | Phase 3       |
| fr   | French     | LTR | Phase 4       |
| bn   | Bengali    | LTR | Phase 5       |
| pt   | Portuguese | LTR | Phase 5       |
| ru   | Russian    | LTR | Phase 5       |
| id   | Indonesian | LTR | Phase 6       |
| zh   | Chinese    | LTR | Phase 6       |

RTL locales: `['ur', 'ar']` — always set `dir="rtl"` on html tag for these.

---

## 6. DATABASE SCHEMA (Supabase / PostgreSQL)

```sql
-- Core tables already designed:

users (id, email, name, role, locale, country, is_premium, theme_preference, created_at)
subjects (id, slug, name_en, name_ur, name_ar, name_hi, name_es, emoji, order)
grades (id, number, label_en, label_ur, label_ar)
activity_types (id, slug, name_en, name_ur, icon, supports_live, supports_print)
curricula (id, country, board_name, slug)
topics (id, subject_id, slug, name_en, name_ur, name_ar)

activities (
  id, title, description, type_id, locale, teacher_id,
  subject_id, grade_id, curriculum_id, topic_id,
  items JSONB,          ← [{prompt, answer, imageUrl, hint}]
  is_public, tags,
  play_count, like_count,
  created_at, updated_at
)

game_sessions (
  id, activity_id, teacher_id, room_code,
  status (waiting|active|ended),
  game_mode, player_count, created_at
)

game_players (id, session_id, nickname, score, rank, joined_at)

ai_generations (id, teacher_id, prompt, result, model, tokens_used, created_at)
```

---

## 7. ACTIVITY TYPES (20 total — Phase 2)

```
quiz              → multiple choice questions
match-up          → drag left items to match right items
anagram           → unscramble letters to form word
crossword         → fill crossword grid
wordsearch        → find hidden words in grid
spin-wheel        → random selector wheel
balloon-pop       → pop balloon with correct answer
whack-a-mole      → hit correct moles
true-false        → swipe/tap true or false
categorize        → sort items into categories
order             → arrange items in correct sequence
fill-blank        → fill in missing word in sentence
labelled-diagram  → click correct part of image
flashcards        → flip card to reveal answer
missing-word      → sentence with word removed
unjumble          → arrange jumbled words into sentence
gameshow-quiz     → quiz with lifelines (50/50, audience)
hangman           → guess word letter by letter
random-wheel      → spin for random student/topic
open-box          → reveal hidden items
```

---

## 8. PROGRAMMATIC SEO — 8 TEMPLATE TYPES

```
T1: /[locale]/activities/[type]/
    → 20 types × 11 locales = 220 pages

T2: /[locale]/[subject]/[type]/
    → 30 subjects × 20 types × 11 locales = 6,600 pages

T3: /[locale]/[subject]/[grade]/[type]/
    → 30 × 12 grades × 20 × 11 = 79,200 pages

T4: /[locale]/activity/[slug]/
    → user-generated, grows with signups

T5: /[locale]/topics/[topic]/
    → 500 topics × 11 = 5,500 pages

T6: /[locale]/curriculum/[board]/[grade]/
    → 200 × 12 × 11 = 26,400 pages

T7: /[locale]/teacher/[username]/
    → auto-created per teacher

T8: /en/alternatives/[competitor]/
    → 50 competitor pages
```

SEO rules:
- Use Next.js `generateStaticParams` for T1-T3, T5-T6
- Use ISR (`revalidate: 86400`) for T4, T7
- Every page needs: title, description, keywords, canonical, hreflang for all 11 locales
- Use `schema.org/EducationalActivity` structured data
- Never create thin pages — each must show real activities or real content

---

## 9. AI INTEGRATION (Phase 4)

```ts
// Always use claude-haiku-4-5 for free/basic tier
// Always use claude-sonnet-4-6 for premium tier
// Always cache repeated system prompts (saves 90% cost)
// Rate limit: 10 AI generations/teacher/day on free tier

// API call pattern:
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-haiku-4-5',
    max_tokens: 1000,
    system: CACHED_SYSTEM_PROMPT,  // use cache_control
    messages: [{ role: 'user', content: userPrompt }]
  })
})
```

---

## 10. CODE QUALITY RULES — ALWAYS FOLLOW

### Must do:
- TypeScript strict mode — no `any` types ever
- Every component has proper `aria-label`, `role`, `aria-pressed` etc.
- Every page has correct meta tags (title, description, og:image, canonical)
- Mobile-first CSS — test at 375px (Pakistan users mostly on mobile)
- RTL-safe — never use `left/right` in CSS, always use `start/end`
- Proper error boundaries on every page
- Loading skeletons for async content
- All user inputs sanitized before DB insert
- All API routes have rate limiting

### File naming:
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Pages: `page.tsx` (Next.js convention)
- Tests: `ComponentName.test.ts` / `flow-name.e2e.ts`

### Import order:
```ts
// 1. React/Next
import { useState } from 'react'
import { useRouter } from 'next/navigation'
// 2. Third party
import { motion } from 'framer-motion'
// 3. Internal — absolute (@/)
import { useThemeStore } from '@/lib/store/theme-store'
import type { Activity } from '@/types'
// 4. Internal — relative
import ActivityCard from './ActivityCard'
```

### Component structure:
```tsx
// 1. Types/interfaces
// 2. Constants
// 3. Sub-components
// 4. Main component (default export last)
```

---

## 11. TESTING STANDARDS

Every phase must include:

**Unit tests (Vitest):**
- All utility functions
- All store actions
- All API route handlers
- Coverage threshold: 85% minimum

**E2E tests (Playwright):**
- All critical user flows
- Mobile viewport (375px)
- RTL layout (Urdu locale)
- All 3 audience themes
- Error states

**Before any phase is considered done:**
```bash
npm run type-check    ← zero TypeScript errors
npm test             ← all unit tests pass, coverage ≥ 85%
npm run test:e2e     ← all E2E tests pass on Chrome + Mobile
npm run build        ← production build succeeds with no errors
```

---

## 12. WHAT IS ALREADY BUILT (Phase 1 — complete)

These files exist and are correct. Do NOT rewrite them unless asked:

```
src/types/index.ts              ← all TypeScript types
src/styles/globals.css          ← all 13 CSS themes (435 lines)
src/lib/i18n.ts                 ← next-intl config
src/lib/store/theme-store.ts    ← Zustand theme store
src/app/[locale]/layout.tsx     ← root layout with ThemeInitializer
src/app/[locale]/page.tsx       ← home page (onboarding gate)
src/components/onboarding/OnboardingScreen.tsx  ← full 2-step onboarding
src/components/layout/Navbar.tsx
src/components/layout/ThemeSwitcher.tsx
src/components/home/HomePage.tsx
src/tests/theme-store.test.ts
src/tests/onboarding.e2e.ts
messages/en.json
messages/ur.json
package.json / tsconfig.json / tailwind.config.ts
next.config.ts / middleware.ts / postcss.config.js
vitest.config.ts / playwright.config.ts
```

---

## 13. OUTPUT FORMAT FOR EVERY RESPONSE

When generating code, always:

1. **State what you are building** — one sentence
2. **List all files you will create/modify** — before writing any code
3. **Write each file completely** — no truncation, no "..." placeholders
4. **After all files**, write a "Verification checklist" confirming:
   - TypeScript: no errors
   - Theme: uses CSS vars only
   - RTL: uses logical properties
   - Tests: written and passing
   - Mobile: works at 375px
5. **End with**: "Phase X complete. Files: N. Run `npm test` to verify."

---

## 14. ENVIRONMENT VARIABLES

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ANTHROPIC_API_KEY=           ← Phase 4 only
STRIPE_SECRET_KEY=           ← Phase 6 only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=   ← Phase 6 only
```

---

*This file is the law. When in doubt, re-read it.*
