/**
 * KIDS SOCIAL APPROVAL v1 (2026-11-04, master-list original item C).
 *
 * THE AGREED MODEL — and only this model:
 * - The 12 testers / 3 approvals gate applies to KIDS ONLY, i.e. creators
 *   whose recorded role is 'student' (the funnel maps Kid -> student).
 *   A kid's saved game stays PRIVATE and pending until 3 approvals,
 *   then it becomes public automatically.
 * - Teachers, parents and creators bypass the gate and publish on the
 *   existing save/approve routine. They never need test approvals.
 * - Teachers/parents may REMOVE a bad item AFTER it is live (it goes
 *   private again; editing it resubmits it for testing).
 * - The Creator badge (15 approved games) is ACHIEVEMENT DISPLAY ONLY.
 *   It never gates anything and never lets a kid publish without the
 *   3 test approvals. A student with 15 approved games still needs
 *   3 approvals on game 16.
 *
 * DELIBERATELY NOT RULES (proposed, never agreed by the owner):
 * - Parent-alone unlock: a parent's approval counts as ONE of the 3,
 *   never as a solo unlock.
 * - Share-count unlock: sharing a test link only spreads the link;
 *   only approvals count. "Send to 12 friends" is invitation guidance
 *   (the homepage How-it-works callout), never a gate — the gate is 3.
 *
 * STORAGE: approvals live in their own table (game_test_approvals,
 * migration 008) with a server-enforced unique (game_id, device_key)
 * guard. They are NOT stored inside the game's content JSON: PUT
 * rebuilds content from items on every edit, so content-stored
 * approvals would be clobbered, and content has no unique guard.
 * Parent links live in parent_links (migration 008). Until the owner
 * runs 008, the routes answer with a plain "not set up yet" state and
 * kid games stay private (the safe default) — nothing is faked.
 *
 * PRIVACY: nicknames only on test/approval views. No email, phone,
 * photo or full-name field anywhere in this batch.
 */

import { isStudentRole } from './approval'

/** Test approvals a pending kid game needs before it goes public. */
export const TEST_APPROVALS_REQUIRED = 3

/** Friends a kid is guided to send the test link to (guidance, NOT a gate). */
export const TESTERS_TO_INVITE = 12

/** Approved games after which the Creator badge shows (display only). */
export const CREATOR_BADGE_GAMES = 15

/** LocalStorage key for the tester's stable per-device key. */
export const TESTER_DEVICE_KEY = 'eduplay-tester-device-key'

/** LocalStorage key for the tester's last-used nickname (convenience only). */
export const TESTER_NICKNAME_KEY = 'eduplay-tester-nickname'

/** Max nickname length, matching the join-page nickname rule (20 chars). */
export const TESTER_NICKNAME_MAX = 20

/** True when this creator's games go through the social-approval gate. */
export function needsSocialApproval(role: string | null | undefined): boolean {
  return isStudentRole(role)
}

/** Normalize a tester nickname: trimmed, capped, null when empty. */
export function normalizeTesterNickname(nickname: unknown): string | null {
  if (typeof nickname !== 'string') return null
  const cleaned = nickname.trim().slice(0, TESTER_NICKNAME_MAX)
  return cleaned.length > 0 ? cleaned : null
}

/** Normalize a device key: trimmed, 1-128 chars, null otherwise. */
export function normalizeDeviceKey(deviceKey: unknown): string | null {
  if (typeof deviceKey !== 'string') return null
  const cleaned = deviceKey.trim()
  return cleaned.length >= 1 && cleaned.length <= 128 ? cleaned : null
}

/** True once the approval count reaches the publish threshold. */
export function shouldPublish(approvalCount: number): boolean {
  return approvalCount >= TEST_APPROVALS_REQUIRED
}

/** True when the Creator badge shows (display only, never a gate). */
export function hasCreatorBadgeDisplay(approvedCount: number): boolean {
  return approvedCount >= CREATOR_BADGE_GAMES
}

/** Shareable test link for a pending kid game. */
export function buildTestLink(origin: string, locale: string, gameId: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/${locale}/test/${gameId}`
}

/** Shareable parent-invite link for an invite code. */
export function buildParentLink(origin: string, locale: string, code: string): string {
  const base = origin.replace(/\/$/, '')
  return `${base}/${locale}/parent-link?code=${encodeURIComponent(code)}`
}

/**
 * In-memory approval counter used by the temporary test (and as the
 * documented rule for the route): one approval per device key, one per
 * nickname (case-insensitive) per game. Returns the new count, or null
 * when the approval is a duplicate and must be rejected.
 */
export function applyTestApproval(
  existing: Array<{ deviceKey: string; nickname: string }>,
  deviceKey: string,
  nickname: string,
): number | null {
  const key = deviceKey.trim()
  const name = nickname.trim().toLowerCase()
  for (const row of existing) {
    if (row.deviceKey === key) return null
    if (row.nickname.trim().toLowerCase() === name) return null
  }
  return existing.length + 1
}
