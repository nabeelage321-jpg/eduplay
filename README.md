# EduPlay — Multilingual Interactive Learning Platform

> Phase 1 complete. Built with Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Zustand, next-intl.

---

## Quick start

```bash
npm install
npm run dev
# → http://localhost:3000/en
```

---

## Project structure

```
src/
├── app/
│   └── [locale]/          # All pages are locale-scoped
│       ├── layout.tsx     # Root layout with theme initialiser
│       └── page.tsx       # Home — shows onboarding or homepage
├── components/
│   ├── onboarding/
│   │   └── OnboardingScreen.tsx   # Audience + kids theme picker
│   ├── layout/
│   │   ├── Navbar.tsx             # Theme-adaptive navigation
│   │   └── ThemeSwitcher.tsx      # In-app theme switcher dropdown
│   └── home/
│       └── HomePage.tsx           # Main landing page
├── lib/
│   ├── store/
│   │   └── theme-store.ts         # Zustand theme state (persisted)
│   └── i18n.ts                    # next-intl config
├── styles/
│   └── globals.css                # All 13 themes as CSS custom properties
├── types/
│   └── index.ts                   # All TypeScript types
└── tests/
    ├── theme-store.test.ts        # Vitest unit tests
    ├── onboarding.e2e.ts          # Playwright E2E tests
    └── setup.ts
messages/
├── en.json                        # English translations
└── ur.json                        # Urdu translations
```

---

## Theme system

The platform supports **13 visual themes** via CSS custom properties on `<html>`:

| Attribute | Values |
|-----------|--------|
| `data-theme` | `ladies` \| `gents` \| `kids` |
| `data-kids-theme` | `space` \| `ocean` \| `jungle` \| `princess` \| `superhero` \| `dinosaur` \| `candy` \| `farm` \| `robot` \| `magic` |

Switch themes anywhere:
```ts
import { useThemeStore } from '@/lib/store/theme-store'
const { setAudience, setKidsTheme } = useThemeStore()
setAudience('ladies')
setKidsTheme('magic') // only applies when audience === 'kids'
```

---

## Supported languages

| Code | Language   | Direction |
|------|------------|-----------|
| `en` | English    | LTR |
| `ur` | Urdu       | **RTL** |
| `ar` | Arabic     | **RTL** |
| `hi` | Hindi      | LTR |
| `es` | Spanish    | LTR |
| `fr` | French     | LTR |
| `bn` | Bengali    | LTR |
| `pt` | Portuguese | LTR |
| `ru` | Russian    | LTR |
| `id` | Indonesian | LTR |
| `zh` | Chinese    | LTR |

---

## Testing

```bash
# Unit tests
npm test

# Unit tests with coverage (must be ≥85%)
npm test -- --coverage

# E2E tests (requires dev server running)
npm run test:e2e

# Type check
npm run type-check
```

**Quality gates — no phase merges without:**
- [ ] Unit test coverage ≥ 85%
- [ ] All E2E tests pass on Chrome + Mobile
- [ ] TypeScript: zero errors
- [ ] Lighthouse ≥ 90 (performance, accessibility, SEO)
- [ ] RTL verified in Urdu + Arabic
- [ ] All 13 themes visually verified

---

## Phase roadmap

| Phase | What | Status |
|-------|------|--------|
| 1 | Foundation, theme system, onboarding, i18n | ✅ Complete |
| 2 | 20 activity types + creator wizard | ⏳ Next |
| 3 | Live game engine (Socket.io) | ⏳ Pending |
| 4 | AI layer (Claude API) | ⏳ Pending |
| 5 | Programmatic SEO (8 templates) | ⏳ Pending |
| 6 | Analytics, LMS, monetisation | ⏳ Pending |

---

## Using with Claude Code (VS Code)

1. Open this folder in VS Code
2. Open Claude Code panel (Cmd/Ctrl + Shift + P → "Claude Code")
3. For each feature, paste the spec from Claude chat
4. Claude Code will write, run tests, and iterate
5. Run `npm test` and `npm run type-check` before every commit
6. Never merge a branch until all quality gates pass

---

## Environment variables

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=your-key  # Phase 4 only — not needed yet
```
