// ─── Activity audience rules (security batch, pre-domain-launch) ─────────
// Pure functions only — no NextAuth, no Supabase imports — so the rules
// are unit-testable without the route-handler harness (whose
// getServerSession call throws outside a request scope).
//
// Two routes enforce these rules server-side:
//   GET /api/activities/[id]            — the general route (below).
//   GET /api/activities/[id]/test-game — the intentional test path.
//   POST /api/live-sessions            — ownership via isActivityOwner.
//
// Approval-status fallback: before migration 008 the activities table
// has no approval_status column, so a row reads undefined. Existing
// rows default to 'approved' (approval batch 2026-10-30, same fallback
// as PUT /api/activities/[id]), so undefined is treated as 'approved'
// here too — never as pending, never as rejected.

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export function resolveApprovalStatus(raw: unknown): ApprovalStatus {
  if (raw === 'pending' || raw === 'rejected') return raw
  return 'approved'
}

/** True when the signed-in user is the row's owner. A row with no
 *  teacher_id (all programme games, which predate the column) has no
 *  owner, so it is never "owned" by anyone — it is served only when
 *  public, and never hostable through POST /api/live-sessions. */
export function isActivityOwner(
  teacherId: string | null | undefined,
  sessionUserId: string | null | undefined,
): boolean {
  return !!teacherId && !!sessionUserId && teacherId === sessionUserId
}

export interface GeneralAudienceInput {
  isPublic: boolean | null | undefined
  teacherId: string | null | undefined
  sessionUserId: string | null | undefined
}

/**
 * General-route rule (GET /api/activities/[id]):
 *   public game  → served to anyone, exactly as before (browse, play,
 *                  share, convert, challenge and report all depend on it).
 *   owner's game → served to its signed-in owner (owner play, detail,
 *                  edit-preview, host, print and convert-private flows).
 *   anything else non-public (a private draft, or a pending kid game)
 *   → REFUSED to non-owners, with a 404 that is indistinguishable
 *   from a missing game, so nothing leaks — not even existence, and
 *   never a question. Pending games are refused here on purpose: the
 *   test flow reaches them only through the intentional test-game
 *   path below, never through this general route.
 */
export function canServeGeneralActivity(input: GeneralAudienceInput): boolean {
  if (input.isPublic === true) return true
  return isActivityOwner(input.teacherId, input.sessionUserId)
}

export type TestGameAccess = 'serve' | 'already-public' | 'not-open' | 'not-needed'

export interface TestGameInput {
  approvalStatus: unknown
  isPublic: boolean | null | undefined
  creatorIsStudent: boolean
}

/**
 * Test-game rule (GET /api/activities/[id]/test-game), the ONLY path
 * that serves a pending kid game to an anonymous tester. The test link
 * itself is the invitation (testers have no accounts by design), so
 * holding the link is enough for a pending game — but nothing else:
 *   pending + student creator → serve (the test flow itself).
 *   pending + non-student      → not-needed (teachers/parents/creators
 *                                publish directly; no test gate).
 *   approved + public          → serve (zero new exposure: the general
 *                                route already serves public games to
 *                                anyone, and the test page's published
 *                                panel links to the public game page).
 *   rejected                   → not-open (a removed game is never
 *                                served again through any test path).
 *   anything else (approved but private, unknown state) → not-needed.
 * Private approved drafts are therefore never served by the test path
 * either: a pending game is the only non-public game it ever serves.
 */
export function testGameAccess(input: TestGameInput): TestGameAccess {
  const status = resolveApprovalStatus(input.approvalStatus)
  if (status === 'pending') {
    return input.creatorIsStudent ? 'serve' : 'not-needed'
  }
  if (status === 'approved' && input.isPublic === true) {
    return 'serve'
  }
  if (status === 'rejected') {
    return 'not-open'
  }
  return 'not-needed'
}
