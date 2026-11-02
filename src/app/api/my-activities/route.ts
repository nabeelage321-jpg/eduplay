import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'

// TEACHER-ID / LIVE-PICK BATCH 2026-11-02. The Dashboard lists a teacher's
// own games with a direct server query (teacher_id = session user) — there
// is no endpoint for it, and GET /api/activities cannot serve this: it
// only returns is_public rows and has no teacher filter, so it would leak
// other teachers' and programme games. This route runs the SAME Dashboard
// query (same columns, same teacher_id eq, same newest-first order, same
// 50 cap, same migration-007 approval_status fallback) behind the session,
// so the client Live page can list only the signed-in teacher's own saved
// games. Signed-out callers get 401 and the UI shows the plain empty line;
// a signed-in user with no public.users row gets an empty list, not an
// error — both are "no saved games yet" states, not failures.
export async function GET() {
  // Session resolution throwing (e.g. auth misconfigured) is a
  // signed-out state for this UI, not a 500: the Live page shows the
  // plain empty line for any non-OK response.
  let sessionUser: Awaited<ReturnType<typeof resolveSessionUser>>
  try {
    sessionUser = await resolveSessionUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!sessionUser.userId) {
    return NextResponse.json({ activities: [] })
  }

  try {
    const supabase = createServerClient()
    const withStatus = await supabase
      .from('activities')
      .select('id, title, type, subject, grade, is_public, approval_status, created_at')
      .eq('teacher_id', sessionUser.userId)
      .order('created_at', { ascending: false })
      .range(0, 49)
    if (!withStatus.error) {
      return NextResponse.json({ activities: withStatus.data ?? [] })
    }
    if (/approval_status/i.test(withStatus.error.message ?? '')) {
      const legacy = await supabase
        .from('activities')
        .select('id, title, type, subject, grade, is_public, created_at')
        .eq('teacher_id', sessionUser.userId)
        .order('created_at', { ascending: false })
        .range(0, 49)
      if (legacy.error) throw legacy.error
      return NextResponse.json({ activities: legacy.data ?? [] })
    }
    throw withStatus.error
  } catch (err) {
    console.error('[GET /api/my-activities]', err)
    return NextResponse.json({ error: 'Failed to fetch saved games' }, { status: 500 })
  }
}
