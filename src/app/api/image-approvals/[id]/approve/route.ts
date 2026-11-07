import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { isImageReviewer, isImageApprovalSetupError } from '@/lib/image-approval'

// POST /api/image-approvals/[id]/approve
// IMAGE REVIEW QUEUE (owner order 2026-11-07 13:19 PKT): the owner
// approves one picture. Only role 'admin'. Approve writes the
// picture into the game's content (shared picture: every item;
// one question's picture: that item only) and restores the
// visibility the teacher asked for — unless another picture for
// the same game is still pending, in which case the game stays
// private until that one is decided too.

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const sessionUser = await resolveSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isImageReviewer(sessionUser.role)) {
    return NextResponse.json(
      { error: 'Only the EduPlay owner can approve pictures.' },
      { status: 403 },
    )
  }
  if (!sessionUser.userId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = (await req.json().catch(() => ({}))) as { note?: string }
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''

  const supabase = createServerClient()
  const { data: row, error: rowError } = await supabase
    .from('image_approvals')
    .select('*')
    .eq('id', params.id)
    .single()
  if (rowError) {
    if (isImageApprovalSetupError(rowError)) {
      return NextResponse.json(
        { error: 'Image approval is not set up yet (migration 012 has not been run).', setupReady: false },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: 'Picture not found' }, { status: 404 })
  }
  if (!row || row.status !== 'pending') {
    return NextResponse.json({ error: 'This picture has already been decided.' }, { status: 409 })
  }

  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .select('id, content, is_public')
    .eq('id', row.activity_id)
    .single()
  if (activityError || !activity) {
    return NextResponse.json({ error: 'The game for this picture no longer exists.' }, { status: 404 })
  }

  const content = (activity.content ?? {}) as { questions?: Array<Record<string, unknown>> }
  const questions = Array.isArray(content.questions) ? content.questions : null
  if (!questions) {
    return NextResponse.json(
      { error: 'The game has no questions to attach this picture to.' },
      { status: 409 },
    )
  }
  const itemIndex = row.item_index as number | null
  if (itemIndex !== null && (itemIndex < 0 || itemIndex >= questions.length)) {
    return NextResponse.json(
      { error: 'The game changed since this picture was submitted — ask the teacher to submit it again.' },
      { status: 409 },
    )
  }

  const nextQuestions = questions.map((q, i) => {
    if (itemIndex === null || itemIndex === i) {
      return { ...q, imageUrl: row.image_url as string, imageCredit: row.image_credit as string }
    }
    return q
  })

  // Any other picture for this game still pending? Then the game
  // stays private until that one is decided too.
  const { data: stillPending, error: pendingError } = await supabase
    .from('image_approvals')
    .select('id')
    .eq('activity_id', row.activity_id)
    .eq('status', 'pending')
    .neq('id', params.id)
    .limit(1)
  if (pendingError) {
    console.error('[POST /api/image-approvals/approve] pending check failed', pendingError)
    return NextResponse.json({ error: 'Failed to approve the picture' }, { status: 500 })
  }
  const restorePublic = (stillPending?.length ?? 0) === 0 ? Boolean(row.was_public) : false

  const { error: updateError } = await supabase
    .from('activities')
    .update({
      content: { ...content, questions: nextQuestions },
      ...(restorePublic ? { is_public: true } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.activity_id)
  if (updateError) {
    console.error('[POST /api/image-approvals/approve] game update failed', updateError)
    return NextResponse.json({ error: 'Failed to approve the picture' }, { status: 500 })
  }

  const { error: rowUpdateError } = await supabase
    .from('image_approvals')
    .update({
      status: 'approved',
      reviewed_by: sessionUser.userId,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    })
    .eq('id', params.id)
  if (rowUpdateError) {
    console.error('[POST /api/image-approvals/approve] approval record failed', rowUpdateError)
    return NextResponse.json({ error: 'Failed to record the approval' }, { status: 500 })
  }

  return NextResponse.json({ approved: true, gamePublic: restorePublic })
}
