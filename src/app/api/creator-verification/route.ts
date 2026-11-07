import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import {
  cleanProfileUrl,
  isVerificationPlatform,
  type CreatorVerificationStatus,
} from '@/lib/creator-verification'

// ─── Social-creator verification (build-list final 6, item 13, 2026-11-07)
// Two creator types, handled separately: KIDS (role 'student') make
// games for their friends only and NEVER get the social editor — POST
// answers 403 for them. A social media creator submits the social
// profile/post URL carrying our website link; status is 'pending'
// until the TEAM verifies it by hand (SQL, see migration 010), then
// 'verified' opens the editor tab. Submitting a new link while
// verified sends the creator back to 'pending' until the new link is
// verified. Before migration 010 the table does not exist: GET
// answers setupReady:false; POST answers 503 with a plain message.
// GET  — signed in: own verification row (or status 'none').
// POST — signed in, non-kid: submit (or re-submit) a link for review.

function isMissingTable(message: string | null | undefined): boolean {
  return /could not find the table|relation .* does not exist|schema cache/i.test(message ?? '')
}

export async function GET() {
  try {
    const sessionUser = await resolveSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ signedIn: false, role: null, status: 'none', setupReady: true })
    }
    if (!sessionUser.userId) {
      return NextResponse.json({
        signedIn: true,
        role: sessionUser.role,
        status: 'none' as CreatorVerificationStatus,
        setupReady: true,
      })
    }
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('creator_verifications')
      .select('platform, profile_url, status')
      .eq('user_id', sessionUser.userId)
      .single()
    if (error) {
      if (isMissingTable(error.message)) {
        return NextResponse.json({
          signedIn: true,
          role: sessionUser.role,
          status: 'none' as CreatorVerificationStatus,
          setupReady: false,
        })
      }
      // No row yet (PostgREST "no rows" error): not an error state.
      if (/no rows|PGRST116/i.test(error.message)) {
        return NextResponse.json({
          signedIn: true,
          role: sessionUser.role,
          status: 'none' as CreatorVerificationStatus,
          setupReady: true,
        })
      }
      throw error
    }
    return NextResponse.json({
      signedIn: true,
      role: sessionUser.role,
      status: (data?.status ?? 'none') as CreatorVerificationStatus,
      platform: data?.platform ?? null,
      profileUrl: data?.profile_url ?? null,
      setupReady: true,
    })
  } catch (err) {
    console.error('[GET /api/creator-verification]', err)
    return NextResponse.json({ error: 'Failed to load verification status' }, { status: 500 })
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
    if (sessionUser.role === 'student') {
      return NextResponse.json(
        { error: 'Kids make games for their friends — the social editor is for social media creators.' },
        { status: 403 },
      )
    }
    let body: { platform?: unknown; profileUrl?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const platform = typeof body.platform === 'string' ? body.platform : null
    if (!isVerificationPlatform(platform)) {
      return NextResponse.json({ error: 'Pick where your link is: TikTok, Instagram, YouTube, or Facebook.' }, { status: 400 })
    }
    const profileUrl = cleanProfileUrl(typeof body.profileUrl === 'string' ? body.profileUrl : null)
    if (!profileUrl) {
      return NextResponse.json({ error: 'Paste the full link to your social profile or post (starting with http).' }, { status: 400 })
    }
    const supabase = createServerClient()
    const { error } = await supabase.from('creator_verifications').upsert(
      {
        user_id: sessionUser.userId,
        platform,
        profile_url: profileUrl,
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) {
      if (isMissingTable(error.message)) {
        return NextResponse.json(
          { error: 'Creator verification is not set up yet. The team is still setting this up.' },
          { status: 503 },
        )
      }
      throw error
    }
    return NextResponse.json({ submitted: true, status: 'pending' as CreatorVerificationStatus })
  } catch (err) {
    console.error('[POST /api/creator-verification]', err)
    return NextResponse.json({ error: 'Failed to submit your link for verification' }, { status: 500 })
  }
}
