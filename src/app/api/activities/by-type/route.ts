import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { normalizeSubjectFilter, normalizeGradeFilter, FILTER_TYPES } from '@/lib/filters'

// GET /api/activities/by-type — newest public game per game type.
// Added 2026-11-07 (40-type play grid, owner order, launch day):
// the /en/play-games grid shows ONE tile per type, and the tile opens
// the newest public game of that type matching the sidebar pick
// (subject + class). Fetching that as 40 separate /api/activities
// calls would burn the 60-requests-per-minute rate limit on that
// route in a single page load — and a second pick change inside the
// same minute would 429. So this route answers the whole grid in ONE
// request: one Supabase query (newest first, limit 500), reduced
// server-side to the first row per type. Every key of the returned
// byType map is always present (a DB type value from FILTER_TYPES);
// a type with no public game for the pick is null — never omitted,
// never invented. Public-only is enforced server-side (is_public =
// true), so a private or pending (kid-approval) game never appears.
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

interface ByTypeGame {
  id: string
  title: string
  type: string
  subject: string
  grade: string
  created_at: string
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const searchParams = req.nextUrl?.searchParams ?? new URL(req.url).searchParams
  const subject = normalizeSubjectFilter(searchParams.get('subject') ?? '')
  const grade = normalizeGradeFilter(searchParams.get('grade') ?? '')

  try {
    const supabase = createServerClient()
    let query = supabase
      .from('activities')
      .select('id, title, type, subject, grade, created_at')
      .eq('is_public', true)

    if (subject) query = query.eq('subject', subject)
    if (grade) query = query.eq('grade', grade)

    // Newest first overall; the reduce below keeps the first row seen
    // per type, which is that type's newest public game for the pick.
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('by-type query failed:', error)
      return NextResponse.json({ error: 'Failed to load games' }, { status: 500 })
    }

    const byType: Record<string, ByTypeGame | null> = {}
    for (const t of FILTER_TYPES) byType[t.value] = null
    for (const row of (data ?? []) as ByTypeGame[]) {
      if (row.type in byType && byType[row.type] === null) {
        byType[row.type] = row
      }
    }

    return NextResponse.json({ byType })
  } catch (error) {
    console.error('by-type route failed:', error)
    return NextResponse.json({ error: 'Failed to load games' }, { status: 500 })
  }
}
