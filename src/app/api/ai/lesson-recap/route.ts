/**
 * POST /api/ai/lesson-recap
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { generateLessonRecap } from '@/lib/ai/claude'
import { createServerClient } from '@/lib/supabase/server'
import type { SessionResult } from '@/lib/ai/claude'

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, is_premium, locale')
    .eq('email', session.user.email)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  let sessionId: string
  let results: SessionResult[]
  let locale: string

  try {
    const raw = await request.json()
    sessionId = String(raw.sessionId ?? '').trim()
    if (!sessionId) throw new Error('sessionId required')

    locale = String(raw.locale ?? user.locale ?? 'en')
    results = Array.isArray(raw.results) ? raw.results.slice(0, 100) : []
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid input' },
      { status: 400 }
    )
  }

  try {
    const result = await generateLessonRecap({
      sessionId,
      results,
      locale,
      isPremium: user.is_premium,
    })
    return NextResponse.json({ recap: result.recap })
  } catch (err) {
    console.error('[AI lesson-recap]', err)
    return NextResponse.json({ error: 'Failed to generate recap' }, { status: 503 })
  }
}
