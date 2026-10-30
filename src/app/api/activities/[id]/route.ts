import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { needsApproval } from '@/lib/approval'

function sanitize(str: unknown): string {
  if (typeof str !== 'string') return ''
  return str.replace(/<script[^>]*>.*?<\/script>/gi, '').trim().slice(0, 2000)
}

// GET /api/activities/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
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

    return NextResponse.json({ activity })
  } catch (err) {
    console.error('[GET /api/activities/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}

// PUT /api/activities/[id] — update (owner only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // CREATE-SAVE FIX 2026-10-30: NextAuth session, not
    // supabase.auth.getUser() on the token-less service-role client.
    const sessionUser = await resolveSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!sessionUser.userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const supabase = createServerClient()

    // Verify ownership. A row with no teacher_id (all programme games,
    // which predate the column) has no owner and is therefore NOT
    // editable by anyone — returning 403 for it protects the programme.
    // APPROVAL BATCH 2026-10-30: also read approval_status, falling back
    // to 'approved' if migration 007 has not been run yet.
    let existing: { teacher_id: string | null; approval_status?: string | null } | null = null
    {
      const withStatus = await supabase
        .from('activities')
        .select('teacher_id, approval_status')
        .eq('id', params.id)
        .single()
      if (!withStatus.error && withStatus.data) {
        existing = withStatus.data
      } else {
        const legacy = await supabase
          .from('activities')
          .select('teacher_id')
          .eq('id', params.id)
          .single()
        existing = legacy.data ? { ...legacy.data, approval_status: 'approved' } : null
      }
    }

    if (!existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }
    if (existing.teacher_id !== sessionUser.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    // APPROVAL BATCH 2026-10-30: a student without the Creator badge may
    // NOT flip a pending game public — rejected, not silently forced.
    const studentGated = needsApproval(sessionUser.role, sessionUser.creatorBadge)
    if (studentGated && existing.approval_status === 'pending' && body.is_public === true) {
      return NextResponse.json(
        { error: 'Waiting for teacher/parent approval. This game cannot go public yet.' },
        { status: 403 },
      )
    }

    // Only columns that exist in the activities table (migration 001 +
    // 005). The old code updated subject_id / grade_id / curriculum_id /
    // topic_id / tags / items, none of which exist, so every PUT would
    // have failed at the database even after auth was fixed. Creator
    // aliases (type_id, locale, subject_id, ...) are accepted as above.
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) updates.title = sanitize(body.title)
    if (body.description !== undefined) updates.description = sanitize(body.description)
    if (body.type !== undefined || body.type_id !== undefined) updates.type = sanitize(body.type ?? body.type_id)
    if (body.subject !== undefined || body.subject_id !== undefined) updates.subject = sanitize(body.subject ?? body.subject_id)
    if (body.grade !== undefined || body.grade_id !== undefined) updates.grade = sanitize(body.grade ?? body.grade_id)
    if (body.language !== undefined || body.locale !== undefined) updates.language = sanitize(body.language ?? body.locale)
    if (body.curriculum !== undefined || body.curriculum_id !== undefined) updates.curriculum = sanitize(body.curriculum ?? body.curriculum_id)
    if (body.is_public !== undefined) updates.is_public = body.is_public === true
    if (Array.isArray(body.items)) {
      updates.content = { questions: body.items.map((item: Record<string, unknown>) => ({
        prompt: sanitize(item.prompt),
        answer: sanitize(item.answer),
        hint: sanitize(item.hint),
        imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl.slice(0, 500) : '',
      })) }
    } else if (body.content !== undefined && typeof body.content === 'object' && body.content !== null) {
      updates.content = body.content
    }

    // APPROVAL BATCH 2026-10-30: a gated student editing a REJECTED game
    // resubmits it — back to pending, private, awaiting approval again.
    // A pending game stays pending on content edits; only an approval
    // (see /approve) can move it to approved.
    const editedContent =
      updates.title !== undefined || updates.description !== undefined ||
      updates.type !== undefined || updates.subject !== undefined ||
      updates.grade !== undefined || updates.language !== undefined ||
      updates.curriculum !== undefined || updates.content !== undefined
    if (studentGated && existing.approval_status === 'rejected' && editedContent) {
      updates.approval_status = 'pending'
      updates.approved_by = null
      updates.approved_at = null
      updates.is_public = false
    }
    // A pending game can never be left public by an edit.
    if (studentGated && existing.approval_status === 'pending') {
      updates.is_public = false
    }

    let { data: activity, error } = await supabase
      .from('activities')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    // Pre-migration fallback: retry without approval columns if 007
    // has not been run yet, so editing does not break.
    if (error && /approval_status|approved_by|approved_at/i.test(error.message ?? '')) {
      const { approval_status: _s, approved_by: _b, approved_at: _a, ...legacyUpdates } = updates
      const retry = await supabase.from('activities').update(legacyUpdates).eq('id', params.id).select().single()
      activity = retry.data
      error = retry.error
      if (!retry.error) {
        return NextResponse.json({
          activity,
          migration_warning: 'Approval is not set up yet (migration 007 has not been run).',
        })
      }
    }

    if (error) throw error

    return NextResponse.json({ activity })
  } catch (err) {
    console.error('[PUT /api/activities/[id]]', err)
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
  }
}

// DELETE /api/activities/[id] — delete (owner only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // CREATE-SAVE FIX 2026-10-30: NextAuth session, not
    // supabase.auth.getUser() on the token-less service-role client.
    const sessionUser = await resolveSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!sessionUser.userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const supabase = createServerClient()

    // Verify ownership. A row with no teacher_id (all programme games)
    // has no owner and is therefore NOT deletable by anyone.
    const { data: existing } = await supabase
      .from('activities')
      .select('teacher_id')
      .eq('id', params.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }
    if (existing.teacher_id !== sessionUser.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/activities/[id]]', err)
    return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 })
  }
}
