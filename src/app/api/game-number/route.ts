import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { cleanGameNumber, isGameNumberSetupError } from '@/lib/game-number'

// ─── Game-number lookup (batch 1, final list 11–14, 2026-11-07) ───────
// GET /api/game-number?number=123456 — the SPECIAL PLACE to enter a
// game number. Public games serve to anyone; a non-public game serves
// ONLY to its signed-in owner and answers the same 404 as a missing
// game to everyone else, so nothing leaks (not even existence). The
// response never exposes teacher_id — only isOwner, so the client
// knows whether to offer Edit (maker) or Remix (non-maker).
// Before migration 011 the column does not exist: the route answers
// { setupReady: false } and the page says plainly that game numbers
// are not set up yet — never a fake number, never a 500.

interface LookupRow {
  id: string
  title: string
  type: string | null
  subject: string | null
  grade: string | null
  is_public: boolean | null
  teacher_id: string | null
  game_number: number | null
}

export async function GET(req: NextRequest) {
  try {
    const number = cleanGameNumber(req.nextUrl.searchParams.get('number'))
    if (number === null) {
      return NextResponse.json(
        { error: 'Enter a game number (up to 6 digits).' },
        { status: 400 },
      )
    }
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('activities')
      .select('id, title, type, subject, grade, is_public, teacher_id, game_number')
      .eq('game_number', number)
      .single()
    if (error) {
      if (isGameNumberSetupError(error.message)) {
        return NextResponse.json({
          setupReady: false,
          error: 'Game numbers are not set up yet. The team is still setting this up.',
        })
      }
      // No game with that number: same plain 404 as a missing game.
      return NextResponse.json({ error: 'No game with that number yet.' }, { status: 404 })
    }
    const row = data as LookupRow
    let sessionUserId: string | null = null
    try {
      const sessionUser = await resolveSessionUser()
      sessionUserId = sessionUser?.userId ?? null
    } catch {
      sessionUserId = null
    }
    const isOwner = sessionUserId !== null && row.teacher_id !== null && row.teacher_id === sessionUserId
    if (row.is_public !== true && !isOwner) {
      return NextResponse.json({ error: 'No game with that number yet.' }, { status: 404 })
    }
    return NextResponse.json({
      setupReady: true,
      isOwner,
      activity: {
        id: row.id,
        title: row.title,
        type: row.type,
        subject: row.subject,
        grade: row.grade,
        game_number: row.game_number,
      },
    })
  } catch (err) {
    console.error('[GET /api/game-number]', err)
    return NextResponse.json({ error: 'Failed to look up the game number' }, { status: 500 })
  }
}
