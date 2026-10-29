# EduPlay — Batch 1 Report (LOCAL ONLY)

**Working copy:** `~/workspace/eduplay-rebuild` (a local copy of
`github.com/nabeelage321-jpg/eduplay`, Next.js 14 + TypeScript).

**What this batch is NOT:** no push to GitHub, no change to live Vercel,
no change to live Supabase, no deployment of any kind. Nothing here has
been published. `verify-games.mjs` was left completely untouched — it was
never run, never copied, and no key from it was used anywhere. No secret
appears in code, in this report, or in any committed file. The only
“keys” used during verification were obvious placeholder strings passed
as shell environment variables for a local build (see Verification);
they were never written to a file and are not real credentials.

## 1. What was built

### 1.1 Three new game types (now 23, was 20)

All three reuse the existing content model — prompt/answer items, no new
database tables — and follow the QuizGame play pattern: player name
(localStorage), How-To-Play screen, timed/scored run, completion screen,
best-effort leaderboard save (`POST /api/leaderboard`, failures are
caught exactly like the existing games).

| Slug | How it plays | Scoring |
|---|---|---|
| `memory-match` 🧠 | Flip tiles to match each prompt with its answer. | 100 points per matched pair. |
| `typing-race` ⌨️ | One prompt at a time; type the answer before the 30-second timer ends (the QuizGame timer). | QuizGame bands: 0–10s = 1000, 11–20s = 500, 21–30s = 200. Streak bonus: once a streak reaches 3, every further correct answer in the streak adds +50. Timeout or wrong streak-reset = 0 for that item. |
| `bingo` 🎱 | A bingo card built from the activity's own answers. Prompts are called in random order; tap the matching answer cell. | 100 points per correct mark. Bingo (full row, column or diagonal) = +500 bonus and the game ends. Card is 5×5 with 24+ items, otherwise 3×3 (8 answers + FREE centre) with 8+ items. |

Play games accept all three content shapes already used in this repo, so
creator-made activities work: `content.questions` with
`prompt`/`answer` (what the Create flow saves), `content.pairs` with
`left`/`right`, and `content.items` with `prompt`/`answer`. Quiz-style
questions with `options`/`correct` are also accepted (answer =
`options[correct]`). If an activity has too few items, the game shows a
plain “Not Enough Items” screen instead of crashing
(memory-match ≥ 2 pairs, typing-race ≥ 1 pair, bingo ≥ 8 pairs).

For each type, all of these were wired:

- Slug entry in `src/lib/supabase/seed/activity-types.ts`
  (with en/ur/ar/hi/es/fr names).
- Entry in `src/components/creator/TypeSelector.tsx`.
- Preview/activity component in `src/components/activity-types/`
  (`MemoryMatchActivity.tsx`, `TypingRaceActivity.tsx`,
  `BingoActivity.tsx`), exported from
  `src/components/activity-types/index.ts`.
- **Additional wiring found during verification (not in the original
  task list, but required for end-to-end Create):** the three components
  were also added to the player map in
  `src/components/activity-types/ActivityPlayer.tsx`. Without this, the
  Create-flow Preview step would have shown “Unknown activity type”
  for the new types.
- Full play game in `src/app/[locale]/play/[id]/`
  (`MemoryMatchGame.tsx`, `TypingRaceGame.tsx`, `BingoGame.tsx`),
  wired in `src/app/[locale]/play/[id]/page.tsx` (imports, render
  branches, and the valid-types list).
- Slug added to `validTypes` in `src/app/api/ai/generate/route.ts`,
  so AI generation can now request the new types.
- Slug added to `ACTIVITY_TYPE_SLUGS` in `src/lib/seo/sitemap.ts`
  (comments updated: 23 types → T1 = 253, T2 = 7,590, T3 = 106,260
  pages by the same formula).
- How-To-Play instructions for the three types in
  `src/app/[locale]/play/[id]/HowToPlayScreen.tsx`.

### 1.2 Roles: teacher / student / parent

- `UserRole` in `src/types/index.ts` is now
  `'teacher' | 'student' | 'parent' | 'admin'`, and the three new slugs
  were added to `ActivityTypeSlug` in the same file.
- New `src/components/creator/RolePicker.tsx`: a simple
  Teacher / Student / Parent-Creator picker rendered at the top of the
  Create flow (`ActivityCreator.tsx`). The choice is stored in
  `localStorage` (`eduplay-creator-role`) and broadcast via a
  `eduplay-role-change` window event.
- New `src/components/creator/CreatePageHeader.tsx`: the Create page
  heading/subtitle are now role-aware —
  teacher: “Create Activity” / “Create games for your students”;
  parent: “Create a Game for Your Kids” / “Create games for your
  kids”; student: “Create a Game for Your Classmates” / “Create games
  for your classmates”.
- **Auth was NOT rewritten**, as instructed. NextAuth is incomplete in
  this repo and is a separate batch. The role picker is a local,
  display-only choice for now; when real auth lands it must be replaced
  by the signed-in profile role.

### 1.3 URL fix (code only — no domain claim made)

