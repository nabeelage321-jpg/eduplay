import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { needsApproval } from '@/lib/approval'

function sanitize(str: unknown): string {
  if (typeof str !== 'string') return ''
  return str.replace(/<script[^>]*>.*?<\/script>/gi, '').trim().slice(0, 2000)
}

// ─── Remix (batch 1, final list 11–14, 2026-11-07) ────────────────────
// POST /api/activities/[id]/remix — signed-in only. A NON-MAKER makes
// THEIR OWN NEW GAME from an existing game: the server copies the
// original's title/type/subject/grade/language/curriculum/content
// into a brand-new row owned by the caller. The ORIGINAL is never
// changed. The copy starts PRIVATE (the maker chooses public later
// in the edit flow); a kid's copy is pending + private, server-
// enforced, exactly like a fresh save. A private source serves only
// its owner (same 404 as a missing game for everyone else). The new
// game gets its own number from the 011 sequence default — never
// copied from the original.
// Pre-migration fallback: if 008 has not been run yet, the approval
// columns do not exist and the insert is retried without them, so a
// remix does not break — same pattern as POST /api/activities.

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

    const { data: source, error: sourceError } = await supabase
      .from('activities')
      .select('id, title, type, subject, grade, language, curriculum, content, is_public, teacher_id')
      .eq('id', params.id)
      .single()
    if (sourceError || !source) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }
    const row = source as {
      title?: string | null
      type?: string | null
      subject?: string | null
      grade?: string | null
      language?: string | null
      curriculum?: string | null
      content?: unknown
      is_public?: boolean | null
      teacher_id?: string | null
    }
    const isOwner = row.teacher_id !== null && row.teacher_id === sessionUser.userId
    if (row.is_public !== true && !isOwner) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const gated = needsApproval(sessionUser.role)
    const payload = {
      title: `Copy of ${sanitize(row.title) || 'Untitled game'}`.slice(0, 2000),
      description: '',
      type: sanitize(row.type),
      language: sanitize(row.language) || 'en',
      subject: sanitize(row.subject),
      grade: sanitize(row.grade),
      curriculum: sanitize(row.curriculum),
      teacher_id: sessionUser.userId,
      content: (row.content ?? { questions: [] }) as Record<string, unknown>,
      // The copy is the caller's own game: private until they choose
      // otherwise. A kid's copy is pending, server-enforced.
      is_public: false,
      approval_status: gated ? 'pending' : 'approved',
      approved_by: null,
      approved_at: null,
    }

    let { data: activity, error } = await supabase
      .from('activities')
      .insert(payload)
      .select()
      .single()

    if (error && /approval_status|approved_by|approved_at/i.test(error.message ?? '')) {
      const { approval_status: _s, approved_by: _b, approved_at: _a, ...legacyPayload } = payload
      const retry = await supabase.from('activities').insert(legacyPayload).select().single()
      activity = retry.data
      error = retry.error
    }

    if (error) throw error

    return NextResponse.json({ activity }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/activities/[id]/remix]', err)
    return NextResponse.json({ error: 'Failed to make your own game from this one' }, { status: 500 })
  }
}
