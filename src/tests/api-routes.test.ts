import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: mockActivities, error: null, count: 2 }),
            }),
            single: () => Promise.resolve({ data: mockActivities[0], error: null }),
          }),
          ilike: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: mockActivities, error: null, count: 2 }),
            }),
          }),
          order: () => ({
            range: () => Promise.resolve({ data: mockActivities, error: null, count: 2 }),
          }),
          single: () => Promise.resolve({ data: mockActivities[0], error: null }),
        }),
        order: () => ({
          range: () => Promise.resolve({ data: mockActivities, error: null, count: 2 }),
        }),
        single: () => Promise.resolve({ data: mockActivities[0], error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: mockActivities[0], error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: mockActivities[0], error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: mockUser }, error: null }),
    },
    rpc: () => Promise.resolve({ error: null }),
  }),
}))

const mockUser = { id: 'user-123', email: 'teacher@test.com' }

const mockActivities = [
  {
    id: 'act-1',
    title: 'Test Quiz',
    description: 'A test quiz',
    type_id: 'quiz',
    locale: 'en',
    teacher_id: 'user-123',
    subject_id: 'Mathematics',
    grade_id: 'Grade 5',
    is_public: true,
    items: [{ prompt: 'Q1', answer: 'A1' }, { prompt: 'Q2', answer: 'A2' }],
    tags: ['math'],
    play_count: 42,
    like_count: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'act-2',
    title: 'Urdu Flashcards',
    type_id: 'flashcards',
    locale: 'ur',
    teacher_id: 'user-456',
    is_public: true,
    items: [{ prompt: 'کتاب', answer: 'Book' }, { prompt: 'قلم', answer: 'Pen' }],
    tags: [],
    play_count: 10,
    like_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// Helper to create mock NextRequest
function mockRequest(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  }) as Request
}

describe('GET /api/activities', () => {
  it('returns activities list', async () => {
    const { GET } = await import('@/app/api/activities/route')
    const req = mockRequest('GET', 'http://localhost:3000/api/activities')
    const res = await GET(req as Parameters<typeof GET>[0])
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('activities')
    expect(data).toHaveProperty('pagination')
    expect(Array.isArray(data.activities)).toBe(true)
  })

  it('defaults to a 500-item page size when no limit is supplied', async () => {
    const { GET } = await import('@/app/api/activities/route')
    const req = mockRequest('GET', 'http://localhost:3000/api/activities')
    const res = await GET(req as Parameters<typeof GET>[0])
    const data = await res.json()
    expect(data.pagination.limit).toBe(500)
  })

  it('includes pagination info', async () => {
    const { GET } = await import('@/app/api/activities/route')
    const req = mockRequest('GET', 'http://localhost:3000/api/activities?page=1&limit=10')
    const res = await GET(req as Parameters<typeof GET>[0])
    const data = await res.json()
    expect(data.pagination).toHaveProperty('page')
    expect(data.pagination).toHaveProperty('total')
    expect(data.pagination).toHaveProperty('pages')
  })
})

describe('POST /api/activities', () => {
  it('creates an activity when authenticated', async () => {
    const { POST } = await import('@/app/api/activities/route')
    const body = {
      title: 'New Quiz',
      type_id: 'quiz',
      locale: 'en',
      subject_id: 'Science',
      grade_id: 'Grade 3',
      items: [
        { prompt: 'Q1', answer: 'A1' },
        { prompt: 'Q2', answer: 'A2' },
      ],
      is_public: true,
      tags: ['science'],
    }
    const req = mockRequest('POST', 'http://localhost:3000/api/activities', body)
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data).toHaveProperty('activity')
  })

  it('rejects missing title', async () => {
    const { POST } = await import('@/app/api/activities/route')
    const body = {
      type_id: 'quiz',
      items: [{ prompt: 'Q1', answer: 'A1' }, { prompt: 'Q2', answer: 'A2' }],
    }
    const req = mockRequest('POST', 'http://localhost:3000/api/activities', body)
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Title')
  })

  it('rejects fewer than 2 items', async () => {
    const { POST } = await import('@/app/api/activities/route')
    const body = {
      title: 'Short Quiz',
      type_id: 'quiz',
      items: [{ prompt: 'Q1', answer: 'A1' }],
    }
    const req = mockRequest('POST', 'http://localhost:3000/api/activities', body)
    const res = await POST(req as Parameters<typeof POST>[0])
    expect(res.status).toBe(400)
  })
})

describe('GET /api/activities/[id]', () => {
  it('returns single activity', async () => {
    const { GET } = await import('@/app/api/activities/[id]/route')
    const req = mockRequest('GET', 'http://localhost:3000/api/activities/act-1')
    const res = await GET(req as Parameters<typeof GET>[0], { params: { id: 'act-1' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('activity')
  })
})

describe('PUT /api/activities/[id]', () => {
  it('updates activity when owner', async () => {
    const { PUT } = await import('@/app/api/activities/[id]/route')
    const req = mockRequest('PUT', 'http://localhost:3000/api/activities/act-1', {
      title: 'Updated Title',
    })
    const res = await PUT(req as Parameters<typeof PUT>[0], { params: { id: 'act-1' } })
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/activities/[id]', () => {
  it('deletes activity when owner', async () => {
    const { DELETE } = await import('@/app/api/activities/[id]/route')
    const req = mockRequest('DELETE', 'http://localhost:3000/api/activities/act-1')
    const res = await DELETE(req as Parameters<typeof DELETE>[0], { params: { id: 'act-1' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})

describe('POST /api/activities/[id]/play', () => {
  it('increments play count', async () => {
    const { POST } = await import('@/app/api/activities/[id]/play/route')
    const req = mockRequest('POST', 'http://localhost:3000/api/activities/act-1/play')
    const res = await POST(req as Parameters<typeof POST>[0], { params: { id: 'act-1' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})

describe('Input sanitization', () => {
  it('sanitize strips script tags', () => {
    function sanitize(str: unknown): string {
      if (typeof str !== 'string') return ''
      return str.replace(/<script[^>]*>.*?<\/script>/gi, '').trim().slice(0, 2000)
    }
    expect(sanitize('<script>alert("xss")</script>Hello')).toBe('Hello')
    expect(sanitize('Normal text')).toBe('Normal text')
    expect(sanitize(null)).toBe('')
  })
})
