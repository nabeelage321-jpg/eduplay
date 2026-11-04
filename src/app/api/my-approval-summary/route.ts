import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { CREATOR_BADGE_GAMES, hasCreatorBadgeDisplay } from '@/lib/social-approval'

// GET /api/my-approval-summary — signed-in user's own approval numbers,
// computed live from their games (never stored, never gifted):
// approved games, pending games, and whether the Creator badge shows.
// The badge is display only: it never changes the gate.
export async function GET() {
  try {
    const sessionUser = await resolveSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!sessionUser.userId) {
      return NextResponse.json({ approvedCount: 0, pendingCount: 0, badgeEarned: false, setupReady: false })
    }
    const supabase = createServerClient()
    const { count: approved, error: approvedError } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', sessionUser.userId)
      .eq('approval_status', 'approved')
    if (approvedError) {
      return NextResponse.json({ approvedCount: 0, pendingCount: 0, badgeEarned: false, setupReady: false })
    }
    const { count: pending } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', sessionUser.userId)
      .eq('approval_status', 'pending')
    const approvedCount = approved ?? 0
    return NextResponse.json({
      approvedCount,
      pendingCount: pending ?? 0,
      badgeEarned: hasCreatorBadgeDisplay(approvedCount),
      badgeThreshold: CREATOR_BADGE_GAMES,
      setupReady: true,
    })
  } catch (err) {
    console.error('[GET /api/my-approval-summary]', err)
    return NextResponse.json({ error: 'Failed to load approval summary' }, { status: 500 })
  }
}
