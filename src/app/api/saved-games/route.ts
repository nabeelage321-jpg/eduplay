import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { cleanGameNumber, isGameNumberSetupError } from '@/lib/game-number'

// ─── Saved game numbers (batch 1, final list 11–14, 2026-11-07) ───────
// GET    /api/saved-games — the signed-in user's saved numbers, with
//        each game's title/type so the Dashboard can list them.
// POST   /api/saved-games { gameNumber } — save a number. The game
//        must exist and be public or the caller's own; a repeat save
//        answers alreadySaved, not an error.
// DELETE /api/saved-games { gameNumber } — remove a saved number.
// Signed-out callers get 401. Before migration 011 the table does
// not exist: GET answers an empty list with setupReady:false, POST
// and DELETE answer 503 with a plain "not set up yet" — never a 500.

function isMissingTable(message: string | null | undefined): boolean {
  return /could not find the table|relation .* does not exist|schema cache/i.test(message ?? '')
}

async function requireUser() {
  const sessionUser = await resolveSessionUser()
  if (!sessionUser) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!sessionUser.userId) return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  return { userId: sessionUser.userId as string }
}

export async function GET() {
  try {
    const auth = await requireUser()
    if ('error' in auth) return auth.error
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('saved_game_numbers')
      .select('game_number, created_at')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
    if (error) {
      if (isMissingTable(error.message)) {
        return NextResponse.json({ saved: [], setupReady: false })
      }
      throw error
    }
    const numbers = (data ?? []).map((r) => r.game_number as number)
    if (numbers.length === 0) {
      return NextResponse.json({ saved: [], setupReady: true })
    }
    const { data: games, error: gamesError } = await supabase
      .from('activities')
      .select('id, title, type, subject, grade, is_public, game_number')
      .in('game_number', numbers)
    if (gamesError) throw gamesError
    const byNumber = new Map<number, Record<string, unknown>>()
    for (const g of games ?? []) {
      byNumber.set((g as { game_number: number }).game_number, g as Record<string, unknown>)
    }
    const saved = numbers
      .map((n) => byNumber.get(n))
      .filter((g): g is Record<string, unknown> => g !== undefined)
      .map((g) => ({
        id: g.id,
        title: g.title,
        type: g.type,
        subject: g.subject,
        grade: g.grade,
        is_public: g.is_public,
        game_number: g.game_number,
      }))
    return NextResponse.json({ saved, setupReady: true })
  } catch (err) {
    console.error('[GET /api/saved-games]', err)
    return NextResponse.json({ error: 'Failed to load saved games' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser()
    if ('error' in auth) return auth.error
    let body: { gameNumber?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const gameNumber = cleanGameNumber(
      typeof body.gameNumber === 'number' ? String(body.gameNumber) : typeof body.gameNumber === 'string' ? body.gameNumber : null,
    )
    if (gameNumber === null) {
      return NextResponse.json({ error: 'Enter a game number (up to 6 digits).' }, { status: 400 })
    }
    const supabase = createServerClient()
    // The game must exist and be public or the caller's own — a
    // private game of another user cannot be saved.
    const { data: game, error: gameError } = await supabase
      .from('activities')
      .select('id, is_public, teacher_id, game_number')
      .eq('game_number', gameNumber)
      .single()
    if (gameError) {
      if (isGameNumberSetupError(gameError.message)) {
        return NextResponse.json(
          { error: 'Game numbers are not set up yet. The team is still setting this up.' },
          { status: 503 },
        )
      }
      return NextResponse.json({ error: 'No game with that number yet.' }, { status: 404 })
    }
    const row = game as { is_public?: boolean | null; teacher_id?: string | null }
    if (row.is_public !== true && row.teacher_id !== auth.userId) {
      return NextResponse.json({ error: 'No game with that number yet.' }, { status: 404 })
    }
    const { error } = await supabase.from('saved_game_numbers').insert({
      user_id: auth.userId,
      game_number: gameNumber,
    })
    if (error) {
      if (isMissingTable(error.message)) {
        return NextResponse.json(
          { error: 'Game numbers are not set up yet. The team is still setting this up.' },
          { status: 503 },
        )
      }
      if (/duplicate key|unique constraint/i.test(error.message)) {
        return NextResponse.json({ alreadySaved: true, gameNumber })
      }
      throw error
    }
    return NextResponse.json({ saved: true, gameNumber })
  } catch (err) {
    console.error('[POST /api/saved-games]', err)
    return NextResponse.json({ error: 'Failed to save the game number' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireUser()
    if ('error' in auth) return auth.error
    let body: { gameNumber?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const gameNumber = cleanGameNumber(
      typeof body.gameNumber === 'number' ? String(body.gameNumber) : typeof body.gameNumber === 'string' ? body.gameNumber : null,
    )
    if (gameNumber === null) {
      return NextResponse.json({ error: 'Enter a game number (up to 6 digits).' }, { status: 400 })
    }
    const supabase = createServerClient()
    const { error } = await supabase
      .from('saved_game_numbers')
      .delete()
      .eq('user_id', auth.userId)
      .eq('game_number', gameNumber)
    if (error) {
      if (isMissingTable(error.message)) {
        return NextResponse.json(
          { error: 'Game numbers are not set up yet. The team is still setting this up.' },
          { status: 503 },
        )
      }
      throw error
    }
    return NextResponse.json({ removed: true, gameNumber })
  } catch (err) {
    console.error('[DELETE /api/saved-games]', err)
    return NextResponse.json({ error: 'Failed to remove the saved game number' }, { status: 500 })
  }
}
