// src/app/api/sessions/[id]/export/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { formatSessionResultsForExport } from '@/lib/game/utils';
import type { PlayerScore } from '@/lib/game/modes/types';

/**
 * GET /api/sessions/[id]/export
 * Download session results as CSV
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv'; // csv, json, pdf

    if (!id) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // In production, fetch from Supabase
    // const { data: session } = await supabase
    //   .from('game_sessions')
    //   .select(`
    //     *,
    //     activities (title),
    //     game_players (*)
    //   `)
    //   .eq('id', id)
    //   .single()

    // Placeholder: mock data
    const mockPlayers: PlayerScore[] = [];
    const mockActivityTitle = 'Sample Activity';

    if (format === 'csv') {
   const csv = formatSessionResultsForExport(mockPlayers, id, mockActivityTitle);

      return new NextResponse(csv as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="session-${id}-results.csv"`,
        },
      });
    }

    if (format === 'json') {
      return NextResponse.json(
        {
          sessionId: id,
          activityTitle: mockActivityTitle,
          players: mockPlayers,
          exportedAt: new Date().toISOString(),
        },
        {
          status: 200,
          headers: {
            'Content-Disposition': `attachment; filename="session-${id}-results.json"`,
          },
        }
      );
    }

    return NextResponse.json(
      { error: 'Unsupported format' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] GET /api/sessions/[id]/export error:', error);
    return NextResponse.json(
      { error: 'Failed to export session' },
      { status: 500 }
    );
  }
}
