# EduPlay — AUTH batch report (2026-10-30)

## What was wrong

- Navbar linked to `/[locale]/login` and `/[locale]/signup`, but neither
  page existed (404). There was no `/api/auth` route at all, even though
  `next-auth` 4.24 is in `package.json` and Vercel already has
  `NEXTAUTH_SECRET` + `NEXTAUTH_URL` set.
- Seven call sites called `getServerSession()` with **no auth options**.
  In NextAuth v4 (App Router) the session is only resolved when the
  options are passed, so those routes could never see a signed-in user.
- The `public.users` table those routes look up did not exist in any
  migration, so even a valid session would have returned
  404 "User not found" on every AI route.

## 1. Audit — every auth/session call site in `src/` and the shape it expects

Session shape expected by ALL NextAuth call sites (unchanged by this batch):

| Field | Used by |
|---|---|
| `session.user.email` (required, else 401) | `/api/ai/generate`, `/api/ai/generate-question`, `/api/ai/lesson-recap`, `/api/ai/usage`, `/api/stripe/checkout` |
| `session.user` (any, else 401) | `/api/integrations/lms-export` |
| `session.user.name` | `/api/stripe/checkout` (Stripe customer name; email is also used as the Stripe `userId` metadata) |
| DB lookup after the session check | AI routes: `public.users` by `email`, selecting `id, is_premium` (+ `locale` in lesson-recap). Stripe webhook updates `tier, stripe_subscription_id, subscription_status` on the same table by email. |

Full call-site list:

- `src/app/api/ai/generate/route.ts` — `getServerSession()` → 401 without
  email, then 404 without a `users` row; free users limited to 10/day
  via `ai_generations` (see "Not fixed" below).
- `src/app/api/ai/generate-question/route.ts`, `lesson-recap/route.ts`,
  `usage/route.ts` — same pattern.
- `src/app/api/integrations/lms-export/route.ts` — 401 without
  `session.user`.
- `src/app/api/stripe/checkout/route.ts` — 401 without email; customer
  keyed by email.
- `src/lib/stripe/portal/route.ts` — same pattern, but NOTE: this file
  lives under `src/lib/`, so it is **not** a real App Router route
  (nothing imports it). Updated for consistency only; the real billing
  portal route, if needed, is a separate later task.
- `src/app/api/activities/route.ts` (POST) and `[id]/route.ts` (PUT/DELETE)
  — a DIFFERENT, broken auth: `supabase.auth.getUser()` on a
  service-role client with `persistSession: false` and no Authorization
  header, so it can never return a user (always 401). It also checks
  `activities.teacher_id`, a column that does not exist in migration
  001, and POST never sets an owner. **Not fixed in this batch** — fixing
  it properly needs an ownership design + migration, not just a session
  swap (see §5).
- `src/app/[locale]/create/page.tsx` — **no auth check at all**. Anyone
  can open the creator; saving via `/api/activities` POST hits the
  broken auth above. **Not gated in this batch** (see §5).
- `src/app/[locale]/dashboard` — **no such page exists**, even though
  Navbar links to `/[locale]/dashboard`. **Not built in this batch** —
  the task was login/signup only; dashboard is a separate page build.
- `src/components/creator/RolePicker.tsx` / `CreatePageHeader.tsx` —
  role is still a localStorage display choice, explicitly marked
  "replaced by the signed-in profile role when auth lands". **Role is
  still not stored on the user profile** in this batch; the sign-in
  callback only upserts email + name (see §2).

## 2. What was implemented (this batch)

**Provider decision: NextAuth + Google only.**

- It fits the existing session shape exactly — no route's auth check
  was rewritten, only the missing options argument was supplied.
- Vercel already has `NEXTAUTH_SECRET` + `NEXTAUTH_URL`, so Google
  needs only two more env vars from the owner (see §4).
- Supabase email/magic-link was considered and rejected for this batch:
  it would require rewriting all 7 NextAuth call sites and changing
  the session shape, and Supabase Auth would still need its own
  email-provider setup. It is not "no setup" in practice.
- A Credentials (email+password) provider was rejected: there is no
  password store in the codebase, and adding hashing + reset flow is
  a security surface, not a shortcut. There is deliberately NO
  password form on the login/signup pages.

**New files:**

