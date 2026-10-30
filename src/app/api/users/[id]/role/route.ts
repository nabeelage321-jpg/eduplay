import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { isApproverRole } from '@/lib/approval'

// POST /api/users/[id]/role — record a user's role (migration 007).
// APPROVAL BATCH 2026-10-30. Why this route exists: before this batch no
// role was ever stored on the server (the old RolePicker was
// localStorage-only), so the approval gate could never fire for anyone.
// Two paths, both server-checked:
//   * id === 'me': FIRST-TIME setup only. A signed-in user with no recorded
//     role yet may set their own role to teacher/student/parent. Once a
//     role is recorded, self-change is rejected (403) — a student must
//     not be able to switch themselves to teacher and bypass the gate.
//   * Any other id: only a recorded teacher/parent may set another user's
//     role, and never their own (use 'me' rules for that).
// 'admin' is never assignable through this route. First-time role is
// self-declared — see the report for that limitation.
const ASSIGNABLE_ROLES = ['teacher', 'student', 'parent'] as const

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
    const body = await req.json().catch(() => ({}))
    const role = body.role as string
    if (!(ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json(
        { error: 'role must be "teacher", "student" or "parent"' },
        { status: 400 },
      )
    }

    const supabase = createServerClient()
    if (params.id === 'me') {
      if (sessionUser.role !== null) {
        return NextResponse.json(
          { error: 'Your role is already set. Ask a teacher or parent to change it.' },
          { status: 403 },
        )
      }
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', sessionUser.userId)
      if (error) throw error
      return NextResponse.json({ role })
    }

    if (!isApproverRole(sessionUser.role)) {
      return NextResponse.json(
        { error: 'Only a teacher or parent can set another user\'s role.' },
        { status: 403 },
      )
    }
    if (params.id === sessionUser.userId) {
      return NextResponse.json(
        { error: 'You cannot change your own role this way.' },
        { status: 403 },
      )
    }
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
      .update({ role })
      .eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ role })
  } catch (err) {
    console.error('[POST /api/users/[id]/role]', err)
    return NextResponse.json(
      { error: 'Roles are not set up yet (migration 007 has not been run).' },
      { status: 500 },
    )
  }
}