- New `src/lib/seo/base-url.ts`:
  `getBaseUrl()` = `process.env.NEXT_PUBLIC_BASE_URL`, falling back to
  `https://eduplay-self.vercel.app` (the current live URL).
- The five named files now use it:
  `src/lib/seo/sitemap.ts`, `src/lib/seo/schema.ts`,
  `src/lib/seo/metadata.ts`, `src/components/seo/HreflangTags.tsx`,
  and `src/app/sitemap.ts`.
- The same fallback string was also updated (no other logic changed)
  in the remaining places that hardcoded it: `src/app/robots.ts`,
  `src/app/[locale]/layout.tsx` (metadataBase, previously
  `eduplay.com`), the SEO template pages
  (`[subject]/[gradeSlug]/[typeSlug]`, `[subject]/[gradeSlug]`,
  `activities/[type]`, `activity/[id]`, `curriculum/[board]/[grade]`,
  `teacher/[username]`, `topics/[topic]`), and
  `src/app/api/integrations/lms-export/route.ts`.
- Deliberately NOT changed: country subdomains in
  `src/lib/country-deploy.ts`, the `support@eduplay.app` contact email,
  and test fixtures that use `eduplay.app` as sample data.
- **Swapping to a custom domain later is one env-var change:** set
  `NEXT_PUBLIC_BASE_URL` in Vercel (or `.env.local` locally) and
  rebuild. Do not hardcode a new domain across the SEO files.

### 1.4 UI polish — new games only

Consistent with the existing games: large touch targets
(buttons ≥ 56–64 px tall), a visible score/timer header on every new
play game, and clear correct/wrong feedback. No site-wide redesign was
attempted in this batch.

## 2. Files changed

Modified (24 tracked files, 119 insertions / 41 deletions after
preserving the original CRLF line endings in 4 files):

- `src/types/index.ts`
- `src/lib/supabase/seed/activity-types.ts`
- `src/components/creator/TypeSelector.tsx`
- `src/components/creator/ActivityCreator.tsx`
- `src/components/activity-types/index.ts`
- `src/components/activity-types/ActivityPlayer.tsx`
- `src/app/[locale]/create/page.tsx`
- `src/app/[locale]/play/[id]/page.tsx`
- `src/app/[locale]/play/[id]/HowToPlayScreen.tsx`
- `src/app/api/ai/generate/route.ts`
- `src/lib/seo/sitemap.ts`, `src/lib/seo/schema.ts`,
  `src/lib/seo/metadata.ts`
- `src/components/seo/HreflangTags.tsx`
- `src/app/sitemap.ts`, `src/app/robots.ts`
- `src/app/[locale]/layout.tsx`
- `src/app/[locale]/[subject]/[gradeSlug]/[typeSlug]/page.tsx`,
  `src/app/[locale]/[subject]/[gradeSlug]/page.tsx`,
  `src/app/[locale]/activities/[type]/page.tsx`,
  `src/app/[locale]/activity/[id]/page.tsx`,
  `src/app/[locale]/curriculum/[board]/[grade]/page.tsx`,
  `src/app/[locale]/teacher/[username]/page.tsx`,
  `src/app/[locale]/topics/[topic]/page.tsx`
- `src/app/api/integrations/lms-export/route.ts`

New files (9):

- `src/components/activity-types/MemoryMatchActivity.tsx`
- `src/components/activity-types/TypingRaceActivity.tsx`
- `src/components/activity-types/BingoActivity.tsx`
- `src/app/[locale]/play/[id]/MemoryMatchGame.tsx`
- `src/app/[locale]/play/[id]/TypingRaceGame.tsx`
- `src/app/[locale]/play/[id]/BingoGame.tsx`
- `src/components/creator/RolePicker.tsx`
- `src/components/creator/CreatePageHeader.tsx`
- `src/lib/seo/base-url.ts`
- This report: `BATCH1_REPORT.md`

Untouched by design: `verify-games.mjs`, all `scripts/*`
(including every delete-and-seed script), live Vercel, live Supabase,
and GitHub (no commit, no push — `git status` in this copy shows only
the local edits above; build outputs `node_modules/` and `.next/` are
ignored and were not committed).

## 3. How to test locally (no live services needed for the preview path)

Prerequisites: Node.js (tested on v24.22.1) and, for a full local run,
a Supabase project for saving/playing by id (see limits below).

```bash
cd ~/workspace/eduplay-rebuild
npm install
npm run dev
# → http://localhost:3000/en/create
```

### 3.1 Create-flow test (works without a database save)

1. Open `/en/create`. The heading starts as “Create Activity”.
2. Pick **Parent-Creator** (or Student) in the “I am creating as…”
   picker at the top. The page heading/subtitle must change to the
   parent/student wording immediately.
3. Step 1: pick **Memory Match**, **Typing Race**, or **Bingo**
   (all three now appear in the type grid).
4. Step 2: any title/subject/grade. Step 3: add the sample items below.
5. Step 4 (Preview): the new game must render and be playable with
   those items, and finishing must show a score. This is the
   no-database proof that the components work.

Sample items (prompt → answer). Use all 9 for Bingo (3×3 card) and
Memory Match; Typing Race works with any subset:

