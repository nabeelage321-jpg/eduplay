import { NextRequest, NextResponse } from 'next/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { canAddImages } from '@/lib/image-approval'
import { buildOpenverseSearchUrl, mapOpenverseResult } from '@/lib/openverse'

// GET /api/images/search?q=...&page=...
// IMAGE PICKER 2026-11-07 (owner 13:17 PKT): Openverse search for the
// create flow. Free CC-licensed pictures, no API key. The route is
// the enforcement point for the hard rule:
//   * ONLY teachers (and the owner) may search — kids/students get
//     403, not even via the picker. The client hides the picker too,
//     but this route is what actually enforces it.
//   * CC-licensed only (explicit licence list in the URL builder),
//     relevance-ranked by Openverse for the teacher's search.
//   * Results flagged mature by Openverse are dropped here, before
//     they ever reach the browser.
//   * Search-and-pick ONLY: this route never attaches a picture to
//     a game. The teacher's pick still goes through the image
//     approval queue (migration 012) before the game can go public.
// Anonymous quota is 20 req/min, 200 req/day per IP, so results
// are cached in memory for 10 minutes per query+page.

const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { at: number; body: unknown }>()

export async function GET(req: NextRequest) {
  const sessionUser = await resolveSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!canAddImages(sessionUser.role)) {
    return NextResponse.json(
      { error: 'Only a teacher can search for pictures.' },
      { status: 403 },
    )
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? 1) || 1)
  if (q.length < 2 || q.length > 100) {
    return NextResponse.json({ error: 'Search for at least 2 characters.' }, { status: 400 })
  }

  const key = `${q.toLowerCase()}|${page}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.body)
  }

  let res: Response
  try {
    res = await fetch(buildOpenverseSearchUrl(q, page), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    return NextResponse.json(
      { error: 'The picture search is unavailable right now. Try again in a moment.' },
      { status: 502 },
    )
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: 'The picture search is unavailable right now. Try again in a moment.' },
      { status: 502 },
    )
  }
  const data = (await res.json().catch(() => null)) as { results?: unknown[]; result_count?: number } | null
  const results = (data?.results ?? []).map(mapOpenverseResult).filter((r): r is NonNullable<typeof r> => r !== null)
  const body = { results, total: typeof data?.result_count === 'number' ? data.result_count : results.length, page }
  cache.set(key, { at: Date.now(), body })
  return NextResponse.json(body)
}
