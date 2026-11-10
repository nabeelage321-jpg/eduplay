import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  PUBLIC_LIST_CACHE,
  SITEMAP_CACHE,
  LEADERBOARD_CACHE,
} from '@/lib/http-cache'

// CDN caching (2026-11-10): public read-only GETs must send a
// Cache-Control header so the edge serves repeats instead of
// re-running the function; audience-checked and session-scoped GETs
// must NOT send one (a cached 200 could leak a private game, a
// cached 404 could hide it from its owner).
//
// FOLLOW-UP 2026-11-10: Vercel strips s-maxage /
// stale-while-revalidate from the Cache-Control it forwards to the
// browser UNLESS a CDN-Cache-Control header is also set, so every
// cached route must send BOTH headers with the same value. And live
// edge verification must use GET — HEAD (curl -sI) is never served
// from Vercel's edge cache and always reports MISS.

function expectCached(res: Response, value: string) {
  expect(res.headers.get('Cache-Control')).toBe(value)
  expect(res.headers.get('CDN-Cache-Control')).toBe(value)
}

function expectUncached(res: Response) {
  expect(res.headers.get('Cache-Control')).toBeNull()
  expect(res.headers.get('CDN-Cache-Control')).toBeNull()
}

const publicRow = {
  id: 'act-1',
  title: 'Test Quiz',
  type: 'quiz',
  subject: 'Mathematics',
  grade: 'grade-5',
  language: 'en',
  is_public: true,
  teacher_id: 'teacher-1',
  game_number: 100083,
  play_count: 42,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const listResult = { data: [publicRow], error: null, count: 1 }

// Chainable query stub: every chain method returns the same promise,
// and awaiting it resolves to the LIST result — unless the chain
// ended in .single(), which resolves to the SINGLE result. The
// terminal method is set synchronously while the chain is built, so
// it is fixed by the time the awaited microtask runs.
function queryStub(list: unknown, single: unknown): any {
  let terminal = ''
  const p = Promise.resolve().then(() => (terminal === 'single' ? single : list)) as any
  for (const m of ['eq', 'order', 'range', 'limit', 'ilike', 'single', 'select']) {
    p[m] = () => {
      terminal = m
      return p
    }
  }
  return p
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: (table: string) => ({
      select: () => {
        if (table === 'live_players')
          return queryStub(
            { data: [], error: null },
            { data: null, error: { message: 'no player' } },
          )
        if (table === 'live_sessions')
          return queryStub(
            { data: [], error: null },
            { data: { activity_id: 'act-1' }, error: null },
          )
        return queryStub(listResult, { data: publicRow, error: null, count: 1 })
      },
    }),
  }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () =>
              Promise.resolve({
                data: [{ player_name: 'Kid', score: 10, correct_answers: 10, time_taken: 30 }],
                error: null,
              }),
          }),
        }),
      }),
    }),
  }),
}))

// Anonymous everywhere: the audience-checked routes must still serve
// public games, and must still refuse private ones, with no cache.
vi.mock('@/lib/auth/session-user', () => ({
  resolveSessionUser: () => Promise.resolve(null),
}))

function req(url: string): NextRequest {
  return new NextRequest(url, { headers: { 'x-forwarded-for': '127.0.0.1' } })
}

describe('CDN cache headers — public read-only GETs', () => {
  it('GET /api/activities list sends the public-list cache header', async () => {
    const { GET } = await import('@/app/api/activities/route')
    const res = await GET(req('http://localhost:3000/api/activities?type=quiz&limit=1'))
    expect(res.status).toBe(200)
    expectCached(res, PUBLIC_LIST_CACHE)
    const data = await res.json()
    expect(data).toHaveProperty('activities')
  })

  it('GET /api/activities/by-type sends the public-list cache header', async () => {
    const { GET } = await import('@/app/api/activities/by-type/route')
    const res = await GET(req('http://localhost:3000/api/activities/by-type'))
    expect(res.status).toBe(200)
    expectCached(res, PUBLIC_LIST_CACHE)
    const data = await res.json()
    expect(data).toHaveProperty('byType')
  })

  it('GET /api/browse-activities sends the public-list cache header', async () => {
    const { GET } = await import('@/app/api/browse-activities/route')
    const res = await GET(req('http://localhost:3000/api/browse-activities'))
    expect(res.status).toBe(200)
    expectCached(res, PUBLIC_LIST_CACHE)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('GET /api/leaderboard sends the short leaderboard cache header', async () => {
    const { GET } = await import('@/app/api/leaderboard/route')
    const res = await GET(req('http://localhost:3000/api/leaderboard?activity_id=act-1'))
    expect(res.status).toBe(200)
    expectCached(res, LEADERBOARD_CACHE)
    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it('GET /api/leaderboard error (missing activity_id) is never cached', async () => {
    const { GET } = await import('@/app/api/leaderboard/route')
    const res = await GET(req('http://localhost:3000/api/leaderboard'))
    expect(res.status).toBe(400)
    expectUncached(res)
  })

  it('GET /sitemap.xml sends the sitemap cache header', async () => {
    const { GET } = await import('@/app/sitemap.xml/route')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/xml')
    expectCached(res, SITEMAP_CACHE)
    expect(await res.text()).toContain('<sitemapindex')
  })

  it('sitemap chunks regenerate at most once a day', async () => {
    const sitemap = await import('@/app/sitemap')
    expect(sitemap.revalidate).toBe(86400)
  })
})

describe('CDN cache headers — deliberately NOT cached', () => {
  it('GET /api/activities/[id] (audience-checked) sends no cache header', async () => {
    const { GET } = await import('@/app/api/activities/[id]/route')
    const res = await GET(req('http://localhost:3000/api/activities/act-1'), {
      params: { id: 'act-1' },
    })
    expect(res.status).toBe(200)
    expectUncached(res)
  })

  it('GET /api/game-number (isOwner varies by signer) sends no cache header', async () => {
    const { GET } = await import('@/app/api/game-number/route')
    const res = await GET(req('http://localhost:3000/api/game-number?number=100083'))
    expect(res.status).toBe(200)
    expectUncached(res)
    const data = await res.json()
    expect(data.setupReady).toBe(true)
    expect(data.isOwner).toBe(false)
  })

  it('GET /api/live-sessions/[id]/activity (session-scoped) sends no cache header', async () => {
    const { GET } = await import('@/app/api/live-sessions/[id]/activity/route')
    const res = await GET(req('http://localhost:3000/api/live-sessions/sess-1/activity'), {
      params: { id: 'sess-1' },
    })
    expect(res.status).toBe(200)
    expectUncached(res)
  })
})
