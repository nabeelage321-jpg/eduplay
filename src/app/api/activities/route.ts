import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

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

  const { searchParams } = req.nextUrl
  const subject = searchParams.get('subject') ?? ''
  const grade = searchParams.get('grade') ?? ''
  const type = searchParams.get('type') ?? ''
  const locale = searchParams.get('locale') ?? ''
  const search = searchParams.get('search') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(48, parseInt(searchParams.get('limit') ?? '24', 10))

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

    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      activities: data ?? [],
      pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
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
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Sanitize all inputs
    const payload = {
      title: sanitize(body.title),
      description: sanitize(body.description),
      type: sanitize(body.type),
      language: sanitize(body.language) || 'en',
      subject: sanitize(body.subject),
      grade: sanitize(body.grade),
      curriculum: sanitize(body.curriculum),
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
