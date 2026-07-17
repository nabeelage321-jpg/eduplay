# EduPlay — Phase Prompts
# Attach AGENT.md to your conversation, then paste the prompt for the phase you want.
# ─────────────────────────────────────────────────────────────────────────────────


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 PROMPT — Activity Engine
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are building Phase 2 of the EduPlay platform as defined in AGENT.md.
Phase 1 is already complete (foundation, themes, onboarding, i18n).
Do not rewrite anything from Phase 1.

Build the complete Activity Engine. Here is exactly what to create:

PART A — Activity Player Components (src/components/activity-types/)
Build all 20 activity type components. Each component must:
- Accept props: items (ActivityItem[]), theme (Audience), locale (SupportedLocale), onComplete (score: number) => void
- Use only CSS custom properties for all colors (no hardcoded values)
- Work in RTL layout for Urdu and Arabic
- Be fully keyboard accessible (aria labels, focus management)
- Show animated score/feedback when answer is correct or wrong
- Work at 375px mobile width

Build these 20 components in this exact order:
1.  QuizActivity         — multiple choice, 4 options, timer per question
2.  MatchUpActivity      — drag-and-drop pairs, left column to right column
3.  AnagramActivity      — letter tiles to drag into correct word order
4.  CrosswordActivity    — interactive crossword grid, across + down clues
5.  WordsearchActivity   — letter grid, click+drag to highlight words
6.  SpinWheelActivity    — animated spinning wheel, lands on random item
7.  BalloonPopActivity   — balloons float up, tap correct answer balloon
8.  WhackAMoleActivity   — moles pop up, tap correct answer mole
9.  TrueFalseActivity    — swipe left (false) / right (true) card
10. CategorizeActivity   — drag items into correct category buckets
11. OrderActivity        — drag items into correct sequence
12. FillBlankActivity    — sentence with blank, type or select answer
13. LabelledDiagramActivity — image with clickable hotspots
14. FlashcardsActivity   — flip card animation, front/back
15. MissingWordActivity  — sentence with word removed, pick from options
16. UnjumbleActivity     — tap words in correct sentence order
17. GameshowQuizActivity — dramatic reveal, lifelines (50/50, skip)
18. HangmanActivity      — letter-by-letter guess, animated hangman drawing
19. RandomWheelActivity  — names/topics wheel, used by teacher
20. OpenBoxActivity      — tap boxes to reveal hidden words/images

PART B — Activity Creator Wizard (src/components/creator/)
Build a step-by-step activity creator:
- Step 1: Choose activity type (visual grid of all 20 with icons)
- Step 2: Enter title, subject, grade, language, curriculum
- Step 3: Add items (prompt + answer pairs) with add/remove/reorder
- Step 4: Preview the activity before saving
- Step 5: Save options (public/private, tags)
Components: ActivityCreator.tsx, TypeSelector.tsx, MetaForm.tsx, ItemEditor.tsx, ActivityPreview.tsx

PART C — Activity Card + Grid (src/components/activities/)
- ActivityCard.tsx — display card with play/edit/share/print buttons, theme-aware
- ActivityGrid.tsx — responsive grid with loading skeletons
- ActivityFilters.tsx — filter by subject, grade, type, language
- PrintExport.tsx — generates print-ready HTML version of any activity

PART D — API Routes (src/app/api/activities/)
- GET /api/activities — list with filters, pagination
- POST /api/activities — create new activity (auth required)
- GET /api/activities/[id] — get single activity
- PUT /api/activities/[id] — update (owner only)
- DELETE /api/activities/[id] — delete (owner only)
- POST /api/activities/[id]/play — increment play count

PART E — Pages
- src/app/[locale]/activities/page.tsx — browse all activities
- src/app/[locale]/activity/[id]/page.tsx — single activity view (T4 SEO template)
- src/app/[locale]/activity/[id]/play/page.tsx — full-screen game player
- src/app/[locale]/create/page.tsx — activity creator page

PART F — Translations
Add to messages/en.json and messages/ur.json all strings for:
- All 20 activity type names and instructions
- Creator wizard steps
- Error messages
- Score/feedback messages ("Correct! +10 points", "Try again!", etc.)

PART G — Tests
- Unit tests for all 20 activity scoring logic functions
- Unit tests for API route handlers
- E2E tests: create activity flow, play quiz flow, print activity
- Test all activities render correctly in ladies/gents/kids themes

