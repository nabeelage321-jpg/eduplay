import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { LEADERBOARD_CACHE } from '@/lib/http-cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// GET top 10 scores for an activity
async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const activityId = searchParams.get('activity_id')

    if (!activityId) {
      return NextResponse.json({ error: 'Missing activity_id parameter' }, { status: 400 })
    }

    // Fetch top 10 scores for this activity, ordered by score DESC
    const { data, error } = await supabase
      .from('leaderboard')
      .select('player_name, score, correct_answers, time_taken')
      .eq('activity_id', activityId)
      .order('score', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // CDN CACHE 2026-11-10: public Top-10 read, no user-specific
    // data. The window is short (60s) on purpose — scores move
    // whenever a kid finishes a game and live rooms watch them.
    // Errors are never cached.
    return NextResponse.json({ data, success: true }, { headers: { 'Cache-Control': LEADERBOARD_CACHE } })
  } catch (error) {
    console.error('Error in leaderboard GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST new score to leaderboard
async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { activity_id, player_name, score, correct_answers, time_taken } = body

    // Validate required fields
    if (!activity_id || !player_name || score === undefined || correct_answers === undefined || time_taken === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: activity_id, player_name, score, correct_answers, time_taken' },
        { status: 400 }
      )
    }

    // Insert new score
    const { data, error } = await supabase
      .from('leaderboard')
      .insert([
        {
          activity_id,
          player_name,
          score,
          correct_answers,
          time_taken,
        },
      ])
      .select()

    if (error) {
      console.error('Error inserting leaderboard entry:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, success: true }, { status: 201 })
  } catch (error) {
    console.error('Error in leaderboard POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export { GET, POST }
