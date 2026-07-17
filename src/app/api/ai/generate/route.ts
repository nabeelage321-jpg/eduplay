/**
 * POST /api/ai/generate-activity
 * Requires auth. Enforces daily generation limits.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { generateActivity, moderateContent } from '@/lib/ai/claude'
import { createServerClient } from '@/lib/supabase/server'

const FREE_DAILY_LIMIT = 10

// ─── Rate limiting helpers ─────────────────────────────────────────────────────

async function getDailyUsage(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { count, error } = await supabase
    .from('ai_generations')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', userId)
    .gte('created_at', `${today}T00:00:00.000Z`)

  if (error) return 0
  return count ?? 0
}

async function recordGeneration(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  prompt: string,
  result: unknown,
  model: string,
  tokensUsed: number
) {
  await supabase.from('ai_generations').insert({
    teacher_id: userId,
    prompt: prompt.slice(0, 1000),
    result: JSON.stringify(result).slice(0, 5000),
    model,
    tokens_used: tokensUsed,
    created_at: new Date().toISOString(),
  })
}

// ─── Input validation ──────────────────────────────────────────────────────────

interface GenerateActivityBody {
  topic: string
  activityType: string
  itemCount: number
  locale: string
  grade: string
  curriculum?: string
}

function validateBody(body: unknown): GenerateActivityBody {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid request body')
  }
  const b = body as Record<string, unknown>

  const topic = String(b.topic ?? '').trim()
  if (!topic || topic.length < 2 || topic.length > 200) {
    throw new Error('topic must be 2–200 characters')
  }

  const activityType = String(b.activityType ?? '').trim()
  const validTypes = [
    'quiz','match-up','anagram','crossword','wordsearch','spin-wheel',
    'balloon-pop','whack-a-mole','true-false','categorize','order',
    'fill-blank','labelled-diagram','flashcards','missing-word','unjumble',
    'gameshow-quiz','hangman','random-wheel','open-box',
  ]
  if (!validTypes.includes(activityType)) {
    throw new Error(`Invalid activityType: ${activityType}`)
  }

  const itemCount = Number(b.itemCount ?? 10)
  if (!Number.isInteger(itemCount) || itemCount < 2 || itemCount > 30) {
    throw new Error('itemCount must be an integer between 2 and 30')
  }

  const locale = String(b.locale ?? 'en').trim()
  const validLocales = ['en','ur','ar','hi','es','fr','bn','pt','ru','id','zh']
  if (!validLocales.includes(locale)) {
    throw new Error(`Invalid locale: ${locale}`)
  }

  const grade = String(b.grade ?? '').trim()
  if (!grade) throw new Error('grade is required')

  return {
    topic,
    activityType,
    itemCount,
    locale,
    grade,
    curriculum: b.curriculum ? String(b.curriculum).trim().slice(0, 100) : undefined,
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Auth
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // 2. Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, is_premium')
    .eq('email', session.user.email)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 3. Check daily limit for free users
  if (!user.is_premium) {
    const todayCount = await getDailyUsage(supabase, user.id)
    if (todayCount >= FREE_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error: 'Daily limit reached',
          code: 'LIMIT_REACHED',
          todayCount,
          dailyLimit: FREE_DAILY_LIMIT,
        },
        { status: 429 }
      )
    }
  }

  // 4. Validate input
  let body: GenerateActivityBody
  try {
    const raw = await request.json()
    body = validateBody(raw)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid input' },
      { status: 400 }
    )
  }

  // 5. Moderate topic before sending to AI
  const moderation = await moderateContent(body.topic)
  if (!moderation.safe) {
    return NextResponse.json(
      { error: `Topic rejected: ${moderation.reason ?? 'unsafe content'}` },
      { status: 422 }
    )
  }

  // 6. Generate
  let result: Awaited<ReturnType<typeof generateActivity>>
  try {
    result = await generateActivity({
      topic: body.topic,
      type: body.activityType,
      count: body.itemCount,
      locale: body.locale,
      grade: body.grade,
      curriculum: body.curriculum,
      isPremium: user.is_premium,
    })
  } catch (err) {
    console.error('[AI generate-activity]', err)
    return NextResponse.json(
      { error: 'AI generation failed. Please try again.' },
      { status: 503 }
    )
  }

  // 7. Record usage (non-blocking)
  void recordGeneration(
    supabase,
    user.id,
    body.topic,
    result.items,
    result.cost.model,
    result.cost.inputTokens + result.cost.outputTokens
  )

  return NextResponse.json({
    items: result.items,
    tokensUsed: result.cost.inputTokens + result.cost.outputTokens,
  })
}