Quality gates before finishing:
- npm run type-check → zero errors
- npm test → all pass, coverage ≥ 85%
- npm run build → no errors
- Verify QuizActivity works in Urdu (RTL)
- Verify all 20 activities use only CSS vars

End with: "Phase 2 complete. Files: N. Run npm test to verify."


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 PROMPT — Live Game Engine
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are building Phase 3 of the EduPlay platform as defined in AGENT.md.
Phases 1 and 2 are complete. Do not rewrite anything from previous phases.

Build the complete Live Game Engine. Here is exactly what to create:

PART A — Socket.io Server (src/app/api/game/socket/route.ts)
Build a Socket.io server handling these events:
Teacher events:
- create_room: generates 6-digit room code, creates game_session in DB
- start_game: begins countdown, sends first question to all players
- next_question: advances to next question
- pause_game / resume_game
- end_game: saves results, sends final leaderboard
- kick_player: removes a specific player
- change_game_mode: switch mode mid-lobby

Player events:
- join_room: join by code + nickname, no login required
- submit_answer: send answer + time taken
- request_hint: costs points, sends hint to that player only

Server broadcasts:
- player_joined / player_left → updates lobby list
- question_start → sends question + timer duration
- answer_result → tells each player if their answer was correct
- leaderboard_update → live rankings after each question
- game_ended → final scores

PART B — Game Mode Logic (src/lib/game/modes/)
Build scoring + rules for all 10 game modes:
1. Classic        — standard points for correct answer, bonus for speed
2. Team Battle    — players split into teams, team score shown
3. Tower Defense  — correct answers build tower, wrong answers damage it
4. Battle Royale  — wrong answer = eliminated, last one standing wins
5. Racing         — correct answers move player's racer forward
6. Speed Mode     — 5 seconds per question, double points
7. Economy        — earn coins, spend on power-ups between questions
8. Survival       — 3 lives, lose one per wrong answer
9. Relay Race     — each player answers one question in sequence
10. Blind Mode    — can't see other scores until game ends

PART C — Live Game Components (src/components/game/)
- GameLobby.tsx      — teacher sees joining players, start button, QR code
- JoinScreen.tsx     — student enters room code + nickname
- QuestionDisplay.tsx — shows question + options, countdown timer
- AnswerFeedback.tsx — animated correct/wrong + points earned
- LiveLeaderboard.tsx — real-time rankings with animations
- GameModeSelector.tsx — teacher picks game mode in lobby
- TeacherControls.tsx — pause, skip, kick, end game panel
- FinalResults.tsx   — podium, full rankings, share results
- QRCodeDisplay.tsx  — QR code that auto-joins students

PART D — Tournament System (src/components/game/tournament/)
- TournamentBracket.tsx — single elimination bracket UI
- CrossClassroom.tsx    — create tournament across multiple class rooms
- TournamentLobby.tsx   — waiting room for tournament

PART E — Pages
- src/app/[locale]/game/[code]/page.tsx  — student game screen
- src/app/[locale]/host/[id]/page.tsx   — teacher host screen
- src/app/[locale]/join/page.tsx        — simple code entry page

PART F — Session Results (src/app/api/sessions/)
- POST /api/sessions — create session
- GET /api/sessions/[id] — get session with all player results
- GET /api/sessions/[id]/export — download results as CSV

PART G — Translations
Add live game strings to en.json and ur.json:
- Lobby: "Waiting for players...", "Game starts in {n}..."
- Game: "Question {n} of {total}", "Time's up!", "Correct! +{points}"
- Results: "You ranked #{rank} out of {total} players"
- Game mode names and descriptions

PART H — Tests
- Unit tests: all 10 game mode scoring functions
- Unit tests: room code generation, player join/leave logic
- E2E: full game session (teacher creates, 3 students join, play quiz, see results)
- E2E: student joins via mobile at 375px
- Load test comment: note that Socket.io should handle 200 concurrent players per room

Quality gates before finishing:
- npm run type-check → zero errors
- npm test → all pass, coverage ≥ 85%
- npm run build → no errors
- Verify lobby works in Urdu (RTL)
- Verify leaderboard animations work in kids theme

End with: "Phase 3 complete. Files: N. Run npm test to verify."


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 PROMPT — AI Layer (Claude API)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are building Phase 4 of the EduPlay platform as defined in AGENT.md.
Phases 1, 2, and 3 are complete. Do not rewrite anything from previous phases.

Build the complete AI Layer. Here is exactly what to create:

