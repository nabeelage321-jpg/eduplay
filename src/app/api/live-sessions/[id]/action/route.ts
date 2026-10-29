import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Batch 3 — POST /api/live-sessions/[id]/action
 * Body: { action: 'start' | 'end' | 'score',
 *         playerId?: string, score?: number, correctAnswers?: number }
 *
 * - start: teacher moves a waiting session to active.
 * - end: teacher moves a session to ended.
 * - score: a player reports their current score (client-reported in
 *   this interim, exactly like the existing /api/leaderboard — the
 *   server stores the highest reported score, it never decreases).
 *   Score updates are rejected once the session has ended.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = String(body.action ?? '')
    const supabase = createServerClient()

    if (action === 'start' || action === 'end') {
      const status = action === 'start' ? 'active' : 'ended'
      const { data, error } = await supabase
        .from('live_sessions')
        .update({ status })
        .eq('id', params.id)
        .select()
        .single()
      if (error || !data) {
        return NextResponse.json({ error: 'Could not update session', detail: error?.message }, { status: 503 })
      }
      return NextResponse.json({ sessionId: params.id, status: data.status })
    }

    if (action === 'score') {
      const playerId = String(body.playerId ?? '')
      const score = Number(body.score)
      const correctAnswers = Number(body.correctAnswers ?? 0)
      if (!playerId || !Number.isFinite(score) || score < 0) {
        return NextResponse.json({ error: 'playerId and a non-negative score are required' }, { status: 400 })
      }
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
      // Highest reported score wins — a stale/duplicate report never
      // lowers a player's score.
      const { data: current } = await supabase
        .from('live_players')
        .select('score, correct_answers')
        .eq('id', playerId)
        .eq('session_id', params.id)
        .single()
      if (!current) {
        return NextResponse.json({ error: 'Player not found in this session' }, { status: 404 })
      }
      const newScore = Math.max(current.score, Math.floor(score))
      const newCorrect = Math.max(current.correct_answers, Math.floor(correctAnswers))
      const { data, error } = await supabase
        .from('live_players')
        .update({ score: newScore, correct_answers: newCorrect })
        .eq('id', playerId)
        .eq('session_id', params.id)
        .select()
        .single()
      if (error || !data) {
        return NextResponse.json({ error: 'Could not update score', detail: error?.message }, { status: 503 })
      }
      return NextResponse.json({ playerId: data.id, score: data.score, correct_answers: data.correct_answers })
    }

    return NextResponse.json({ error: "action must be 'start', 'end' or 'score'" }, { status: 400 })
  } catch (err) {
    console.error('[live-sessions action]', err)
    return NextResponse.json({ error: 'Failed to update live session' }, { status: 500 })
  }
}