| Prompt | Answer |
|---|---|
| Capital of Pakistan | Islamabad |
| Capital of France | Paris |
| 2 + 3 | 5 |
| 10 − 4 | 6 |
| Colour of the sky | Blue |
| First letter of the alphabet | A |
| 5 × 2 | 10 |
| Opposite of hot | Cold |
| Animal that says moo | Cow |

For a 5×5 Bingo card, add 15 more prompt/answer pairs (24 total).

### 3.2 Play-page test (needs a saved activity + database)

1. Save an activity of one of the new types (requires a signed-in
   account — see §5 limits; the Create save endpoint requires auth).
2. Open `/en/play/<activity-id>`.
3. Enter a name → How-To-Play → play → completion screen.
   Expected: memory-match scores 100/match; typing-race uses the
   1000/500/200 bands plus the +50 streak bonus at streak ≥ 3;
   bingo scores 100/mark and +500 on a completed line.
4. The completion screen attempts a leaderboard save; with a working
   database it should list the score, otherwise (like the existing
   games) the save fails silently and the game still completes.

### 3.3 AI test

`POST /api/ai/generate` with `activityType` set to `memory-match`,
`typing-race`, or `bingo` must now pass validation (previously it
rejected them as “Invalid activityType”). Full generation still needs
a valid Anthropic key and auth, which this local copy does not have.

## 4. Verification — what actually passed / failed

- `npm install` — **PASSED** (367 packages, 29s; only deprecation
  warnings for old dependencies, including the known Next.js 14.2.0
  security notice — not changed in this batch).
- `npm run type-check` (`tsc --noEmit`) — **PASSED**, exit 0, zero
  errors. Re-run after the CRLF fix and after the ActivityPlayer
  wiring; still zero errors.
- `npm run build` — **first attempt FAILED, second attempt PASSED
  (see below)**. Both runs compiled successfully and passed the
  lint/type stage.
  - First failure (pre-existing, unrelated to Batch 1): during
    “Collecting page data” for `/api/stripe/checkout`:
    `Error: Missing env var: STRIPE_SECRET_KEY`, thrown at import
    time by `src/lib/stripe/stripe.ts`. This repo cannot build
    without Stripe env vars at all, Batch 1 or not.
  - Second attempt, with obvious placeholder env vars only
    (`NEXT_PUBLIC_BASE_URL=https://eduplay-self.vercel.app`,
    placeholder Supabase URLs/keys, `STRIPE_SECRET_KEY` /
    `STRIPE_WEBHOOK_SECRET` placeholders): **PASSED** — compiled,
    97 static pages generated, routes include
    `/[locale]/play/[id]` (25.1 kB) and `/[locale]/create`.
- **NOT verified (honest limits):** no live play-through against a
  real Supabase database (no access in this task, and none was
  requested), no signed-in Create-save test (auth is incomplete),
  no Playwright/E2E run, and no check against the live Vercel site.
  The play games and leaderboard saves are therefore verified at the
  code/type/build level only — a database-backed play test is still
  required before any live claim (see §6).

## 5. What was NOT done

- Live multiplayer (real Socket.io / realtime rooms) — the socket
  route is still the pre-existing placeholder.
- Full UI/UX redesign of the site — polish was limited to the new
  games only.
- Auth fix — NextAuth remains incomplete; the role picker is local
  only (see §1.2).
- Thin SEO pages — the 100k+ programmatic pages are unchanged in
  substance. Note: adding 3 slugs to the sitemap *increases* the
  programmatic sitemap counts (T1 253, T2 7,590, T3 106,260 by the
  existing formula). Do not ship the sitemap change to production
  without the separate SEO decision on thin pages.
- Live deploy, GitHub push, Vercel/Supabase changes of any kind.
- Rotation of the exposed key in `verify-games.mjs` — flagged below,
  not actioned, because the file was explicitly out of scope and
  rotating a live key needs the owner.
- No new database tables, no schema migrations.

## 6. What is needed to go live (owner actions)

The agent doing this batch does **not** have the owner's
GitHub/Vercel/Supabase access, and the user must never be asked for
passwords in chat — access should come through the owner's normal
secure connect flow, arranged by the parent agent:

1. Owner reviews this local diff, then (when approved) it is pushed to
   GitHub and imported/deployed on Vercel from the owner's account.
2. Vercel env vars for the deployment: `NEXT_PUBLIC_BASE_URL`
   (set to the live URL, or later to the custom domain — one var),
   real Supabase URL/anon/service keys, `STRIPE_SECRET_KEY` /
   `STRIPE_WEBHOOK_SECRET` (already required by the existing build),
   and `ANTHROPIC_API_KEY` for AI generation.
3. Database-backed test: create one activity of each new type, play
   it end-to-end at `/en/play/<id>`, and confirm leaderboard saves.
4. Pre-existing live issues to resolve separately before promoting
   this as “fixed”: the live `/api/activities` 500 error observed on
   2026-10-29, the thin programmatic SEO pages, and rotation of the
   exposed key that sits in `verify-games.mjs` (rotate it in Supabase
   and remove/replace that file before any public launch).