IMPORTANT COST RULES:
- Free tier users: claude-haiku-4-5, max 10 generations/day
- Premium users: claude-sonnet-4-6, unlimited
- Always use prompt caching (cache_control: ephemeral) on system prompts
- Always validate and sanitize AI output before saving to DB
- Never expose ANTHROPIC_API_KEY to the client — all calls go through API routes

PART A — Claude API Service (src/lib/ai/claude.ts)
Build a typed wrapper around the Anthropic API:
- generateActivity(topic, type, count, locale, grade) → ActivityItem[]
- generateQuestions(topic, count, difficulty, locale) → QuizQuestion[]
- generateHints(items, locale) → string[]
- generateLessonRecap(sessionId, results, locale) → string
- generateParentReport(studentId, weekResults, locale) → string
- moderateContent(text) → { safe: boolean, reason?: string }
Include: retry logic (3 attempts), timeout (30s), cost tracking, error handling

PART B — API Routes (src/app/api/ai/)
- POST /api/ai/generate-activity
  Body: { topic, activityType, itemCount, locale, grade, curriculum }
  Auth: required, checks daily limit
  Returns: { items: ActivityItem[], tokensUsed: number }

- POST /api/ai/generate-questions
  Body: { topic, count, difficulty, locale }
  Returns: { questions: QuizQuestion[] }

- POST /api/ai/lesson-recap
  Body: { sessionId }
  Returns: { recap: string }

- GET /api/ai/usage
  Returns: { todayCount, dailyLimit, isPremium }

PART C — AI Generator UI (src/components/ai/)
- AIGeneratorPanel.tsx
  A panel that slides in from the right on the Create page.
  Contains: topic input, activity type selector, item count slider,
  language selector, grade selector, generate button.
  Shows: loading state with streaming text preview, usage counter
  ("3 of 10 free generations used today"), upgrade prompt when limit reached.

- AIResultPreview.tsx
  Shows generated items before adding to creator.
  Each item: prompt + answer + edit inline + delete + regenerate single item.
  "Add all to activity" button.

- UsageIndicator.tsx
  Small badge shown in Navbar: "AI: 3/10 today" for free users.
  "Unlimited" for premium users.

PART D — Prompts (src/lib/ai/prompts.ts)
Write the exact system prompts and user prompt templates for each generation type.
Prompts must:
- Be in the target locale (Urdu prompts generate Urdu content, etc.)
- Specify output as JSON only (no markdown, no preamble)
- Include curriculum context when available
- Be safe for children (no violence, no inappropriate content)
- Include the JSON schema the AI must follow

PART E — Adaptive Difficulty (src/lib/ai/adaptive.ts)
Logic that analyzes a student's last 10 answers and:
- Calculates accuracy rate, average time per question, weak topics
- Returns: { recommendedDifficulty, weakTopics, suggestedActivities }
This is used to personalize the home feed for logged-in students.

PART F — Pages
Update src/app/[locale]/create/page.tsx to include the AI Generator Panel.
Add a toggle: "Create manually" ↔ "Generate with AI"

PART G — Translations
Add to en.json and ur.json:
- "Generate with AI"
- "What topic do you want to teach?"
- "Generating your activity..." 
- "You've used {n} of {limit} free AI generations today"
- "Upgrade to Premium for unlimited AI generations"
- "AI-generated content may need review before publishing"

PART H — Tests
- Unit tests: claude.ts wrapper (mock Anthropic API)
- Unit tests: daily limit logic, cost tracking
- Unit tests: content moderation logic
- Unit tests: adaptive difficulty calculation
- E2E: generate quiz from topic "multiplication tables grade 3"
- E2E: verify daily limit is enforced after 10 generations
- E2E: verify generated content appears in creator

Quality gates before finishing:
- npm run type-check → zero errors
- npm test → all pass, coverage ≥ 85%
- npm run build → no errors
- Verify AI generation works in Urdu (prompts and output in Urdu)
- Verify ANTHROPIC_API_KEY never appears in client-side code

End with: "Phase 4 complete. Files: N. Run npm test to verify."


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 PROMPT — Programmatic SEO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are building Phase 5 of the EduPlay platform as defined in AGENT.md.
Phases 1–4 are complete. Do not rewrite anything from previous phases.

Build the complete Programmatic SEO system. Here is exactly what to create:

