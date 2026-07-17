// src/app/api/sessions/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { GameSessionResult } from '@/lib/game/modes/types';

/**
 * POST /api/sessions
 * Create a new game session
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { activityId, mode, teacherId, roomCode } = body;

    // Validate required fields
    if (!activityId || !mode || !teacherId || !roomCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production, save to Supabase
    // const session = await supabase
    //   .from('game_sessions')
    //   .insert([{ activity_id: activityId, mode, teacher_id: teacherId, room_code: roomCode }])
    //   .select()
    //   .single()

    // Placeholder response
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    return NextResponse.json(
      {
        success: true,
        sessionId,
        roomCode,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] POST /api/sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions
 * List user's game sessions
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');
    const limit = searchParams.get('limit') || '10';

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacherId required' },
        { status: 400 }
      );
    }

    // In production, query from Supabase
    // const { data: sessions } = await supabase
    //   .from('game_sessions')
    //   .select()
    //   .eq('teacher_id', teacherId)
    //   .order('created_at', { ascending: false })
    //   .limit(parseInt(limit))

    return NextResponse.json(
      {
        success: true,
        sessions: [],
        total: 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] GET /api/sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
