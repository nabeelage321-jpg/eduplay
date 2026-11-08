/**
 * Live Game Rooms — homepage section helpers (2026-11-08, owner order).
 *
 * The homepage "Live Game Rooms" section offers the two live actions
 * without rebuilding any of the live flow: Host goes to /{locale}/live
 * in host mode; Join goes to /{locale}/live in join mode with the
 * 6-letter room code prefilled. The live page reads these from the
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
 * Validate a room-code query value: room codes are 6 letters.
 * Returns the uppercased code, or null when it is not a 6-letter code.
 */
export function parseLiveCode(value: string | string[] | undefined | null): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toUpperCase()
  return /^[A-Z]{6}$/.test(code) ? code : null
}
