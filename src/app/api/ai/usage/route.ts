/**
 * GET /api/ai/usage
 * Returns today's generation count and limits for the current user.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { createServerClient } from '@/lib/supabase/server'

const FREE_DAILY_LIMIT = 10

export async function GET() {
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

  const today = new Date().toISOString().split('T')[0]
  const { count } = await supabase
    .from('ai_generations')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', user.id)
    .gte('created_at', `${today}T00:00:00.000Z`)

  const todayCount = count ?? 0
  const dailyLimit = user.is_premium ? null : FREE_DAILY_LIMIT
  const remaining = user.is_premium ? null : Math.max(0, FREE_DAILY_LIMIT - todayCount)

  return NextResponse.json({
    todayCount,
    dailyLimit,
    remaining,
    isPremium: user.is_premium,
  })
}
