import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'

// ─── Parent links (kids social approval v1, 2026-11-04) ──────────────────
// A kid profile is name-only under a parent account: no kid email or
// password is ever created here. The kid creator (role 'student') makes
// an invite code; a signed-in parent opens the parent link and accepts
// it. From then on the parent sees the kid's games in Dashboard and can
// approve (counts as ONE of the 3 test approvals, never a solo unlock)
// and remove a live game.
// GET  — signed-in parent: their accepted links (kid name + kid id only).
// POST — signed-in student: create (or reuse) an unclaimed invite code.
// Before migration 008 the table does not exist: GET answers an empty
// list with setupReady:false; POST answers 503 with a plain message.

// Safe invite alphabet: no I, O, 0 or 1, so a code read aloud is clear.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function makeCode(length = 10): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

function isMissingTable(message: string | null | undefined): boolean {
  return /could not find the table|relation .* does not exist|schema cache/i.test(message ?? '')
}

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
    const { data, error } = await supabase
      .from('parent_links')
      .select('kid_user_id, kid_name, accepted_at')
      .eq('parent_user_id', sessionUser.userId)
      .not('accepted_at', 'is', null)
      .order('accepted_at', { ascending: true })
    if (error) {
      if (isMissingTable(error.message)) {
        return NextResponse.json({ links: [], setupReady: false })
      }
      throw error
    }
    return NextResponse.json({
      links: (data ?? []).map((row) => ({
        kidUserId: row.kid_user_id,
        kidName: row.kid_name || 'Kid',
      })),
      setupReady: true,
    })
  } catch (err) {
    console.error('[GET /api/parent-links]', err)
    return NextResponse.json({ error: 'Failed to load parent links' }, { status: 500 })
  }
}

export async function POST(_req: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!sessionUser.userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (sessionUser.role !== 'student') {
      return NextResponse.json(
        { error: 'Only a kid creator can invite a parent.' },
        { status: 403 },
      )
    }

    const supabase = createServerClient()
    const { data: userRow } = await supabase
      .from('users')
      .select('name')
      .eq('id', sessionUser.userId)
      .single()
    const kidName = (userRow as { name?: string | null } | null)?.name?.trim() || 'Kid'

    // Reuse an existing unclaimed code so a kid does not collect codes.
    const { data: existing } = await supabase
      .from('parent_links')
      .select('link_code')
      .eq('kid_user_id', sessionUser.userId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing?.link_code) {
      return NextResponse.json({ code: existing.link_code, kidName })
    }

    const code = makeCode()
    const { error } = await supabase.from('parent_links').insert({
      kid_user_id: sessionUser.userId,
      parent_user_id: null,
      link_code: code,
      kid_name: kidName,
    })
    if (error) {
      if (isMissingTable(error.message)) {
        return NextResponse.json(
          { error: 'Parent links are not set up yet (migration 008 has not been run).' },
          { status: 503 },
        )
      }
      throw error
    }
    return NextResponse.json({ code, kidName })
  } catch (err) {
    console.error('[POST /api/parent-links]', err)
    return NextResponse.json({ error: 'Failed to create parent invite' }, { status: 500 })
  }
}
