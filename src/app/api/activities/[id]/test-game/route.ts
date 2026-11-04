import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { testGameAccess } from '@/lib/activity-audience'

// ─── Kids social approval: test-game content (security batch) ───────────
// GET /api/activities/[id]/test-game — public, INTENTIONAL test path.
// This is the ONLY route that serves a pending kid game to an anonymous
// tester, and it exists because the general GET /api/activities/[id]
// route now refuses every non-public game to non-owners (security
// batch, pre-domain-launch). TestGameView used to fetch its content
// through that general route; it now fetches here instead, so closing
// the general-route gap cannot break the test flow.
//
// The test link itself is the invitation — testers have no accounts
// by design (nickname only) — so holding the link is enough for a
// pending game. Nothing else is served here:
//   pending + student creator → the full activity (the test flow).
//   pending + non-student      → refused (teachers/parents/creators
//                                publish directly; no test gate).
//   approved + public          → the full activity (zero new
//                                exposure: the general route already
//                                serves public games to anyone, and
//                                the test page's published panel links
//                                to the public game page).
//   rejected                   → refused (a removed game is never
//                                served again through any test path).
//   approved but private       → refused (a private draft is never
//                                served to a non-owner anywhere).
// Refusals carry no questions and no content — only a plain message.
// The role read mirrors POST /api/activities/[id]/test-approve: a
// role column that cannot be read (migration 007/008 not run) answers
// 503 with the setup message, never a guess.

const SETUP_MESSAGE =
  'Social approval is not set up yet (migration 008 has not been run). Ask the owner to run it — until then this game stays private.'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createServerClient()
    const { data: activity, error } = await supabase
      .from('activities')
      .select('*')
      .eq('id', params.id)
      .single()
    if (error || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const row = activity as {
      teacher_id?: string | null
      approval_status?: string | null
      is_public?: boolean | null
    }

    // Creator role decides the pending case, exactly like the approve
    // route: only a student creator's game is ever in testing.
    let creatorIsStudent = false
    if (row.teacher_id) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', row.teacher_id)
        .single()
      if (userError) {
        if (/role/i.test(userError.message ?? '')) {
          return NextResponse.json({ error: SETUP_MESSAGE }, { status: 503 })
        }
        creatorIsStudent = false
      } else {
        creatorIsStudent = (user as { role?: string | null }).role === 'student'
      }
    }

    const access = testGameAccess({
      approvalStatus: row.approval_status,
      isPublic: row.is_public,
      creatorIsStudent,
    })
    if (access === 'serve') {
      return NextResponse.json({ activity })
    }
    if (access === 'not-open') {
      return NextResponse.json(
        { error: 'This game is not open for testing. Its creator can edit it to resubmit it.' },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: 'This game does not need test approval.' },
      { status: 400 },
    )
  } catch (err) {
    console.error('[GET /api/activities/[id]/test-game]', err)
    return NextResponse.json({ error: 'Failed to load test game' }, { status: 500 })
  }
}
