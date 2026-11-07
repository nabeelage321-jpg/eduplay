import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { aggregateThemeRequests, cleanThemeName } from '@/lib/theme-requests'

// ─── Theme requests (build-list final 6, item 9, 2026-11-07) ─────────────
// Signed-in users ask the EduPlay team for a theme under the 15 kids
// worlds. Requests go TO THE TEAM — never user-to-user chat.
// GET  — signed in: top requested themes with counts + the 100-request
//         flag (see src/lib/theme-requests.ts). Signed out: 401.
// POST — signed in: one request per user per theme name (DB unique
//         guard). A repeat request answers alreadyRequested, not an
//         error. Before migration 009 the table does not exist: GET
//         answers an empty list with setupReady:false; POST answers
//         503 with a plain message.

function isMissingTable(message: string | null | undefined): boolean {
  return /could not find the table|relation .* does not exist|schema cache/i.test(message ?? '')
}

export async function GET() {
  try {
    const sessionUser = await resolveSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!sessionUser.userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('theme_requests')
      .select('theme_name, user_id')
      .order('created_at', { ascending: true })
    if (error) {
      if (isMissingTable(error.message)) {
        return NextResponse.json({ requests: [], setupReady: false })
      }
      throw error
    }
    return NextResponse.json({
      requests: aggregateThemeRequests((data ?? []) as { theme_name: string; user_id: string }[]),
      setupReady: true,
    })
  } catch (err) {
    console.error('[GET /api/theme-requests]', err)
    return NextResponse.json({ error: 'Failed to load theme requests' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await resolveSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!sessionUser.userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    let body: { themeName?: unknown; message?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const themeName = cleanThemeName(typeof body.themeName === 'string' ? body.themeName : null)
    if (!themeName) {
      return NextResponse.json({ error: 'Tell us the theme name (1–60 characters).' }, { status: 400 })
    }
    const message =
      typeof body.message === 'string' && body.message.trim().length > 0
        ? body.message.trim().slice(0, 500)
        : null
    const supabase = createServerClient()
    const { error } = await supabase.from('theme_requests').insert({
      user_id: sessionUser.userId,
      theme_name: themeName,
      message,
    })
    if (error) {
      if (isMissingTable(error.message)) {
        return NextResponse.json(
          { error: 'Theme requests are not set up yet. The team is still setting this up.' },
          { status: 503 },
        )
      }
      // One request per user per theme name: a repeat is not an error.
      if (/duplicate key|unique constraint/i.test(error.message)) {
        return NextResponse.json({ alreadyRequested: true, themeName })
      }
      throw error
    }
    return NextResponse.json({ requested: true, themeName })
  } catch (err) {
    console.error('[POST /api/theme-requests]', err)
    return NextResponse.json({ error: 'Failed to save your theme request' }, { status: 500 })
  }
}
