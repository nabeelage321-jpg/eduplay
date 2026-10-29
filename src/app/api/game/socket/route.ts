// src/app/api/game/socket/route.ts
// Batch 3 — this endpoint is REMOVED, not fixed with a mock.
//
// It previously returned { ok: true, message: 'WebSocket endpoint
// ready' } while doing no websocket work at all. Returning that
// again would fake live multiplayer, so both methods now answer
// 410 Gone and point callers at the real interim flow:
//   POST /api/live-sessions        (teacher creates a session)
//   GET  /api/live-sessions?roomCode=XXXXXX
//   POST /api/live-sessions/[id]/join
//   POST /api/live-sessions/[id]/action
//   UI: /[locale]/live (polling leaderboard, 3-second refresh)

import { NextResponse } from 'next/server'

const GONE = {
  error: 'Socket endpoint removed',
  detail: 'The old /api/game/socket endpoint never ran a real websocket and has been removed. Use the /api/live-sessions polling flow instead (see /[locale]/live).',
  liveFlow: '/api/live-sessions',
}

export async function POST() {
  return NextResponse.json(GONE, { status: 410 })
}

export async function GET() {
  return NextResponse.json(GONE, { status: 410 })
}