SEO RULES (critical — read before writing a single file):
- Every page needs: title, description, keywords, canonical URL, hreflang for all 11 locales
- Use Next.js generateMetadata() for all metadata — never hardcode in JSX
- Use generateStaticParams() for T1-T3, T5-T6 templates
- Use ISR (revalidate: 86400 = 24 hours) for T4, T7 templates
- Schema.org EducationalActivity JSON-LD on every activity page
- Never create thin pages — every template must show real content or activities
- URL slugs must be in the target language (Arabic URLs in Arabic, Urdu in Urdu)

PART A — SEO Utility Library (src/lib/seo/)
- metadata.ts — generatePageMetadata(params) → Metadata
  Handles all 8 template types, all 11 locales
  Returns correct title, description, keywords, canonical, hreflang, og:image
- schema.ts — generateActivitySchema(activity) → JSON-LD object
- sitemap.ts — generates XML sitemap entries for all template types
- keywords.ts — keyword maps per language per subject
  (e.g., Urdu: "ریاضی کوئز", "حساب کے سوالات", "پانچویں جماعت ریاضی")

PART B — T1 Template: Activity Type Hub
src/app/[locale]/activities/[type]/page.tsx
- generateStaticParams: all 20 types × 11 locales
- Shows: hero with activity type description, featured activities of that type,
  subject filter, grade filter, total count
- SEO title: "Free {type} maker for teachers | EduPlay"

PART C — T2 Template: Subject + Type
src/app/[locale]/[subject]/[type]/page.tsx
- generateStaticParams: 30 subjects × 20 types × 11 locales
- Shows: breadcrumb, subject banner, list of activities, related topics,
  "Create your own {type} for {subject}" CTA
- SEO title: "{Subject} {type} activities for teachers — EduPlay"

PART D — T3 Template: Subject + Grade + Type
src/app/[locale]/[subject]/[grade]/[type]/page.tsx
- generateStaticParams: 30 subjects × 12 grades × 20 types × 11 locales
- Shows: curriculum badge, grade band, activities list, related grade pages
- SEO title: "Grade {grade} {subject} {type} — free for teachers | EduPlay"
- This is the highest-value SEO page — long-tail, low competition

PART E — T4 Template: Individual Activity (already partially built in Phase 2)
Update src/app/[locale]/activity/[id]/page.tsx to add:
- Full Schema.org JSON-LD
- Social share preview (og:image generated from activity title + type)
- "More like this" section (same subject + type)
- Teacher attribution with link to T7 profile
- ISR: revalidate every 24 hours

PART F — T5 Template: Topic Pages
src/app/[locale]/topics/[topic]/page.tsx
- generateStaticParams: 500 topics × 11 locales (from DB)
- Shows: topic description, all activity types available for this topic,
  popular activities, related topics grid
- SEO title: "{Topic} activities and games for teachers — EduPlay"

PART G — T6 Template: Curriculum Pages
src/app/[locale]/curriculum/[board]/[grade]/page.tsx
- generateStaticParams: from curricula table in DB
- Pakistan boards: Punjab Board, Sindh Board, KPK Board, Federal Board, Cambridge
- Shows: all subjects for this curriculum+grade, activities aligned to curriculum
- SEO title: "{Board} Grade {grade} interactive activities — EduPlay"
- This is a unique feature no competitor has

PART H — T7 Template: Teacher Profile
src/app/[locale]/teacher/[username]/page.tsx
- ISR: revalidate: 3600 (1 hour)
- Shows: teacher bio, country, total activities, total plays, list of public activities
- Schema.org Person + ProfilePage structured data
- SEO title: "{Teacher name}'s free teaching activities — EduPlay"

PART I — T8 Template: Competitor Alternatives
src/app/en/alternatives/[competitor]/page.tsx (English only)
- Static pages for: wordwall, kahoot, quizlet, blooket, gimkit, quizizz,
  nearpod, baamboozle, liveworksheets, padlet, and 40 more
- Shows: comparison table, EduPlay advantages, featured activities
- SEO title: "Best free {Competitor} alternative for teachers — EduPlay"
- HIGH INTENT: these visitors are actively looking to switch

PART J — Sitemap + Robots
src/app/sitemap.ts — generates all sitemap entries
src/app/robots.ts — proper robots.txt
Add sitemap index for large sites (split into language sitemaps)

PART K — Structured Data Components
src/components/seo/JsonLd.tsx — injects JSON-LD scripts
src/components/seo/Breadcrumb.tsx — breadcrumb nav + schema
src/components/seo/HreflangTags.tsx — language alternates

