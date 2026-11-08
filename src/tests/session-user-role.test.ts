import { describe, it, expect, vi, beforeEach } from 'vitest'

// ROLE-SAVE FIX 2026-11-08. Regression tests for resolveSessionUser:
// migration 007 (users.creator_badge) was never run, while 008 already
// adds users.role. The old code selected 'id, role, creator_badge' and
// fell back to id-only on ANY error, so a saved role never showed —
// the dashboard kept offering role setup with "Student" selected even
// after Teacher was saved. The fix retries with 'id, role' first.

const mockGetServerSession = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

vi.mock('@/lib/auth/auth-options', () => ({
  authOptions: {},
}))

// The mock Supabase client answers per select-column list, so each test
// can simulate which columns exist in the live database.
let selectImpl: (columns: string) => Promise<{ data: unknown; error: unknown }>

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: () => ({
      select: (columns: string) => ({
        eq: () => ({
          single: () => selectImpl(columns),
        }),
      }),
    }),
  }),
}))

import { resolveSessionUser } from '@/lib/auth/session-user'

const SESSION = { user: { email: 'teacher@example.com' } }
const MISSING_COLUMN = { message: 'column users.creator_badge does not exist', code: '42703' }

describe('resolveSessionUser role read (migration 007 not run)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerSession.mockResolvedValue(SESSION)
  })

  it('returns the recorded role when all columns exist', async () => {
    selectImpl = async () => ({
      data: { id: 'u1', role: 'teacher', creator_badge: false },
      error: null,
    })
    const user = await resolveSessionUser()
    expect(user).toEqual({
      email: 'teacher@example.com',
      userId: 'u1',
      role: 'teacher',
      creatorBadge: false,
    })
  })

  it('still returns the saved role when creator_badge is missing (007 not run)', async () => {
    selectImpl = async (columns: string) => {
      if (columns.includes('creator_badge')) {
        return { data: null, error: MISSING_COLUMN }
      }
      return { data: { id: 'u1', role: 'teacher' }, error: null }
    }
    const user = await resolveSessionUser()
    expect(user?.role).toBe('teacher')
    expect(user?.userId).toBe('u1')
    expect(user?.creatorBadge).toBe(false)
  })

  it('returns null role only when the role column itself is missing too', async () => {
    selectImpl = async (columns: string) => {
      if (columns === 'id') {
        return { data: { id: 'u1' }, error: null }
      }
      return { data: null, error: { message: 'column does not exist', code: '42703' } }
    }
    const user = await resolveSessionUser()
    expect(user?.userId).toBe('u1')
    expect(user?.role).toBeNull()
  })

  it('returns null when there is no signed-in session', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const user = await resolveSessionUser()
    expect(user).toBeNull()
  })
})
