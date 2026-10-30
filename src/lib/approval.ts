// ─── Teacher/parent approval gate + Kid Creator badge ─────────────────────
// APPROVAL BATCH 2026-10-30. One place for every approval rule, so the
// owner can change the badge threshold (15 → 20) by editing ONE constant.
//
// Server-enforced rules (the API routes use these; the UI never decides):
//   * A signed-in creator whose recorded users.role is 'student' and who
//     does NOT hold the Creator badge: new games are 'pending' and forced
//     private. A public toggle on a pending game is REJECTED (403), not
//     silently flipped.
//   * Only a recorded 'teacher' or 'parent' (never the creator) can
//     approve or reject, and only a teacher/parent can revoke a badge.
//   * A student who earns 15 approved games automatically gains
//     users.creator_badge. A badge holder may publish without per-game
//     approval. Revoking the badge returns them to per-game approval.
//   * Roles in code: UserRole = 'teacher' | 'student' | 'parent' | 'admin'
//     (src/types/index.ts). There is NO 'kid'/'child' role in code —
//     'student' IS the kid-creator role for this gate.
//   * users.role did not exist before migration 007 (the old RolePicker
//     was localStorage-only, display-only). A user with NO recorded role
//     (NULL) is treated as a non-student, so existing teacher games do
//     not change. The gate only fires once a role is recorded — see the
//     report for the first-setup limitation.

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

/** True when this creator's new games must wait for approval. */
export function needsApproval(
  role: string | null | undefined,
  creatorBadge: boolean | null | undefined,
): boolean {
  return isStudentRole(role) && !creatorBadge
}

export function approvalLabel(status: string | null | undefined): string {
  if (status === 'pending') return 'Pending — waiting for teacher/parent approval'
  if (status === 'rejected') return 'Rejected — edit it to resubmit for approval'
  return 'Approved'
}
