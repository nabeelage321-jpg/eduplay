# EduPlay — Beat-With-Margin Agent Master (2026-10-30)

This file supersedes the old repo AGENT.md where they conflict.
Old AGENT.md is STALE in these places, do not follow them:
- "Phase 1 only is built" — false now (see §0).
- "AI via Claude / ANTHROPIC_API_KEY" — owner decision 2026-10-30:
  Anthropic is NOT used. Provider is UNDECIDED.
- "Pakistan-first → global" as the only market — now WORLDWIDE, not one
  country. Pakistan SNC is one curriculum among many.
- "Home page = onboarding gate" — gate removed 2026-10-30, real homepage live.
- "400K+ auto-indexed pages / thin programmatic templates" — old sitemap
  was 116,276 URLs, now 57,222 real-game URLs in 2 chunks, 0-game pages
  are noindex and out of the sitemap. Never create thin pages.

## 0. Status: NOT launched, NOT finalised
Live: https://eduplay-self.vercel.app (NOT eduplay.app — owner does not own
it, do not buy it). Repo: github.com/nabeelage321-jpg/eduplay, Next.js 14 +
TypeScript + Tailwind + Zustand + next-intl, Supabase, Vercel.

Already real (verified live, not file claims):
- 5,110 activities: 280 original + 4,830 programme (15 subjects × 14 grades
  × 23 types).
- Filter bug fixed (DB values, not labels) and play-page bug fixed
  (DB type + content → player items, all 23 types), browser-verified,
  including tappable Unjumble words.
- Real homepage since 2026-10-30: Play / Browse / Create / Join live,
  12 real game cards, 15 subject chips, real counts only
  (5,110 / 15 / 23 / 11). Theme picker moved to Navbar, not deleted.
- Live multiplayer is POLLING interim only, labelled as such. Not Realtime.
- Theme system still stands: CSS variables only, never hardcoded colours,
  RTL via logical properties, mobile-first at 375px, TypeScript strict.

## 1. Mission: beat them with margin, worldwide
Not "a simple competitor". EduPlay must beat Wordwall, Kahoot, Blooket,
Wayground (ex-Quizizz), Gimkit, Duolingo, Khan Academy, Roblox, Minecraft
Education and Nintendo with margin. Every feature is judged by: does it make
a teacher create faster, a kid play longer, or a creator share further than
the rival — or is it just parity? Parity alone is not enough.

