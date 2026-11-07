import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { isImageReviewer, isImageApprovalSetupError } from '@/lib/image-approval'

// GET /api/image-approvals?status=pending|approved|rejected
// IMAGE REVIEW QUEUE (owner order 2026-11-07 13:19 PKT): the owner
// personally approves or rejects every picture. Only role 'admin'
// may list the queue — everyone else gets 403, and the page itself
// says so plainly. Until migration 012 is run this answers
// "not set up yet" (503) instead of breaking.

export async function GET(req: NextRequest) {
  const sessionUser = await resolveSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isImageReviewer(sessionUser.role)) {
    return NextResponse.json(
      { error: 'Only the EduPlay owner can review pictures.' },
      { status: 403 },
    )
  }

  const status = req.nextUrl.searchParams.get('status') ?? 'pending'
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status must be pending, approved or rejected' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: rows, error } = await supabase
    .from('image_approvals')
    .select('*')
    .eq('status', status)
    .order('submitted_at', { ascending: false })
    .limit(50)
  if (error) {
    if (isImageApprovalSetupError(error)) {
      return NextResponse.json(
        { error: 'Image approval is not set up yet (migration 012 has not been run).', setupReady: false },
        { status: 503 },
      )
    }
    console.error('[GET /api/image-approvals]', error)
    return NextResponse.json({ error: 'Failed to load the review queue' }, { status: 500 })
  }

  const list = rows ?? []
  const activityIds = [...new Set(list.map((r) => r.activity_id as string))]
  const userIds = [...new Set(list.flatMap((r) => [r.submitted_by, r.reviewed_by]).filter(Boolean))] as string[]
  const [activitiesRes, usersRes] = await Promise.all([
    activityIds.length > 0
      ? supabase.from('activities').select('id, title, type').in('id', activityIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; type: string }> | null }),
    userIds.length > 0
      ? supabase.from('users').select('id, email, name').in('id', userIds)
      : Promise.resolve({ data: [] as Array<{ id: string; email: string; name: string | null }> | null }),
  ])
  const activityById = new Map((activitiesRes.data ?? []).map((a) => [a.id, a]))
  const userById = new Map((usersRes.data ?? []).map((u) => [u.id, u]))

  return NextResponse.json({
    approvals: list.map((r) => ({
      id: r.id,
      activityId: r.activity_id,
      activityTitle: (activityById.get(r.activity_id as string)?.title as string | undefined) ?? 'Deleted game',
      activityType: (activityById.get(r.activity_id as string)?.type as string | undefined) ?? '',
      itemIndex: r.item_index as number | null,
      imageUrl: r.image_url as string,
      imageCredit: r.image_credit as string,
      status: r.status as string,
      submittedBy: (userById.get(r.submitted_by as string)?.email as string | undefined) ?? 'Unknown',
      submittedByName: (userById.get(r.submitted_by as string)?.name as string | undefined) ?? null,
      submittedAt: r.submitted_at as string,
      reviewedBy: r.reviewed_by ? ((userById.get(r.reviewed_by as string)?.email as string | undefined) ?? 'Unknown') : null,
      reviewedAt: r.reviewed_at as string | null,
      reviewNote: r.review_note as string | null,
    })),
  })
}
