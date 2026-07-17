import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

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
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('activities')
      .select('teacher_id')
      .eq('id', params.id)
      .single()

    if (!existing || existing.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) updates.title = sanitize(body.title)
    if (body.description !== undefined) updates.description = sanitize(body.description)
    if (body.subject_id !== undefined) updates.subject_id = sanitize(body.subject_id)
    if (body.grade_id !== undefined) updates.grade_id = sanitize(body.grade_id)
    if (body.curriculum_id !== undefined) updates.curriculum_id = sanitize(body.curriculum_id)
    if (body.topic_id !== undefined) updates.topic_id = sanitize(body.topic_id)
    if (body.is_public !== undefined) updates.is_public = body.is_public === true
    if (body.tags !== undefined) {
      updates.tags = Array.isArray(body.tags)
        ? body.tags.map((t: unknown) => sanitize(String(t))).slice(0, 10)
        : []
    }
    if (Array.isArray(body.items)) {
      updates.items = body.items.map((item: Record<string, unknown>) => ({
        prompt: sanitize(item.prompt),
        answer: sanitize(item.answer),
        hint: sanitize(item.hint),
        imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl.slice(0, 500) : '',
      }))
    }

    const { data: activity, error } = await supabase
      .from('activities')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

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
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('activities')
      .select('teacher_id')
      .eq('id', params.id)
      .single()

    if (!existing || existing.teacher_id !== user.id) {
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
