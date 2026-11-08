import { describe, it, expect, vi, beforeEach } from 'vitest'

// LIVE-JOIN FIX 2026-11-08: GET /api/live-sessions/[id]/activity must
// serve a hosted PRIVATE game to a joined player of that session (and
// to its signed-in owner), and to nobody else — same 404 as a missing
// game for every other caller, so nothing leaks.

const PLAYER_ID = '11111111-2222-4333-8444-555555555555'
const SESSION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const SESSION_PUBLIC_ID = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff'
const UNKNOWN_SESSION_ID = 'cccccccc-dddd-4eee-8fff-000000000000'
const WRONG_PLAYER_ID = '22222222-3333-4444-8555-666666666666'

const db: Record<string, Array<Record<string, unknown>>> = {
  live_players: [{ id: PLAYER_ID, session_id: SESSION_ID, nickname: 'Kid', score: 0 }],
  live_sessions: [
    { id: SESSION_ID, activity_id: 'act-private' },
    { id: SESSION_PUBLIC_ID, activity_id: 'act-public' },
  ],
  activities: [
    { id: 'act-private', title: 'Private Game', is_public: false, teacher_id: 'teacher-1' },
    { id: 'act-public', title: 'Public Game', is_public: true, teacher_id: null },
  ],
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: (table: string) => ({
      select: () => {
        const filters: Array<[string, unknown]> = []
        const chain: {
          eq: (col: string, val: unknown) => typeof chain
          single: () => Promise<{ data: unknown; error: { message: string } | null }>
        } = {
          eq: (col: string, val: unknown) => {
            filters.push([col, val])
            return chain
          },
          single: async () => {
            const rows = db[table] ?? []
            const row = rows.find((r) => filters.every(([c, v]) => r[c] === v))
            return row
              ? { data: row, error: null }
              : { data: null, error: { message: 'not found' } }
          },
        }
        return chain
      },
    }),
  }),
}))

const mockResolveSessionUser = vi.fn()
vi.mock('@/lib/auth/session-user', () => ({
  resolveSessionUser: (...args: unknown[]) => mockResolveSessionUser(...args),
}))

function mockRequest(url: string): Request {
  return new Request(url, { method: 'GET' }) as unknown as Request
}

async function getActivity(sessionId: string, playerId?: string) {
  const { GET } = await import('@/app/api/live-sessions/[id]/activity/route')
  const url =
    `http://localhost:3000/api/live-sessions/${sessionId}/activity` +
    (playerId !== undefined ? `?playerId=${encodeURIComponent(playerId)}` : '')
  const req = mockRequest(url)
  const res = await GET(req as Parameters<typeof GET>[0], { params: { id: sessionId } })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

describe('GET /api/live-sessions/[id]/activity', () => {
  beforeEach(() => {
    mockResolveSessionUser.mockReset()
    mockResolveSessionUser.mockResolvedValue(null)
  })

  it('serves the private game to a joined player of the session', async () => {
    const { status, data } = await getActivity(SESSION_ID, PLAYER_ID)
    expect(status).toBe(200)
    expect(data.activity.id).toBe('act-private')
  })

  it('refuses a playerId that is not a player of this session', async () => {
    const { status } = await getActivity(SESSION_ID, WRONG_PLAYER_ID)
    expect(status).toBe(404)
  })

  it('refuses a malformed playerId', async () => {
    const { status } = await getActivity(SESSION_ID, 'not-a-uuid')
    expect(status).toBe(404)
  })

  it('refuses a signed-out caller with no playerId', async () => {
    const { status } = await getActivity(SESSION_ID)
    expect(status).toBe(404)
  })

  it('serves the game to its signed-in owner without a playerId', async () => {
    mockResolveSessionUser.mockResolvedValue({ userId: 'teacher-1' })
    const { status, data } = await getActivity(SESSION_ID)
    expect(status).toBe(200)
    expect(data.activity.id).toBe('act-private')
  })

  it('refuses a signed-in non-owner with no playerId', async () => {
    mockResolveSessionUser.mockResolvedValue({ userId: 'someone-else' })
    const { status } = await getActivity(SESSION_ID)
    expect(status).toBe(404)
  })

  it('treats a throwing session resolver as signed out', async () => {
    mockResolveSessionUser.mockRejectedValueOnce(new Error('boom'))
    const { status } = await getActivity(SESSION_ID)
    expect(status).toBe(404)
  })

  it('refuses an unknown session id', async () => {
    const { status } = await getActivity(UNKNOWN_SESSION_ID, PLAYER_ID)
    expect(status).toBe(404)
  })

  it('serves a public game through the session path too', async () => {
    const { status, data } = await getActivity(SESSION_PUBLIC_ID)
    expect(status).toBe(200)
    expect(data.activity.id).toBe('act-public')
  })
})