## 2. Competitor synthesis (2026-10-30 research + 10 full-page screenshots)
Full files: research/competitors/*.md. Vendor claims are claims;
conflicted prices are flagged, never quoted as certain. No rival design,
branding, text or content is copied — facts and patterns only.

Strengths to copy (whole product, not homepage only):
- Wordwall: one content set → many templates in one click; create in
  1 minute; print/PDF first-class; 1-2-3 flow (template, content, play/print).
- Kahoot: shared-screen live show with pause-to-teach; split host/player
  screens; Join at the top; live + assignment + solo; XLSX reports.
- Blooket: one set × many modes; no-account join; homework link;
  printable worksheet + answer key; 3 steps (set, mode, play/analyse).
- Wayground: AI generate from topic/doc/standard/upload; one activity
  reused as assessment, presentation, homework, video, flashcards;
  accommodations + per-question reports; "Find anything you need to teach".
- Gimkit: Answer → Earn → Shop loop in 3 verbs; KitCollab — students
  submit questions, teacher accepts, class plays them; homework auto-graded.
- Duolingo: one promise + one Get Started; bite-sized lessons, points/
  levels/streaks, mascot, personalised pace, habit loop.
- Khan Academy: role-first (Student / Family / Teacher / School); free core
  promise; class-code join with no student email; mastery/reteach evidence.
- Roblox: one-tap Play; game cards with rating; genre chips; trending;
  templates + creator analytics (teacher analytics, not revenue).
- Minecraft Education: ready lesson library; standards codes per lesson;
  closed teacher-controlled join; evidence export (portfolio → PDF).
- Nintendo: one-action cards; big images; character-led cards; daily-return
  loop. Store-first is NOT copied — EduPlay is play-first.

Weaknesses to turn into strengths:
- Harsh free caps (Wordwall 3 activities, Wayground 20-activity storage,
  Kahoot small free player cap, Gimkit rotating free modes) → a genuinely
  more generous free tier, stated plainly, never faked.
- Speed-only scoring, blurred free analytics, MCQ-only editors,
  assessment-not-play feel → accuracy-first scoring, unblurred per-question
  reports, image-led play, play-first homepage.
- No Urdu / Roman Urdu, no full RTL creation, US-only standards, licence /
  download friction → Urdu Nastaliq + full RTL creation from day one,
  Roman Urdu, SNC + Islamiyat first-class, then the same localisation
  repeated per country; browser play, no download, no console.
- No real game cards on screen one (Blooket, Wayground), no game library
  (Khan), no teacher gradebook (Roblox, Minecraft) → real game cards,
  real teacher reports, real game library on screen one.

## 3. Differentiators — the margin, in priority order
1. PROMPT-TO-GAME (highest priority, §4).
2. No-login join: QR / PIN / link, no student account, no email.
   Anonymous-first with an honest privacy story. PIN alone is parity.
3. Video + editor for social creators (§5): proper downloadable vertical
   video (NOT screen recording), editor (crop, trim, shape, creator
   branding, end card), share card + ready caption + link. Link travels
   in the post and on the video page — a URL burned into video frames
   is NOT a backlink, and a forced watermark is cropped out.
4. Printable + low-bandwidth + WhatsApp distribution as first-class modes.
5. Teacher report that prescribes: "reteach Q4, Q7", per-question and
   per-student, exportable (CSV/XLSX/PDF), answers hidden in printables.
6. Remix with attribution lineage: one content set across game types.
7. Multilingual + RTL as architecture: 11 locales today, Urdu/Arabic RTL,
   read-aloud + mute, high-contrast type, no colour-only feedback.
8. Gated student authoring: students submit, teacher accepts, class plays.
   No public publishing by children, no open chat, no child names/photos
   in share cards or ads without parent consent.
9. Curriculum tags per country: SNC, then US, UK and others as separate
   tag sets. Never present one country's curriculum as worldwide.

## 4. Prompt-to-game (very important)
One prompt → playable, editable game in minutes:
  Prompt → editable draft (questions/pairs/words, source/topic noted) →
  teacher/creator approval (mandatory, no auto-publish) → playable game →
  remix / template-switch / print / share / video.
Rules:
- Language model is the engine, provider UNDECIDED. Anthropic/Claude is
  NOT used. Do not build on Claude until the owner chooses a provider,
  cost cap and eval set. Groq keys exist for other work; do not assume
  they are the EduPlay provider until the owner says so.
- No hallucinated facts as truth. Drafts are editable, source-linked
  where possible, teacher-checked before publishing. Fluent ≠ accurate.
  Fake citations are a launch blocker.
- Quiz, match-up and unjumble first, then the other 20 types. One prompt,
  one game, one play action — never a wall of text with no play button.
- Prompt-to-game is NOT "paste any YouTube/TikTok link and get a game".

## 5. Video-to-game and social video (legal version only)
Verdict: PARTIAL. "Paste any link" is NOT possible and NOT legal.
- Possible: own video/text, own YouTube channel (owner OAuth, captions
  only for the owner's content), public-domain / CC content → transcript →
  editable draft → teacher approval → playable game, private by default,
  capped free AI generations.
- NOT possible / NOT legal: downloading other people's YouTube/TikTok
  videos, scraping TikTok/YouTube or rival libraries, republishing
  non-commercial OER in paid tiers, stripping CC attribution.
- Earning: ads and inserted links live on the video page (kids-safe,
  specified separately), not as a forced overlay creators crop out.
  Backlinks come from post captions and video-page links.

## 6. Premium UI/UX standard (measurable)
- Screen one: who it is for in seconds, ONE dominant Play/Create/Join
  action, real game cards immediately, browse/search within one tap.
  No gate, no picker wall, no pricing wall on screen one.
- Kids: 44px minimum targets (larger for young kids), one question per
  screen, 16–20px+ high-contrast type, image-led play with sound/reward,
  bottom-centre primary actions, read-aloud + mute, RTL from day one.
- Creators: create in 2 minutes, preview before save, template-switch
  without re-entering content, share in one tap (link + ready caption).
- Social creators: share card 1200×630 (aggregate results only, no child
  names/photos) + 9:16 teaser 1080×1920, 15–30s, text out of top ~11% /
  bottom ~23% safe zones.
- Feedback: <100ms, colour + icon + sound, never colour alone. Rewards:
  accuracy-first + personal-best ghost mode + no-leaderboard mode.
- Never change design silently. Show design before shipping it.

## 7. Free APIs and open resources (with licences)
OpenTDB (no key, CC BY-SA), Wikimedia (User-Agent, per-image licence),
Openverse (per-item CC licence + attribution), Free Dictionary API,
browser Web Speech TTS (no quota), Whisper (local, MIT) for own audio.
Translate limits change — check before quoting; LibreTranslate self-hosted
is licence-unlimited but not cost-free. Always attribute CC content.
Never scrape rivals.

## 8. Build order (one thing at a time, closed in batches)
- Phase 0: one content model + quiz/match-up/unjumble + no-login join.
- Phase 1: prompt-to-game (draft → approval → play), print/PDF +
  low-bandwidth, teacher reteach report, homework.
- Phase 2: moderated library + remix + curriculum tags for one subject
  band, then per country.
- Phase 3: multilingual/RTL + accommodations + gated student authoring.
- Phase 4: gated AI from own/CC content; video download + editor +
  share cards / vertical video.
- Phase 5: flat worldwide school pricing, distribution (Classroom/LMS,
  WhatsApp), then realtime live (only after polling is proven).
- Explicitly later/never: open chat, public publishing by children,
  native apps, 3D worlds, "paste any TikTok/YouTube link".

## 9. Launch gates (owner steps, at his pace, one by one)
- Google OAuth: Web client, origin https://eduplay-self.vercel.app,
  redirect https://eduplay-self.vercel.app/api/auth/callback/google,
  then GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in Vercel + redeploy.
- Vercel: NEXT_PUBLIC_BASE_URL=https://eduplay-self.vercel.app.
- Supabase: legacy service_role deactivation — PARKED by owner 2026-10-30,
  revisit before launch; legacy anon stays untouched while Vercel uses it.
  The exposed key in deleted verify-games.mjs is only useless once this lands.
- GSC: submit ONLY https://eduplay-self.vercel.app/sitemap.xml
  (57,222 URLs, 2 chunks), never the old 116k sitemap, never request
  indexing for 0-game pages.
- Support email: parked. AI provider: undecided (§4).
- Live end-to-end test before launch: Google sign-in, create + save,
  Dashboard shows it, interactive play of memory-match / typing-race /
  bingo, and one prompt-to-game end to end.

## 10. Hard limits (even under full authority)
- No DB row deletion; no delete-and-seed scripts; no force-push;
  no repo deletions except ordered ones; no .env/secrets in commits;
  never use or repeat the exposed key from verify-games.mjs.
- No invented stats, plays, counts, rankings, testimonials or learner
  numbers. Homepage counts are real DB counts only.
- No faked live multiplayer. No claimed custom domain. No live Supabase /
  Vercel / GSC dashboard changes by Nova (no access).
- Never claim a game/feature is live until the live API or live page
  proves it, in a browser, not just HTTP 200.
- Never mix EduPlay numbers with Naya Zehan or Study AI. Those are
  separate projects; cross-promotion is a separate decision, with parent
  consent, no child data shared between platforms, no mixed counts.
- When the owner says wait/park, park fully and do not nudge early.
  When he says one step at a time, give literally one step.

---

## Appendix — preserved tech and theme rules (still true, from the old AGENT.md)

### Tech stack — never deviate
Frontend: Next.js 14 (App Router) + TypeScript (strict, no `any`).
Styling: Tailwind CSS + CSS custom properties for theming.
Animation: Framer Motion. State: Zustand (persisted with localStorage).
i18n: next-intl (RTL auto for ur + ar). Backend: Next.js API routes.
Database: Supabase (PostgreSQL). Auth: NextAuth.js (Google only, live
sign-in still needs the owner's OAuth client). Payments: Stripe (checkout
only; `src/lib/stripe/stripe.ts` throws at import without Stripe env, so
local builds use placeholder env — do not change Stripe logic to fix that).
Deploy: Vercel + Supabase. Testing: Vitest + Playwright.

### Theme system — critical, never break
Every component MUST use CSS variables, never hardcoded colours.
`<html data-theme="ladies|gents|kids">`, kids sub-themes via
`data-kids-theme` (space, ocean, jungle, princess, superhero, dinosaur,
candy, farm, robot, magic, astronaut, garden, mountains, sky, waterfall),
role looks via `data-role-theme` (teacher, student, parent, creator), and
a creator's own palette via `data-creator-palette` (sunset, forest,
ocean-blue, plum, slate, gold — a fixed safe list, never user CSS/JS).
Role/creator looks are saved on the device only (localStorage) until a
signed-in profile theme lands; they do not change any DB row.

### Code quality — always follow
- TypeScript strict; every component has aria labels; every page has
  correct meta tags; mobile-first at 375px; RTL-safe logical properties
  (start/end, never left/right); error boundaries; loading skeletons;
  inputs sanitised before DB insert; API routes rate-limited.
- File naming: components PascalCase.tsx, utilities camelCase.ts,
  pages page.tsx. Import order: React/Next, third party, internal (@/),
  then relative. Component structure: types, constants, sub-components,
  main component last.
- Before a batch is done: `tsc --noEmit` zero errors, `next build`
  passes (placeholder env only).

### Environment variables (no Anthropic — removed, provider undecided)
NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXTAUTH_SECRET,
NEXTAUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, STRIPE_SECRET_KEY,
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY. No ANTHROPIC_API_KEY anywhere.
