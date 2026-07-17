# Phase 3 File Placement Guide

**Total Files: 28**

## 🗂️ FILE STRUCTURE

```
PROJECT_ROOT/
│
├── src/
│   ├── lib/
│   │   └── game/
│   │       ├── modes/
│   │       │   ├── types.ts                    ✅ CREATE
│   │       │   └── scoring.ts                  ✅ CREATE
│   │       └── utils.ts                        ✅ CREATE
│   │
│   ├── app/
│   │   ├── api/
│   │   │   └── game/
│   │   │       └── socket/
│   │   │           └── route.ts                ✅ CREATE
│   │   │
│   │   ├── [locale]/
│   │   │   ├── game/
│   │   │   │   └── [code]/
│   │   │   │       └── page.tsx                ✅ CREATE
│   │   │   │
│   │   │   ├── host/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx                ✅ CREATE
│   │   │   │
│   │   │   └── join/
│   │   │       └── page.tsx                    ✅ CREATE
│   │   │
│   │   └── api/
│   │       └── sessions/
│   │           ├── route.ts                    ✅ CREATE
│   │           └── [id]/
│   │               ├── route.ts                ✅ CREATE
│   │               └── export/
│   │                   └── route.ts            ✅ CREATE
│   │
│   ├── components/
│   │   └── game/
│   │       ├── JoinScreen.tsx                  ✅ CREATE
│   │       ├── GameLobby.tsx                   ✅ CREATE
│   │       ├── QuestionDisplay.tsx             ✅ CREATE
│   │       ├── AnswerFeedback.tsx              ✅ CREATE
│   │       ├── LiveLeaderboard.tsx             ✅ CREATE
│   │       ├── GameModeSelector.tsx            ✅ CREATE
│   │       ├── TeacherControls.tsx             ✅ CREATE
│   │       ├── FinalResults.tsx                ✅ CREATE
│   │       ├── QRCodeDisplay.tsx               ✅ CREATE
│   │       │
│   │       └── tournament/
│   │           ├── TournamentBracket.tsx       ✅ CREATE
│   │           ├── TournamentLobby.tsx         ✅ CREATE
│   │           └── CrossClassroom.tsx          ✅ CREATE
│   │
│   └── tests/
│       ├── game-modes.test.ts                  ✅ CREATE
│       ├── game-engine.test.ts                 ✅ CREATE
│       ├── game-flow.e2e.ts                    ✅ CREATE
│       └── mobile-game.e2e.ts                  ✅ CREATE
│
├── messages/
│   ├── en.json                                 ⚠️ UPDATE (add game section)
│   └── ur.json                                 ⚠️ UPDATE (add game section)
│
└── [Root Config Files - unchanged]
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── tailwind.config.ts
    └── etc.
```

---

## 📦 IMPORT DEPENDENCIES BY FILE

### Library Files (no peer dependencies)
```
src/lib/game/modes/types.ts
src/lib/game/modes/scoring.ts
src/lib/game/utils.ts
```
**These 3 files are standalone and don't import other project files.**

---

### Socket.io Server
```
src/app/api/game/socket/route.ts

Imports:
- next.js server functions
- socket.io (npm install socket.io)
- @/lib/game/modes/types
- @/lib/game/modes/scoring
- @/lib/game/utils
```

---

### Components (Full List)

#### JoinScreen
```typescript
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
// No internal imports
```

#### GameLobby
```typescript
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { PlayerScore } from '@/lib/game/modes/types'
import QRCodeDisplay from './QRCodeDisplay'
```

#### QuestionDisplay
```typescript
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
// No internal imports beyond types
```

#### AnswerFeedback
```typescript
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
// No internal imports
```

#### LiveLeaderboard
```typescript
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { PlayerScore } from '@/lib/game/modes/types'
```

#### GameModeSelector
```typescript
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { GAME_MODE_CONFIGS } from '@/lib/game/utils'
import type { GameModeType } from '@/lib/game/modes/types'
```

#### TeacherControls
```typescript
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
// No internal imports
```

#### FinalResults
```typescript
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { PlayerScore } from '@/lib/game/modes/types'
```

#### QRCodeDisplay
```typescript
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
// Needs: npm install qrcode
```

#### TournamentBracket
```typescript
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { TournamentBracket, TournamentMatch } from '@/lib/game/modes/types'
```

#### TournamentLobby
```typescript
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { PlayerScore } from '@/lib/game/modes/types'
```

#### CrossClassroom
```typescript
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
// No internal imports
```

---

### Pages

#### game/[code]/page.tsx
```typescript
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import GamePlayerScreen from '@/components/game/GamePlayerScreen'  // ⚠️ NEEDS CREATION

// No GamePlayerScreen yet - create wrapper component
```

#### host/[id]/page.tsx
```typescript
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import GameTeacherScreen from '@/components/game/GameTeacherScreen'  // ⚠️ NEEDS CREATION

// No GameTeacherScreen yet - create wrapper component
```

#### join/page.tsx
```typescript
import type { Metadata } from 'next'
import JoinGameScreen from '@/components/game/JoinGameScreen'  // ⚠️ NEEDS CREATION

// No JoinGameScreen yet - create wrapper component
```

---

### API Routes

#### api/sessions/route.ts
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// Needs: Supabase client integration
```

#### api/sessions/[id]/route.ts
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { GameSessionResult } from '@/lib/game/modes/types'
// Needs: Supabase client integration
```