PART L — Database Seed Data
src/lib/supabase/seed/
- subjects.ts — 30 subjects with slugs + names in all 11 languages
- grades.ts — grades 1-12 + KG, Pre-K with labels per locale
- activity-types.ts — all 20 types with descriptions per locale
- topics.ts — 500 topic seeds (maths: multiplication, fractions, decimals...)
- curricula.ts — Pakistan boards + Saudi curriculum + Indian CBSE + Cambridge

PART M — Tests
- Unit tests: generatePageMetadata for all 8 template types
- Unit tests: sitemap generation (correct URL count)
- Unit tests: schema.org output validation
- E2E: T3 page loads with correct meta tags for Urdu
- E2E: T6 Punjab Board Grade 5 page shows correct activities
- E2E: hreflang tags present on all template pages
- Check: no duplicate canonical URLs across templates

Quality gates before finishing:
- npm run type-check → zero errors
- npm test → all pass, coverage ≥ 85%
- npm run build → no errors (all static params generate without error)
- Verify T3 pages have unique titles (not duplicate content)
- Verify Urdu slugs are in Urdu script (not romanised)
- Verify JSON-LD is valid on activity pages

End with: "Phase 5 complete. Files: N. Run npm test to verify."


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 6 PROMPT — Analytics, Monetisation & Country Configs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are building Phase 6 of the EduPlay platform as defined in AGENT.md.
Phases 1–5 are complete. Do not rewrite anything from previous phases.

Build the complete Analytics, Monetisation, and Country Config system.

PART A — Teacher Analytics Dashboard (src/components/dashboard/)
- DashboardLayout.tsx — sidebar + header for teacher dashboard
- StatsOverview.tsx — cards: total activities, total plays, students this week, trending activity
- ActivityAnalytics.tsx — per-activity: plays over time chart, completion rate, avg score
- StudentMastery.tsx — heatmap: student × topic, green = mastered, red = struggling
- WrongAnswerClusters.tsx — shows which questions students get wrong most
- WeeklyReport.tsx — auto-generated summary of the week's activity
- ExportGradebook.tsx — export to CSV or PDF

PART B — Student Dashboard (src/components/dashboard/student/)
- StudentProgress.tsx — XP bar, badges earned, streak counter
- MyActivities.tsx — assigned activities + completion status
- Portfolio.tsx — full year academic journey, scores over time
- Achievements.tsx — badge system: "Quiz Master", "7-day Streak", "Top of Class"

PART C — Monetisation — Freemium Tiers
Define in src/lib/stripe/tiers.ts:

FREE tier (default, Pakistan-focused):
- Unlimited activity creation
- Max 30 students per live session
- 10 AI generations per day (Haiku)
- 5 public activities
- Basic analytics (7 days)
- Branded with EduPlay watermark

PRO tier ($5/month or local equivalent):
- Unlimited students per session
- Unlimited AI generations (Sonnet)
- Unlimited public activities
- Full analytics (1 year)
- No watermark
- Print export without branding
- Priority support

SCHOOL tier ($29/month per school):
- Everything in Pro
- Up to 50 teacher accounts
- School branding / custom colours
- Admin dashboard
- Google Classroom + LMS integration
- Dedicated support

PART D — Stripe Integration (src/lib/stripe/)
- stripe.ts — Stripe client
- src/app/api/stripe/checkout/route.ts — create checkout session
- src/app/api/stripe/webhook/route.ts — handle subscription events
- src/app/api/stripe/portal/route.ts — customer portal

PART E — Teacher Marketplace (src/components/marketplace/)
- MarketplaceHome.tsx — browse paid activities from other teachers
- ActivityListing.tsx — teacher lists activity for sale (set price $1-$10)
- PurchaseFlow.tsx — buy individual activity
- CreatorEarnings.tsx — teacher sees their earnings, payout settings
Revenue split: 70% teacher / 30% EduPlay

PART F — LMS Integrations (src/lib/integrations/)
- google-classroom.ts — post activity as assignment, sync grades back
- microsoft-teams.ts — share activity link via Teams
- src/app/api/integrations/google-classroom/route.ts
- src/app/api/integrations/lms-export/route.ts — export in LTI format

