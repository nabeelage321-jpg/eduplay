/**
 * POST /api/ai/generate-questions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { generateQuestions, moderateContent } from '@/lib/ai/claude'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, is_premium')
    .eq('email', session.user.email)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  let body: {
    topic: string
    count: number
    difficulty: 'easy' | 'medium' | 'hard'
    locale: string
  }

  try {
    const raw = await request.json()
    const topic = String(raw.topic ?? '').trim()
    if (!topic || topic.length < 2 || topic.length > 200) throw new Error('Invalid topic')

    const count = Number(raw.count ?? 5)
    if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error('count must be 1–20')

    const validDifficulties = ['easy', 'medium', 'hard']
    const difficulty = String(raw.difficulty ?? 'medium') as 'easy' | 'medium' | 'hard'
    if (!validDifficulties.includes(difficulty)) throw new Error('Invalid difficulty')

    const validLocales = ['en','ur','ar','hi','es','fr','bn','pt','ru','id','zh']
    const locale = String(raw.locale ?? 'en')
    if (!validLocales.includes(locale)) throw new Error('Invalid locale')

    body = { topic, count, difficulty, locale }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid input' },
      { status: 400 }
    )
  }

  const moderation = await moderateContent(body.topic)
  if (!moderation.safe) {
    return NextResponse.json(
      { error: `Topic rejected: ${moderation.reason}` },
      { status: 422 }
    )
  }

  try {
    const result = await generateQuestions({
      ...body,
      isPremium: user.is_premium,
    })

    return NextResponse.json({ questions: result.questions })
  } catch (err) {
    console.error('[AI generate-questions]', err)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 503 })
  }
}
