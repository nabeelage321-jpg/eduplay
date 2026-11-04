import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { isApproverRole } from '@/lib/approval'

// POST /api/activities/[id]/remove — teacher/parent removal of a live game.
// SOCIAL APPROVAL 2026-11-04: teachers and parents do NOT approve games
// any more (that is the testers' job), but they MAY remove a bad item
// AFTER it is live. Removal sets the game private again with status
// 'rejected'; the kid creator editing it resubmits it for testing
// (see PUT), and its stale test approvals are cleared here so a
// resubmission is tested from scratch.
// Who may remove: a recorded teacher/parent, OR a parent linked to this
// game's kid creator (parent_links, migration 008). The creator
// themselves may not use this route (they edit/delete their own game).
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const sessionUser = await resolveSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!sessionUser.userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const supabase = createServerClient()
    const { data: activity, error: fetchError } = await supabase
      .from('activities')
      .select('id, teacher_id, is_public')
      .eq('id', params.id)
      .single()
    if (fetchError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }
    if (activity.teacher_id === sessionUser.userId) {
      return NextResponse.json(
        { error: 'You cannot remove your own game here — edit or delete it instead.' },
        { status: 403 },
      )
    }

    let allowed = isApproverRole(sessionUser.role)
    if (!allowed && activity.teacher_id) {
      try {
        const { data: link } = await supabase
          .from('parent_links')
          .select('id')
          .eq('kid_user_id', activity.teacher_id)
          .eq('parent_user_id', sessionUser.userId)
          .not('accepted_at', 'is', null)
          .limit(1)
          .maybeSingle()
        allowed = Boolean(link)
      } catch {
        allowed = false
      }
    }
    if (!allowed) {
      return NextResponse.json(
        { error: 'Only a teacher, a parent, or a linked parent can remove a live game.' },
        { status: 403 },
      )
    }

    if (activity.is_public !== true) {
      return NextResponse.json({ error: 'This game is not live, so there is nothing to remove.' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('activities')
      .update({ is_public: false, approval_status: 'rejected', approved_by: null, approved_at: null })
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw error

    try {
      await supabase.from('game_test_approvals').delete().eq('game_id', params.id)
    } catch {
      // Best-effort: a missing table (pre-008) is not an error.
    }

    return NextResponse.json({ activity: updated })
  } catch (err) {
    console.error('[POST /api/activities/[id]/remove]', err)
    return NextResponse.json({ error: 'Failed to remove game' }, { status: 500 })
  }
}