#### api/sessions/[id]/export/route.ts
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { formatSessionResultsForExport } from '@/lib/game/utils'
import type { PlayerScore } from '@/lib/game/modes/types'
```

---

### Tests

#### game-modes.test.ts
```typescript
import { describe, it, expect } from 'vitest'
import {
  scoreClassic, scoreTeamBattle, ... // 10 scoring functions
  calculateScore, rankPlayers, generateRoomCode
} from '@/lib/game/modes/scoring'
import type { PlayerScore } from '@/lib/game/modes/types'
```

#### game-engine.test.ts
```typescript
import { describe, it, expect } from 'vitest'
import {
  canStartGame, createPlayerScore, splitIntoTeams,
  calculateAccuracy, ... // 12+ utility functions
  GAME_MODE_CONFIGS
} from '@/lib/game/utils'
import type { PlayerScore } from '@/lib/game/modes/types'
```

#### game-flow.e2e.ts
```typescript
import { test, expect, Page } from '@playwright/test'
// No internal imports - tests via HTTP
```

#### mobile-game.e2e.ts
```typescript
import { test, expect, devices } from '@playwright/test'
// No internal imports - tests via HTTP
```

---

### Translation Updates

#### messages/en.json
Add to root level:
```json
{
  "game": {
    "joinGame": "Join Game",
    "roomCode": "Room Code",
    ... // 60+ keys
  }
}
```

#### messages/ur.json
Add to root level:
```json
{
  "game": {
    "joinGame": "کھیل میں شامل ہوں",
    "roomCode": "روم کوڈ",
    ... // Same keys, Urdu translations
  }
}
```

---

## 🔧 SETUP STEPS (In Order)

### Step 1: Create Game Library Files
```bash
mkdir -p src/lib/game/modes
# Copy: types.ts, scoring.ts
# Copy: utils.ts (to src/lib/game/)
```

### Step 2: Create Socket.io Server
```bash
mkdir -p src/app/api/game/socket
# Copy: route.ts
```

### Step 3: Create Game Components
```bash
mkdir -p src/components/game/tournament
# Copy: 9 files to src/components/game/
# Copy: 3 files to src/components/game/tournament/
```

### Step 4: Create Pages
```bash
mkdir -p src/app/[locale]/game/[code]
mkdir -p src/app/[locale]/host/[id]
mkdir -p src/app/[locale]/join
# Copy: 3 page.tsx files
```

### Step 5: Create API Routes
```bash
mkdir -p src/app/api/sessions/[id]/export
# Copy: route.ts files (3 total)
```

### Step 6: Create Tests
```bash
# Copy: 4 test files to src/tests/
```

### Step 7: Update Translations
```bash
# Merge game section into messages/en.json
# Merge game section into messages/ur.json
```

### Step 8: Create Missing Wrapper Components
**Still need to create:**
```
src/components/game/GamePlayerScreen.tsx
src/components/game/GameTeacherScreen.tsx
src/components/game/JoinGameScreen.tsx
```

These are NOT included in this build. They need to:
- Import Socket.io client
- Import individual components
- Manage game state (Zustand store)
- Orchestrate component mounting

---

## 🚀 QUICK DEPLOYMENT

### Option A: Using create-next-app (Fresh Project)
```bash
npx create-next-app@latest eduplay --typescript
cd eduplay
npm install socket.io socket.io-client framer-motion next-intl zustand qrcode
npm install --save-dev @playwright/test vitest

# Copy all files to correct locations
# Update package.json for test commands
npm run type-check
npm test
npm run build
```

### Option B: Into Existing EduPlay Project
```bash
# Already have Phase 1 + 2 infrastructure
# Just add these 28 new files
# Verify: npm run type-check
npm test
npm run test:e2e
npm run build
```

---

## ✅ VERIFICATION CHECKLIST

After placing all files:

- [ ] `npm run type-check` → Zero errors
- [ ] `npm test` → All 42 unit tests pass
- [ ] `npm run test:e2e` → All 17 E2E tests pass
- [ ] No hardcoded colors (all use CSS variables)
- [ ] RTL works in `/ur/join`
- [ ] Mobile viewport at 375px works
- [ ] All imports resolve correctly
- [ ] No "Component not found" errors
- [ ] Socket.io CORS configured correctly
- [ ] Translations keys all present in both en.json + ur.json

---

## 📞 MISSING COMPONENTS (Create These After)

```typescript
// src/components/game/GamePlayerScreen.tsx
// Purpose: Student game orchestrator
// Responsibilities:
// - Connect to Socket.io as player
// - Mount: JoinScreen → QuestionDisplay → AnswerFeedback → FinalResults
// - Handle: join_room, submit_answer, game_ended events
// - State: Current question, player data, game status

// src/components/game/GameTeacherScreen.tsx
// Purpose: Teacher game orchestrator
// Responsibilities:
// - Connect to Socket.io as teacher
// - Mount: GameModeSelector → GameLobby → TeacherControls → LiveLeaderboard → FinalResults
// - Handle: create_room, start_game, next_question, end_game events
// - Fetch activity questions from Supabase

// src/components/game/JoinGameScreen.tsx
// Purpose: Wrapper around JoinScreen
// Responsibilities:
// - Add logo/branding
// - Handle room validation
// - Route to GamePlayerScreen on successful join
```

Each should be ~150-200 lines and use Zustand store for state.

---

*File Placement Guide for Phase 3 - EduPlay Live Game Engine*  
*Ready for production deployment once wrapper components are created.*