PART G — Country Configuration System (src/lib/countries/)
- config.ts — per-country settings:
  ```ts
  PK: { currency: 'PKR', defaultLocale: 'ur', boards: ['Punjab','Sindh','KPK','Federal','Cambridge'], freeTierPriceUSD: 0 }
  SA: { currency: 'SAR', defaultLocale: 'ar', boards: ['MOE Saudi'], freeTierPriceUSD: 0 }
  AE: { currency: 'AED', defaultLocale: 'ar', boards: ['MOE UAE','Cambridge'], freeTierPriceUSD: 0 }
  IN: { currency: 'INR', defaultLocale: 'hi', boards: ['CBSE','ICSE','State'], freeTierPriceUSD: 0 }
  BR: { currency: 'BRL', defaultLocale: 'pt', boards: ['BNCC'], freeTierPriceUSD: 0 }
  ```
- country-deploy.ts — generates .env.local for each country deployment
- Each country is a separate Vercel deployment using the same codebase

PART H — PWA / Offline Mode
- public/manifest.json — PWA manifest
- src/app/service-worker.ts — caches last 20 activities for offline play
- OfflineBanner.tsx — shows when internet is lost, lists cached activities
- InstallPrompt.tsx — "Add EduPlay to home screen" prompt for mobile

PART I — Performance Optimisation
- Add next/image for all activity thumbnails and teacher avatars
- Add React.lazy + Suspense for heavy components (CrosswordActivity, etc.)
- Verify Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- Add Redis caching for T2/T3 pages (comment: use Upstash Redis on Vercel)

PART J — Remaining Language Files
Add translation files for all remaining 9 languages:
messages/ar.json, messages/hi.json, messages/es.json, messages/fr.json,
messages/bn.json, messages/pt.json, messages/ru.json, messages/id.json, messages/zh.json
Each must have all keys from en.json translated correctly.

PART K — Final Merge Preparation
Create MERGE_INSTRUCTIONS.md at project root:
- Exact steps to merge all 6 phase ZIPs into one project
- How to run npm install after merge
- How to set up .env.local
- How to run the test suite
- How to deploy to Vercel

PART L — Tests
- Unit tests: tier permission checks (free vs pro vs school)
- Unit tests: country config lookup
- Unit tests: Stripe webhook handlers
- E2E: upgrade flow (free → pro, Stripe test mode)
- E2E: teacher marketplace (list → buy → access)
- E2E: PWA install prompt appears on mobile
- E2E: offline mode shows cached activities

Quality gates before finishing:
- npm run type-check → zero errors
- npm test → all pass, coverage ≥ 85%
- npm run build → production build succeeds, no errors
- Verify all 11 language files have same key count as en.json
- Verify Stripe webhook verifies signatures (no replay attacks)
- Lighthouse score ≥ 90 on performance, accessibility, SEO, best practices

End with: "Phase 6 complete. ALL PHASES DONE. Files: N. Platform ready for merger."


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MERGE PROMPT — For Claude Code in VS Code (use at the very end)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I have 6 ZIP files representing the 6 phases of the EduPlay platform,
a Next.js 14 + TypeScript multilingual edtech platform.

The files are:
- eduplay-phase1.zip  → Foundation: themes, onboarding, i18n, types (BUILT FIRST)
- eduplay-phase2.zip  → Activity engine: 20 activity types, creator wizard
- eduplay-phase3.zip  → Live game engine: Socket.io, 10 game modes
- eduplay-phase4.zip  → AI layer: Claude API integration, activity generator
- eduplay-phase5.zip  → Programmatic SEO: 8 template types, sitemaps
- eduplay-phase6.zip  → Analytics, monetisation, Stripe, country configs

Please do the following in order:

1. Unzip all 6 files into a single project folder called 'eduplay'
2. For any file conflicts, Phase 1 takes lowest priority — later phases override
   EXCEPTION: src/types/index.ts and src/styles/globals.css from Phase 1
   are foundational — merge additions from later phases, never replace entirely
3. Run: npm install
4. Run: npm run type-check — fix ALL TypeScript errors before continuing
5. Run: npm test — fix any failing unit tests
6. Run: npm run build — fix any build errors
7. Run: npm run test:e2e — fix any failing E2E tests
8. Confirm: final file count, test results, build output

The merged project must:
- Build successfully with zero TypeScript errors
- Pass all unit tests with ≥ 85% coverage
- Pass all E2E tests on Chrome and Mobile viewports
- Work correctly in Urdu (RTL layout)
- Work in all 3 audience themes (ladies, gents, kids)

After merging, show me:
- Total file count
- Test results summary
- Any issues found and how you fixed them
- The command to deploy to Vercel
