import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { resolveSessionUser } from '@/lib/auth/session-user'
import {
  TEST_APPROVALS_REQUIRED,
  normalizeDeviceKey,
  normalizeTesterNickname,
  shouldPublish,
} from '@/lib/social-approval'

// ─── Kids social approval: test approvals (2026-11-04) ───────────────────
// GET  /api/activities/[id]/test-approve — public. Returns the approval
//      state for the test view: status, count, tester nicknames (only),
//      and whether the creator is a gated student. Nicknames only — no
//      personal data is ever returned here.
// POST /api/activities/[id]/test-approve — public (no sign-in required).
//      Body: { nickname, deviceKey }. One approval per device key and
//      one per nickname (case-insensitive) per game, server-enforced by
//      the unique (game_id, tester_device_key) constraint plus the
//      nickname check below. At 3 approvals the game goes public
//      automatically. A signed-in teacher/parent approving through this
//      route counts as ONE approval, never a solo unlock; the creator
//      can never approve their own game.
// Before migration 008 the table does not exist: GET answers
// setupReady:false and POST answers 503 with a plain message — kid
// games stay private (the safe default) and nothing is faked.

const SETUP_MESSAGE =
  'Social approval is not set up yet (migration 008 has not been run). Ask the owner to run it — until then this game stays private.'

function isMissingTable(message: string | null | undefined): boolean {
  return /could not find the table|relation .* does not exist|schema cache/i.test(message ?? '')
}

async function readGame(supabase: ReturnType<typeof createServerClient>, id: string) {
  const { data, error } = await supabase
    .from('activities')
    .select('id, teacher_id, approval_status, is_public')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as {
    id: string
    teacher_id: string | null
    approval_status: string | null
    is_public: boolean | null
  }
}

async function readApprovals(supabase: ReturnType<typeof createServerClient>, gameId: string) {
  const { data, error } = await supabase
    .from('game_test_approvals')
    .select('tester_nickname, tester_device_key')
    .eq('game_id', gameId)
    .order('created_at', { ascending: true })
  if (error) return { rows: null as null | Array<{ tester_nickname: string; tester_device_key: string }>, missing: isMissingTable(error.message) }
  return { rows: (data ?? []) as Array<{ tester_nickname: string; tester_device_key: string }>, missing: false }
}

