import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const grade = searchParams.get('grade')
    const subject = searchParams.get('subject')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    const supabase = createServerClient()

    let query = supabase
      .from('activities')
      .select('id, title, description, type, subject, grade, language, curriculum, is_public, play_count, created_at')
      .eq('is_public', true)

    if (grade) {
      query = query.eq('grade', grade.toLowerCase())
    }

    if (subject) {
      query = query.eq('subject', subject)
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        error: error.message,
        success: false,
        data: []
      }, { status: 500 })
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      success: true,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        success: false,
        data: []
      },
      { status: 500 }
    )
  }
}
