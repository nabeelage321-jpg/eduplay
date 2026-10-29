import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Batch 3 — POST /api/live-sessions/[id]/join
 * Body: { nickname: string }. A student joins a waiting/active
 * session. Joining an ended session is rejected. Nicknames are
 * capped at 20 characters and trimmed; empty nicknames are rejected.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json().catch(() => ({}))
    const nickname = String(body.nickname ?? '').trim().slice(0, 20)
    if (!nickname) {
      return NextResponse.json({ error: 'nickname is required' }, { status: 400 })
    }
    const supabase = createServerClient()
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('id, status')
      .eq('id', params.id)
      .single()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (session.status === 'ended') {
      return NextResponse.json({ error: 'This session has ended' }, { status: 410 })
    }
    const { data: player, error } = await supabase
      .from('live_players')
      .insert([{ session_id: params.id, nickname, score: 0, correct_answers: 0 }])
      .select()
      .single()
    if (error || !player) {
      return NextResponse.json({ error: 'Could not join session', detail: error?.message }, { status: 503 })
    }
    return NextResponse.json({ playerId: player.id, nickname: player.nickname, sessionId: params.id }, { status: 201 })
  } catch (err) {
    console.error('[live-sessions join]', err)
    return NextResponse.json({ error: 'Failed to join session' }, { status: 500 })
  }
}
