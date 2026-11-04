// ─── Kids social approval gate + Kid Creator badge (display only) ───────
// APPROVAL BATCH 2026-10-30 (teacher/parent gate) SUPERSEDED 2026-11-04
// by the agreed kids social model (see src/lib/social-approval.ts):
//   * The gate applies to KIDS ONLY (recorded role 'student'). A kid's
//     game stays private and pending until 3 testers approve it, then
//     it goes public automatically. Teachers, parents and creators
//     bypass the gate entirely.
//   * The Creator badge (15 approved games) is ACHIEVEMENT DISPLAY
//     ONLY. It never gates anything: a student with the badge still
//     needs 3 test approvals on every new game. The old rule ("a badge
//     holder may publish without per-game approval") is REMOVED —
//     needsApproval() no longer takes a badge argument at all, so no
//     call site can reintroduce the bypass by accident.
//   * Teachers/parents may REMOVE a bad item AFTER it is live (see
//     /api/activities/[id]/remove). They do NOT approve games any
//     more: the old /approve route answers 410 Gone.
//   * Roles in code: UserRole = 'teacher' | 'student' | 'parent' | 'admin'
//     (src/types/index.ts). There is NO 'kid'/'child' role in code —
//     'student' IS the kid-creator role for this gate.
//   * users.role arrives with migration 008 (the 007 file was never
//     run, and must not be run — 008 covers the columns it would have
//     added, minus the stored creator_badge column, which the display
//     -only badge does not need). A user with NO recorded role (NULL)
//     is treated as a non-student, so existing teacher games do not
//     change. The gate only fires once a role is recorded.

/** Approved games a student needs before the Creator badge is earned. */
export const APPROVED_GAMES_FOR_CREATOR_BADGE = 15

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

/** Roles allowed to approve/reject games and revoke a Creator badge. */
export function isApproverRole(role: string | null | undefined): boolean {
  return role === 'teacher' || role === 'parent'
}

export function isStudentRole(role: string | null | undefined): boolean {
  return role === 'student'
}

/**
 * True when this creator's new games must wait for approval.
 * SOCIAL APPROVAL 2026-11-04: the badge NEVER bypasses the gate, so
 * this takes no badge argument — a student is gated, full stop.
 */
export function needsApproval(role: string | null | undefined): boolean {
  return isStudentRole(role)
}

export function approvalLabel(status: string | null | undefined): string {
  if (status === 'pending') return 'Pending — waiting for teacher/parent approval'
  if (status === 'rejected') return 'Rejected — edit it to resubmit for approval'
  return 'Approved'
}
