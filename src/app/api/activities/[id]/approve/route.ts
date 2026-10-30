import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import {
  APPROVED_GAMES_FOR_CREATOR_BADGE,
  isApproverRole,
  isStudentRole,
} from '@/lib/approval'

// POST /api/activities/[id]/approve — teacher/parent approval gate.
// APPROVAL BATCH 2026-10-30. Server-enforced:
//   * Only a recorded 'teacher' or 'parent' may approve/reject.
//   * The approver may NEVER be the game's creator.
//   * Approval sets approval_status='approved' + approved_by/at, but does
//     NOT publish the game — the creator must then toggle it public.
//   * Rejection sets status='rejected'; the creator editing it resubmits
//     it as pending (see PUT).
//   * Kid Creator badge: after approving, if the creator is a student and
//     now has >= APPROVED_GAMES_FOR_CREATOR_BADGE approved games, the
//     badge is granted automatically (users.creator_badge = true).
export async function POST(
  req: NextRequest,
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
    if (!isApproverRole(sessionUser.role)) {
      return NextResponse.json(
        { error: 'Only a teacher or parent can approve games.' },
        { status: 403 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action === 'reject' ? 'reject' : body.action === 'approve' ? 'approve' : null
    if (!action) {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: activity, error: fetchError } = await supabase
      .from('activities')
      .select('id, teacher_id, approval_status')
      .eq('id', params.id)
      .single()

    if (fetchError || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }
    if (activity.teacher_id === sessionUser.userId) {
      return NextResponse.json(
        { error: 'You cannot approve your own game.' },
        { status: 403 },
      )
    }

    if (action === 'approve') {
      if (activity.approval_status === 'approved') {
        return NextResponse.json({ error: 'This game is already approved.' }, { status: 400 })
      }
      const { data: updated, error } = await supabase
        .from('activities')
        .update({
          approval_status: 'approved',
          approved_by: sessionUser.userId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .select()
        .single()
      if (error) throw error

      // Kid Creator badge: auto-grant at the threshold, students only.
      let badgeEarned = false
      if (activity.teacher_id) {
        const { data: creator } = await supabase
          .from('users')
          .select('role, creator_badge')
          .eq('id', activity.teacher_id)
          .single()
        if (creator && isStudentRole(creator.role) && creator.creator_badge !== true) {
          const { count } = await supabase
            .from('activities')
            .select('id', { count: 'exact', head: true })
            .eq('teacher_id', activity.teacher_id)
            .eq('approval_status', 'approved')
          if ((count ?? 0) >= APPROVED_GAMES_FOR_CREATOR_BADGE) {
            const { error: badgeError } = await supabase
              .from('users')
              .update({ creator_badge: true })
              .eq('id', activity.teacher_id)
            badgeEarned = !badgeError
          }
        }
      }
      return NextResponse.json({ activity: updated, badge_earned: badgeEarned })
    }

    // reject
    if (activity.approval_status !== 'pending') {
      return NextResponse.json(
        { error: 'Only a pending game can be rejected.' },
        { status: 400 },
      )
    }
    const { data: updated, error } = await supabase
      .from('activities')
      .update({ approval_status: 'rejected', approved_by: null, approved_at: null, is_public: false })
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ activity: updated })
  } catch (err) {
    console.error('[POST /api/activities/[id]/approve]', err)
    return NextResponse.json(
      { error: 'Approval is not set up yet (migration 007 has not been run).' },
      { status: 500 },
    )
  }
}
