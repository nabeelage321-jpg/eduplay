import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { isActivityOwner } from '@/lib/activity-audience'

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
    // SECURITY BATCH (pre-domain-launch): server-side ownership
    // enforcement. The host button was already ownership-gated in the
    // UI (GET /api/my-activities membership check in HostLiveGame),
    // but this route accepted ANY activityId — a crafted POST could
    // host someone else's game. Now only the signed-in owner of the
    // game may create a session for it: unauthenticated callers and
    // foreign activityIds both get a plain 403, and a missing game
    // gets the same 404 as elsewhere. The check is the same
    // ownership semantics as the my-activities list (teacher_id =
    // session user), done as one direct query instead of the list —
    // so, unlike the list, it is not affected by that list's 50-game
    // cap. A row with no teacher_id (all programme games) has no
    // owner and is therefore never hostable here; no legitimate flow
    // breaks, because the host UI only ever offers the teacher's own
    // games. The guest join-by-room-code flow is untouched: guests
    // never create sessions, they only look sessions up by code
    // through GET, which this batch does not change.
    let sessionUserId: string | null = null
    try {
      const sessionUser = await resolveSessionUser()
      sessionUserId = sessionUser?.userId ?? null
    } catch {
      sessionUserId = null
    }
    const ownerError = NextResponse.json(
      { error: 'Only the game\'s owner can host a live session. Sign in as the game\'s owner and try again.' },
      { status: 403 },
    )
    if (!sessionUserId) {
      return ownerError
    }
    const supabase = createServerClient()
    const { data: game, error: gameError } = await supabase
      .from('activities')
      .select('teacher_id')
      .eq('id', activityId)
      .single()
    if (gameError || !game) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }
    if (!isActivityOwner((game as { teacher_id?: string | null }).teacher_id, sessionUserId)) {
      return ownerError
    }
    // LIVE RECORDS 2026-11-08: link the room to the hosting teacher
    // so their Dashboard can list past rooms afterwards. The
    // teacher_id column comes from migration 013 — until the owner
    // runs it, the insert errors on the unknown column and we retry
    // without it, so hosting never breaks on the migration.
    const insertRow: Record<string, unknown> = {
      activity_id: activityId,
      teacher_name: teacherName,
      mode,
      room_code: roomCode(),
      status: 'waiting',
      teacher_id: sessionUserId,
    }
    let { data, error } = await supabase
      .from('live_sessions')
      .insert([insertRow])
      .select()
      .single()
    if (error && /teacher_id/i.test(error.message ?? '')) {
      const legacyRow = { ...insertRow }
      delete legacyRow.teacher_id
      ;({ data, error } = await supabase.from('live_sessions').insert([legacyRow]).select().single())
    }
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
