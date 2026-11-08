import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { isActivityOwner } from '@/lib/activity-audience'

// GET /api/live-sessions/[id]/activity?playerId=<uuid>
//
// LIVE-JOIN FIX 2026-11-08: a student joins a live room with ONLY a
// room code + nickname (no account), then plays the hosted game from
// the room. When the hosted game is PRIVATE, the normal play path
// (GET /api/activities/[id]) refuses it to non-owners with a 404 —
// so the joiner saw "Activity Not Found" even though the teacher
// hosted that exact game for them. This endpoint is the ONLY
// session-scoped way to load it: it serves the session's activity
// only to (a) a joined player of this session — a live_players row
// whose id is the playerId the join call issued (a random UUID, so
// it cannot be guessed) — or (b) the signed-in owner of the activity.
// Everyone else gets the same 404 as a missing game, so nothing
// leaks: not the session, not the game, not even existence. Nothing
// about the general audience rule changes: GET /api/activities/[id]
// still refuses private games to non-owners, and private games still
// never appear in browse/search. The playerId is a read-only
// capability for this one session's game only — it grants no edit,
// no host, and no access to any other game.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const playerId = new URL(req.url).searchParams.get('playerId')?.trim() ?? ''
    const supabase = createServerClient()

    // (a) Joined player of this session? A malformed playerId is
    // treated as no player at all — no query, same 404 as below.
    let isPlayer = false
    if (playerId && UUID_RE.test(playerId)) {
      const { data: player } = await supabase
        .from('live_players')
        .select('id')
        .eq('id', playerId)
        .eq('session_id', params.id)
        .single()
      isPlayer = !!player
    }

    // The session row tells us which activity was hosted.
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('activity_id')
      .eq('id', params.id)
      .single()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', (session as { activity_id: string }).activity_id)
      .single()
    if (activityError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (isPlayer) {
      return NextResponse.json({ activity })
    }

    // (b) Signed-in owner of the activity? A public game serves to
    // anyone here too — zero new exposure, the general route already
    // serves public games to anyone.
    let sessionUserId: string | null = null
    try {
      const sessionUser = await resolveSessionUser()
      sessionUserId = sessionUser?.userId ?? null
    } catch {
      sessionUserId = null
    }
    const row = activity as { is_public?: boolean | null; teacher_id?: string | null }
    if (row.is_public === true || isActivityOwner(row.teacher_id, sessionUserId)) {
      return NextResponse.json({ activity })
    }
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  } catch (err) {
    console.error('[GET /api/live-sessions/[id]/activity]', err)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
