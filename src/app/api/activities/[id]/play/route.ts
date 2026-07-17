import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// POST /api/activities/[id]/play — increment play count
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()

    const { error } = await supabase.rpc('increment_play_count', { activity_id: params.id })

    // Fallback if RPC not available: manual increment
    if (error) {
      const { data: current } = await supabase
        .from('activities')
        .select('play_count')
        .eq('id', params.id)
        .single()

      await supabase
        .from('activities')
        .update({ play_count: (current?.play_count ?? 0) + 1 })
        .eq('id', params.id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/activities/[id]/play]', err)
    // Non-critical — don't fail the response
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
