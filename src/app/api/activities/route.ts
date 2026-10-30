import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { normalizeSubjectFilter, normalizeGradeFilter, normalizeTypeFilter } from '@/lib/filters'

// Rate limiting (simple in-memory — replace with Upstash Redis in production)
const rateLimitMap = new Map<string, { count: number; reset: number }>()
const RATE_LIMIT = 60
const RATE_WINDOW = 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

function sanitize(str: unknown): string {
  if (typeof str !== 'string') return ''
  return str.replace(/<script[^>]*>.*?<\/script>/gi, '').trim().slice(0, 2000)
}

// GET /api/activities — list with filters + pagination
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const searchParams = req.nextUrl?.searchParams ?? new URL(req.url).searchParams
  // Defence in depth for the 2026-10-30 browse bug: the client now sends
  // DB values, but old/bookmarked URLs may still send display labels
  // ('Mathematics', 'Pre-K', 'wordsearch'). Normalize before the exact eq.
  const subject = normalizeSubjectFilter(searchParams.get('subject') ?? '')
  const grade = normalizeGradeFilter(searchParams.get('grade') ?? '')
  const type = normalizeTypeFilter(searchParams.get('type') ?? '')
  const locale = searchParams.get('locale') ?? ''
  const search = searchParams.get('search') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') ?? '500', 10)))

  try {
    const supabase = createServerClient()
    let query = supabase
      .from('activities')
      .select('id, title, description, type, subject, grade, language, curriculum, is_public, play_count, created_at, updated_at', { count: 'exact' })

    // Public filter — only show public activities
    query = query.eq('is_public', true)

    if (subject) query = query.eq('subject', subject)
    if (grade) query = query.eq('grade', grade)
    if (type) query = query.eq('type', type)
    if (locale) query = query.eq('language', locale)
    if (search) query = query.ilike('title', `%${search}%`)

    if (sort === 'popular') query = query.order('play_count', { ascending: false })
    else if (sort === 'az') query = query.order('title', { ascending: true })
    else query = query.order('created_at', { ascending: false })

    const from = offset > 0 ? offset : (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      activities: data ?? [],
      pagination: { page, offset, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
    })
  } catch (err) {
    console.error('[GET /api/activities]', err)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}

// POST /api/activities — create new activity (auth required)
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    // CREATE-SAVE FIX 2026-10-30: auth is the NextAuth session, NOT
    // supabase.auth.getUser() on the service-role client (which has no
    // user token and therefore always 401'd). The owner id is the
    // public.users row for the signed-in email (migration 004).
    const sessionUser = await resolveSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!sessionUser.userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const supabase = createServerClient()

    const body = await req.json()

    // Sanitize all inputs. Field aliases: the creator UI posts
    // type_id / locale / subject_id / grade_id / curriculum_id, while
    // the activities table stores type / language / subject / grade /
    // curriculum. Accept both so a real creator save is not rejected
    // with "Activity type is required" after auth is fixed.
    const payload = {
      title: sanitize(body.title),
      description: sanitize(body.description),
      type: sanitize(body.type ?? body.type_id),
      language: sanitize(body.language ?? body.locale) || 'en',
      subject: sanitize(body.subject ?? body.subject_id),
      grade: sanitize(body.grade ?? body.grade_id),
      curriculum: sanitize(body.curriculum ?? body.curriculum_id),
      teacher_id: sessionUser.userId,
      content: Array.isArray(body.items) ? { questions: body.items.map((item: Record<string, unknown>) => ({
        prompt: sanitize(item.prompt),
        answer: sanitize(item.answer),
        hint: sanitize(item.hint),
        imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl.slice(0, 500) : '',
      })) } : { questions: [] },
      is_public: body.is_public === true,
    }

    if (!payload.title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (!payload.type) return NextResponse.json({ error: 'Activity type is required' }, { status: 400 })
    if (payload.content.questions.length < 2) return NextResponse.json({ error: 'At least 2 questions are required' }, { status: 400 })

    const { data: activity, error } = await supabase
      .from('activities')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ activity }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/activities]', err)
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 })
  }
}
