import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'

// POST /api/parent-links/accept — a signed-in parent claims a kid's
// invite code. The link then shows the kid's games in the parent's
// Dashboard. One parent per code; a code claimed by someone else is
// rejected, never overwritten. Accepting a code does NOT approve any
// game — approval still needs the test link, one approval at a time.
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!sessionUser.userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (sessionUser.role !== 'parent') {
      return NextResponse.json(
        { error: 'Only a parent can accept a parent invite. Set your role to parent first.' },
        { status: 403 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    if (!code) {
      return NextResponse.json({ error: 'An invite code is required.' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: link, error } = await supabase
      .from('parent_links')
      .select('id, kid_user_id, kid_name, parent_user_id, accepted_at')
      .eq('link_code', code)
      .single()
    if (error || !link) {
      return NextResponse.json({ error: 'This invite code was not found.' }, { status: 404 })
    }
    if (link.parent_user_id === sessionUser.userId) {
      return NextResponse.json({ already: true, kidName: link.kid_name || 'Kid' })
    }
    if (link.parent_user_id) {
      return NextResponse.json(
        { error: 'This invite code was already claimed by another parent.' },
        { status: 409 },
      )
    }

    const { error: updateError } = await supabase
      .from('parent_links')
      .update({ parent_user_id: sessionUser.userId, accepted_at: new Date().toISOString() })
      .eq('id', link.id)
    if (updateError) throw updateError

    return NextResponse.json({ kidName: link.kid_name || 'Kid', kidUserId: link.kid_user_id })
  } catch (err) {
    console.error('[POST /api/parent-links/accept]', err)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}
