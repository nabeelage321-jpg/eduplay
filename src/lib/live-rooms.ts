/**
 * Live Game Rooms — homepage section helpers (2026-11-08, owner order).
 *
 * The homepage "Live Game Rooms" section offers the two live actions
 * without rebuilding any of the live flow: Host goes to /{locale}/live
 * in host mode; Join goes to /{locale}/live in join mode with the
 * 6-character room code prefilled. The live page reads these from the
 * query string (LiveSessionRoom takes them as initial state only —
 * no params means exactly the old behaviour: host mode, empty code).
 * No session logic lives here, no API calls, no sign-in needed to
 * see the section; hosting itself keeps its existing sign-in
 * behaviour on the live page.
 */

/** `/{locale}/live` in host mode. */
export function liveHostHref(locale: string): string {
  return `/${locale}/live?mode=host`
}

/** `/{locale}/live` in join mode, with the room code prefilled when valid. */
export function liveJoinHref(locale: string, code: string): string {
  const parsed = parseLiveCode(code)
  return parsed
    ? `/${locale}/live?mode=join&code=${parsed}`
    : `/${locale}/live?mode=join`
}

/** Validate a `mode` query value: only 'host' / 'join' pass through. */
export function parseLiveMode(value: string | string[] | undefined | null): 'host' | 'join' | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  return v === 'host' || v === 'join' ? v : null
}

/**
 * Validate a room-code query value: room codes are 6 characters —
 * letters AND digits (base36: the generator uses A–Z without I/O
 * plus 2–9, so a real code like X46CCV has digits in it). Returns
 * the uppercased code, or null when it is not a 6-character code.
 * (2026-11-09: the old /^[A-Z]{6}$/ rejected every code with a
 * digit, so the code could never even be typed on the homepage.)
 */
export function parseLiveCode(value: string | string[] | undefined | null): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toUpperCase()
  return /^[A-Z0-9]{6}$/.test(code) ? code : null
}

// JOIN FIX 2026-11-09: the play URL a joined player navigates to
// after joining by room code. It must carry the session + player
// proof (?session=&player=) the join call issued — the play page
// uses those to load the game through the session-scoped endpoint
// (GET /api/live-sessions/[id]/activity), which serves a hosted
// PRIVATE game only to a joined player of that session (or the
// owner). The old ?roomCode= URL made the play page fall back to
// the general route, which 404s a private game for anyone but its
// owner — so a joiner landed on "Activity Not Found" (owner defect
// 2026-11-09, room X46CCV). Returns null when either id is missing
// or not a UUID — the caller must then stay on the join page with
// an error instead of navigating to a guaranteed 404. The endpoint
// itself only honours UUID player ids, so a non-UUID here would
// 404 there too.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `/{locale}/activity/{activityId}/play` for a joined session player, or null. */
export function sessionPlayHref(
  locale: string,
  activityId: string,
  sessionId: unknown,
  playerId: unknown,
): string | null {
  if (typeof sessionId !== 'string' || typeof playerId !== 'string') return null
  const session = sessionId.trim()
  const player = playerId.trim()
  if (!activityId.trim() || !UUID_RE.test(session) || !UUID_RE.test(player)) return null
  return `/${locale}/activity/${activityId.trim()}/play?session=${encodeURIComponent(session)}&player=${encodeURIComponent(player)}`
}
