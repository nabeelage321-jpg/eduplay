// src/app/api/sessions/[id]/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { GameSessionResult } from '@/lib/game/modes/types';

/**
 * GET /api/sessions/[id]
 * Get session with all player results
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // In production, query from Supabase
    // const { data: session } = await supabase
    //   .from('game_sessions')
    //   .select(`
    //     *,
    //     game_players (*)
    //   `)
    //   .eq('id', id)
    //   .single()

    // Placeholder response
    const mockSessionResult: GameSessionResult = {
      sessionId: id,
      activityId: 'activity-123',
      mode: 'classic',
      totalPlayers: 0,
      questionsPlayed: 0,
      finalLeaderboard: [],
      playedAt: Date.now(),
      duration: 0,
    };

    return NextResponse.json(
      {
        success: true,
        session: mockSessionResult,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] GET /api/sessions/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[id]
 * Delete a session (teacher only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // In production, delete from Supabase
    // await supabase.from('game_sessions').delete().eq('id', id)

    return NextResponse.json(
      {
        success: true,
        message: 'Session deleted',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] DELETE /api/sessions/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