async function readCreatorIsStudent(supabase: ReturnType<typeof createServerClient>, teacherId: string | null) {
  if (!teacherId) return { isStudent: false, missing: false }
  const { data, error } = await supabase.from('users').select('role').eq('id', teacherId).single()
  if (error) return { isStudent: false, missing: /role/i.test(error.message ?? '') }
  return { isStudent: (data as { role?: string | null }).role === 'student', missing: false }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createServerClient()
    const game = await readGame(supabase, params.id)
    if (!game) return NextResponse.json({ error: 'Activity not found' }, { status: 404 })

    const approvals = await readApprovals(supabase, params.id)
    if (approvals.missing || approvals.rows === null) {
      return NextResponse.json({
        setupReady: false,
        message: SETUP_MESSAGE,
        approvalStatus: game.approval_status,
        isPublic: game.is_public === true,
        approvalCount: 0,
        required: TEST_APPROVALS_REQUIRED,
        testers: [],
        creatorIsStudent: false,
      })
    }
    const creator = await readCreatorIsStudent(supabase, game.teacher_id)
    return NextResponse.json({
      setupReady: true,
      approvalStatus: game.approval_status,
      isPublic: game.is_public === true,
      approvalCount: approvals.rows.length,
      required: TEST_APPROVALS_REQUIRED,
      testers: approvals.rows.map((r) => r.tester_nickname),
      creatorIsStudent: creator.isStudent,
    })
  } catch (err) {
    console.error('[GET /api/activities/[id]/test-approve]', err)
    return NextResponse.json({ error: 'Failed to load approval status' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json().catch(() => ({}))
    const nickname = normalizeTesterNickname(body.nickname)
    const deviceKey = normalizeDeviceKey(body.deviceKey)
    if (!nickname) {
      return NextResponse.json({ error: 'A nickname is required (up to 20 characters).' }, { status: 400 })
    }
    if (!deviceKey) {
      return NextResponse.json({ error: 'A device key is required.' }, { status: 400 })
    }

    const supabase = createServerClient()
    const game = await readGame(supabase, params.id)
    if (!game) return NextResponse.json({ error: 'Activity not found' }, { status: 404 })

    // Setup check first: without the table there is nowhere to record.
    const approvals = await readApprovals(supabase, params.id)
    if (approvals.missing || approvals.rows === null) {
      return NextResponse.json({ error: SETUP_MESSAGE }, { status: 503 })
    }

    // Only pending kid games accept test approvals.
    if (game.approval_status !== 'pending') {
      if (game.approval_status === 'approved' && game.is_public === true) {
        return NextResponse.json({ error: 'This game is already public.' }, { status: 400 })
      }
      if (game.approval_status === 'rejected') {
        return NextResponse.json(
          { error: 'This game is not open for testing. Its creator can edit it to resubmit it.' },
          { status: 400 },
        )
      }
      return NextResponse.json({ error: 'This game does not need test approval.' }, { status: 400 })
    }
    const creator = await readCreatorIsStudent(supabase, game.teacher_id)
    if (creator.missing) {
      return NextResponse.json({ error: SETUP_MESSAGE }, { status: 503 })
    }
    if (!creator.isStudent) {
      return NextResponse.json(
        { error: 'This game does not need test approval — teachers, parents and creators publish directly.' },
        { status: 400 },
      )
    }

    // Optional session: a signed-in approver is recorded, but counts
    // exactly like any other tester. The creator can never approve
    // their own game, signed in or not.
    let approverUserId: string | null = null
    let approverRole: string | null = null
    try {
      const sessionUser = await resolveSessionUser()
      if (sessionUser?.userId) {
        if (sessionUser.userId === game.teacher_id) {
          return NextResponse.json({ error: 'You cannot approve your own game.' }, { status: 403 })
        }
        approverUserId = sessionUser.userId
        approverRole = sessionUser.role
      }
    } catch {
      // No session — anonymous tester approval, as designed.
    }

    // Duplicate guards: same device, or same nickname (case-insensitive).
    for (const row of approvals.rows) {
      if (row.tester_device_key === deviceKey) {
        return NextResponse.json({ error: 'This device has already approved this game.' }, { status: 409 })
      }
      if (row.tester_nickname.trim().toLowerCase() === nickname.toLowerCase()) {
        return NextResponse.json({ error: 'This nickname has already approved this game.' }, { status: 409 })
      }
    }

    const { error: insertError } = await supabase.from('game_test_approvals').insert({
      game_id: params.id,
      tester_nickname: nickname,
      tester_device_key: deviceKey,
      approver_user_id: approverUserId,
      approver_role: approverRole,
    })
    if (insertError) {
      if (/duplicate key|unique/i.test(insertError.message ?? '')) {
        return NextResponse.json({ error: 'This device has already approved this game.' }, { status: 409 })
      }
      if (isMissingTable(insertError.message)) {
        return NextResponse.json({ error: SETUP_MESSAGE }, { status: 503 })
      }
      throw insertError
    }

    const after = await readApprovals(supabase, params.id)
    const count = after.rows ? after.rows.length : approvals.rows.length + 1
    const published = shouldPublish(count)

    if (published) {
      const { error: publishError } = await supabase
        .from('activities')
        .update({
          approval_status: 'approved',
          is_public: true,
          approved_at: new Date().toISOString(),
          approved_by: null,
        })
        .eq('id', params.id)
      if (publishError) throw publishError
    }

    return NextResponse.json({
      approvalCount: count,
      required: TEST_APPROVALS_REQUIRED,
      published,
      testers: (after.rows ?? []).map((r) => r.tester_nickname),
    })
  } catch (err) {
    console.error('[POST /api/activities/[id]/test-approve]', err)
    return NextResponse.json({ error: 'Failed to record approval' }, { status: 500 })
  }
}
