import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'

// GET /api/parent-links/games — signed-in parent: the games of every kid
// linked to them, with each game's approval count. A parent sees ONLY
// linked kids' games here (never another family's games), and only
// nicknames-free rows: title/type/subject/grade/status — no personal
// data beyond the kid display name the kid's own invite stored.
export async function GET() {
  try {
    const sessionUser = await resolveSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!sessionUser.userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const supabase = createServerClient()
    const { data: links, error: linkError } = await supabase
      .from('parent_links')
      .select('kid_user_id, kid_name')
      .eq('parent_user_id', sessionUser.userId)
      .not('accepted_at', 'is', null)
    if (linkError) {
      if (/could not find the table|relation .* does not exist|schema cache/i.test(linkError.message ?? '')) {
        return NextResponse.json({ games: [], setupReady: false })
      }
      throw linkError
    }
    const kidIds = (links ?? []).map((l) => l.kid_user_id).filter(Boolean)
    if (kidIds.length === 0) {
      return NextResponse.json({ games: [], setupReady: true })
    }
    const kidNameById = new Map<string, string>()
    for (const link of links ?? []) {
      kidNameById.set(link.kid_user_id, link.kid_name || 'Kid')
    }

    const { data: games, error: gameError } = await supabase
      .from('activities')
      .select('id, title, type, subject, grade, is_public, approval_status, created_at, teacher_id')
      .in('teacher_id', kidIds)
      .order('created_at', { ascending: false })
      .range(0, 49)
    if (gameError) throw gameError

    const gameIds = (games ?? []).map((g) => g.id)
    const countByGame = new Map<string, number>()
    let setupReady = true
    if (gameIds.length > 0) {
      const { data: approvals, error: approvalError } = await supabase
        .from('game_test_approvals')
        .select('game_id')
        .in('game_id', gameIds)
      if (approvalError) {
        setupReady = false
      } else {
        for (const row of approvals ?? []) {
          countByGame.set(row.game_id, (countByGame.get(row.game_id) ?? 0) + 1)
        }
      }
    }

    return NextResponse.json({
      games: (games ?? []).map((g) => ({
        id: g.id,
        title: g.title,
        type: g.type,
        subject: g.subject,
        grade: g.grade,
        isPublic: g.is_public === true,
        approvalStatus: g.approval_status ?? null,
        approvalCount: countByGame.get(g.id) ?? 0,
        kidName: kidNameById.get(g.teacher_id) ?? 'Kid',
        createdAt: g.created_at,
      })),
      setupReady,
    })
  } catch (err) {
    console.error('[GET /api/parent-links/games]', err)
    return NextResponse.json({ error: 'Failed to load linked kids\' games' }, { status: 500 })
  }
}
