import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Batch 3 — GET /api/live-sessions/[id]
 * Polling endpoint for the live lobby/leaderboard: returns the session
 * plus its players ordered by score desc. The client polls this every
 * 3 seconds (see useLiveSessionPolling); this is the interim live
 * flow, not a socket.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createServerClient()
    const { data: session, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', params.id)
      .single()
    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    const { data: players, error: playersError } = await supabase
      .from('live_players')
      .select('*')
      .eq('session_id', params.id)
      .order('score', { ascending: false })
    if (playersError) {
      return NextResponse.json({ error: 'Live players table is not available', detail: playersError.message }, { status: 503 })
    }
    return NextResponse.json({ session, players: players ?? [] })
  } catch (err) {
    console.error('[live-sessions detail]', err)
    return NextResponse.json({ error: 'Failed to fetch live session' }, { status: 500 })
  }
}
