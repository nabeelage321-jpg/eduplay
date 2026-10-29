import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Batch 3 — INTERIM live multiplayer (polling, not a socket).
 *
 * POST /api/live-sessions — teacher creates a session.
 *   Body: { activityId: string, teacherName?: string, mode?: string }
 *   Returns: { sessionId, roomCode, status: 'waiting' }
 *
 * GET /api/live-sessions?roomCode=XXXXXX — look a session up by code.
 *   Returns the session plus its players, ordered by score desc.
 *
 * Requires the live_sessions / live_players tables from
 * supabase/migrations/003_create_live_sessions.sql. If those tables
 * are not migrated (or Supabase is not configured), this returns a
 * clear 503 — never fake session data. Scores are client-reported in
 * this interim (same trust model as the existing /api/leaderboard);
 * server-side answer validation is a future batch.
 */
function roomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function dbError(message: string) {
  return NextResponse.json(
    {
      error: 'Live sessions are not available yet',
      detail: message,
      setup: 'Run supabase/migrations/003_create_live_sessions.sql in Supabase, then set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    },
    { status: 503 },
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const activityId = String(body.activityId ?? '').trim()
    const teacherName = String(body.teacherName ?? 'Teacher').trim().slice(0, 50) || 'Teacher'
    const mode = String(body.mode ?? 'classic').trim().slice(0, 30) || 'classic'
    if (!activityId) {
      return NextResponse.json({ error: 'activityId is required' }, { status: 400 })
    }
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('live_sessions')
      .insert([{ activity_id: activityId, teacher_name: teacherName, mode, room_code: roomCode(), status: 'waiting' }])
      .select()
      .single()
    if (error || !data) return dbError(error?.message ?? 'insert failed')
    return NextResponse.json(
      { sessionId: data.id, roomCode: data.room_code, status: data.status, activityId: data.activity_id },
      { status: 201 },
    )
  } catch (err) {
    console.error('[live-sessions POST]', err)
    return dbError(err instanceof Error ? err.message : 'unknown error')
  }
}

export async function GET(request: NextRequest) {
  try {
    const code = (request.nextUrl.searchParams.get('roomCode') ?? '').trim().toUpperCase()
    if (!code) {
      return NextResponse.json({ error: 'roomCode query parameter is required' }, { status: 400 })
    }
    const supabase = createServerClient()
    const { data: session, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('room_code', code)
      .single()
    if (error || !session) {
      return NextResponse.json({ error: 'Session not found for this room code' }, { status: 404 })
    }
    const { data: players, error: playersError } = await supabase
      .from('live_players')
      .select('*')
      .eq('session_id', session.id)
      .order('score', { ascending: false })
    if (playersError) return dbError(playersError.message)
    return NextResponse.json({ session, players: players ?? [] })
  } catch (err) {
    console.error('[live-sessions GET]', err)
    return dbError(err instanceof Error ? err.message : 'unknown error')
  }
}
