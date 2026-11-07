import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { isImageReviewer, isImageApprovalSetupError } from '@/lib/image-approval'

// POST /api/image-approvals/[id]/reject
// IMAGE REVIEW QUEUE (owner order 2026-11-07 13:19 PKT): the owner
// rejects one picture. Only role 'admin'. Reject drops the picture
// — it never enters the game's content — and the game stays
// private/imageless. The row stays as the approval record (who
// rejected what and when), so the teacher can see why and submit a
// different picture.

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
      { error: 'Only the EduPlay owner can reject pictures.' },
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
    .select('id, status')
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

  const { error } = await supabase
    .from('image_approvals')
    .update({
      status: 'rejected',
      reviewed_by: sessionUser.userId,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    })
    .eq('id', params.id)
  if (error) {
    console.error('[POST /api/image-approvals/reject]', error)
    return NextResponse.json({ error: 'Failed to reject the picture' }, { status: 500 })
  }

  return NextResponse.json({ rejected: true })
}