- `src/lib/auth/auth-options.ts` — the single shared `authOptions`:
  Google provider (only when `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
  are present; otherwise the provider list is empty on purpose),
  `secret` from `NEXTAUTH_SECRET`, and callbacks:
  - `signIn`: upserts `public.users` by email (name only; never
    overwrites `is_premium` / `tier` / stripe columns). A DB failure
    never blocks sign-in — it is logged and the AI routes then fail
    with their own clear 404 until migration 004 is run.
  - `jwt` / `session`: carry `email` and `name` into the session.
- `src/app/api/auth/[...nextauth]/route.ts` — the NextAuth handler
  (GET + POST). Outside `[locale]` on purpose: `/api/*` is excluded
  from the next-intl middleware matcher.
- `src/components/auth/AuthProvider.tsx` — `SessionProvider` wrapper,
  mounted in the locale layout so Navbar and the auth forms can use
  `useSession()` / `signIn()` / `signOut()`.
- `src/components/auth/AuthForm.tsx` — shared login/signup form.
  Google button when configured; a plain setup notice when not
  ("Google sign-in is not connected yet" — a setup step, not a
  broken button). Signed-in users see their email + a continue
  button (login → Browse, signup → Create) + Sign out.
- `src/app/[locale]/login/page.tsx`, `src/app/[locale]/signup/page.tsx`
  — the pages Navbar already linked to. `robots: noindex` on both.
  "Sign up" is the same Google button as "Sign in": the first Google
  sign-in creates the account (users-row upsert above).
- `supabase/migrations/004_create_users_table.sql` — `users` table with
  exactly the columns existing code selects or updates: `id, email
  (unique), name, is_premium, locale, tier, stripe_subscription_id,
  subscription_status, created_at, updated_at`. Run AFTER 001–003.

**Changed files:**

- All 7 `getServerSession()` call sites → `getServerSession(authOptions)`
  (import added; no auth logic changed).
- `src/components/layout/Navbar.tsx` — signed-in users now see their
  email + Sign out (desktop and mobile); signed-out users see the
  existing Login / Sign up links, which now resolve.
- `src/app/[locale]/layout.tsx` — wraps children in `AuthProvider`.
- `messages/en.json`, `messages/es.json`, `messages/ur.json` — added
  the missing `nav.signup` key (other locales already had it; without
  it the Navbar's Sign up label had no translation in those locales).
  One line each, formatting preserved.

## 3. Session shape change

**None, by design.** `session.user.email` / `.name` / `.image` are
exactly what the routes already expected. The only behavioural change
is that a session can now actually exist: previously there was no
auth route and no options, so the check could never pass. One addition
around the session (not in it): sign-in now creates/updates the
`users` row the AI routes need.

## 4. Owner setup — still required before launch (no secrets in chat)

In Vercel (Production + Preview), in addition to the env vars already
set (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, Supabase, Stripe):

1. **Google OAuth client** (Google Cloud Console → APIs & Services →
   Credentials → Create OAuth client ID, type Web application):
   - Authorized JavaScript origins: `https://eduplay-self.vercel.app`
   - Authorized redirect URI:
     `https://eduplay-self.vercel.app/api/auth/callback/google`
   - Then set in Vercel (never paste the values in chat, never put
     them in code):
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
   - Redeploy. Until these two are set, login/signup pages render the
     setup notice and Google sign-in cannot work — that is expected,
     not a bug.
2. **Run migration 004** in Supabase (after 001–003, and after
   migration 003 for live sessions if not already run). Until it is
   run, a signed-in user gets 404 "User not found" from `/api/ai/*`
   (the sign-in itself still succeeds).
3. **Live test after deploy:** open `/en/login`, sign in with Google,
   confirm Navbar shows your email, then open `/en/create` and run one
   AI generation (needs `ANTHROPIC_API_KEY` set in Vercel as well).
   Send Nova a screenshot if any step fails — do not edit code on
   GitHub during a batch.

Already set (no action): `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
Still open from earlier batches (unchanged by this one): resume
Supabase if paused again, Stripe keys, real support email, social
handle ownership, split-sitemap submission after deploy.

## 5. What is NOT verified / NOT fixed

- **No live Google sign-in test** — impossible until the owner
  supplies the OAuth client (§4.1). Verified locally instead: type
  check clean, production build passes, local server returns 200 for
  `/en/login` and `/en/signup`, `/api/auth/session` returns `{}` with
  no session and no crash, and the setup notice renders when Google
  env vars are absent (the exact state the live site will be in
  before §4.1).
- **Create-save still broken independently of auth:** `/api/activities`
  POST/PUT/DELETE always 401 (service-role `auth.getUser()` with no
  token) and `activities.teacher_id` does not exist. Needs a later
  ownership batch; do not claim "signed-in users can save games"
  until that batch lands.
- **Dashboard page still does not exist** (Navbar link 404s); the
  dashboard components exist but there is no route. Separate build.
- **Creator role still local-only** (localStorage) — not stored on
  the user profile yet.
- **`ai_generations` table still has no migration:** daily-limit
  counting returns 0 on error and usage recording fails silently
  (both paths are non-fatal by code design). A later migration can
  make the 10/day free limit real; it was out of auth scope.
- **Billing portal route** (`src/lib/stripe/portal/route.ts`) is dead
  code under `src/lib/` — updated for consistency, not wired as a
  route.
- Build note (pre-existing): the production build fails without
  Stripe env vars at import time, so verification used placeholder
  env vars, as in previous batches. The live Vercel project already
  has `STRIPE_SECRET_KEY` set.
