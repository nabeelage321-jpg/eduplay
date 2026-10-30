import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { isApproverRole } from '@/lib/approval'

// POST /api/users/[id]/badge — revoke a Kid Creator badge.
// APPROVAL BATCH 2026-10-30. Revocation only: the badge is EARNED
// automatically at 15 approved games (see /approve) and can never be
// granted through this route. After revocation the kid returns to
// per-game approval for NEW games; already-approved games do not change.
// Only a recorded teacher/parent may revoke, and never their own badge.
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
        { error: 'Only a teacher or parent can revoke a Creator badge.' },
        { status: 403 },
      )
    }
    if (params.id === sessionUser.userId) {
      return NextResponse.json(
        { error: 'You cannot revoke your own badge.' },
        { status: 403 },
      )
    }
    const body = await req.json().catch(() => ({}))
    if (body.action !== 'revoke') {
      return NextResponse.json(
        { error: 'Only "revoke" is allowed here. The badge is earned automatically at 15 approved games.' },
        { status: 400 },
      )
    }
    const supabase = createServerClient()
    const { data: target } = await supabase
      .from('users')
      .select('id')
      .eq('id', params.id)
      .single()
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const { error } = await supabase
      .from('users')
      .update({ creator_badge: false })
      .eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ creator_badge: false })
  } catch (err) {
    console.error('[POST /api/users/[id]/badge]', err)
    return NextResponse.json(
      { error: 'Badges are not set up yet (migration 007 has not been run).' },
      { status: 500 },
    )
  }
}
