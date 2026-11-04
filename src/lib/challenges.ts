/**
 * CHALLENGES v1 — link-only (2026-11-04, master list part 4).
 *
 * A Challenge is a game + a PIN + an optional group name + a deadline,
 * carried in a shareable URL — nothing more, in this version.
 *
 * HONEST LIMIT, stated here and on screen: this batch adds NO database
 * column, NO migration, and NO server persistence. A challenge link is
 * NOT stored on the server, so the deadline and group travel inside the
 * link itself, and a challenge is only joinable once the teacher has
 * started a live session with that PIN (the existing Host live game
 * flow). Server-persistent challenges — stored deadlines, stored
 * results, editing a challenge after sharing — are phase 2 and need
 * new columns plus an owner SQL run, which is deliberately NOT in
 * this batch. Nothing here invents a session, a score, or a player.
 *
 * PIN format: the SAME 6-character format the existing live-session
 * route generates (src/app/api/live-sessions/route.ts): letters and
 * digits with the easily confused characters (I, O, 0, 1) left out.
 * A challenge PIN is therefore a live-session room code by format,
 * and the public challenge view looks results up by that code through
 * the existing GET /api/live-sessions?roomCode= endpoint.
 *
 * Child safety: only nicknames ever appear in results, exactly as the
 * existing leaderboard shows. No helper here accepts, stores, or
 * displays an email, phone number, photo, or real identity.
 */

// Same alphabet as the live-session room-code generator.
export const CHALLENGE_PIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const PIN_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/

export interface ChallengeLinkData {
  gameId: string
  pin: string
  group: string | null
  /** ISO-8601 deadline, or null when the link carries none. */
  deadline: string | null
}

/** Generate a fresh PIN in the live-session room-code format. */
export function makeChallengePin(): string {
  let pin = ''
  for (let i = 0; i < 6; i++) {
    pin += CHALLENGE_PIN_ALPHABET[Math.floor(Math.random() * CHALLENGE_PIN_ALPHABET.length)]
  }
  return pin
}

/** Normalise a typed PIN: trimmed, uppercased, nothing else added. */
export function cleanChallengePin(value: string): string {
  return String(value ?? '').trim().toUpperCase()
}

/** True only for exactly 6 characters from the room-code alphabet. */
export function isValidChallengePin(value: string): boolean {
  return PIN_PATTERN.test(cleanChallengePin(value))
}

/**
 * Build the public challenge URL. The game, PIN, group, and deadline
 * all travel as query parameters — that IS the challenge in v1, so a
 * link copied from the maker opens the same challenge everywhere.
 */
export function buildChallengeUrl(
  origin: string,
  locale: string,
  data: ChallengeLinkData,
): string {
  const base = String(origin ?? '').replace(/\/$/, '') || 'https://eduplay-self.vercel.app'
  const params = new URLSearchParams()
  params.set('game', data.gameId)
  params.set('pin', cleanChallengePin(data.pin))
  if (data.group) params.set('group', data.group)
  if (data.deadline) params.set('deadline', data.deadline)
  return `${base}/${locale}/challenge?${params.toString()}`
}

/**
 * Parse a challenge link's query parameters back into data. Anything
 * missing, malformed, or unparseable becomes null/empty — never an
 * invented game, PIN, group, or deadline.
 */
export function parseChallengeParams(
  params: Record<string, string | string[] | undefined>,
): ChallengeLinkData {
  const first = (v: string | string[] | undefined): string =>
    Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
  const pin = cleanChallengePin(first(params.pin ?? params.roomCode))
  const rawDeadline = first(params.deadline).trim()
  let deadline: string | null = null
  if (rawDeadline) {
    const parsed = new Date(rawDeadline)
    if (!Number.isNaN(parsed.getTime())) deadline = parsed.toISOString()
  }
  const group = first(params.group).trim() || null
  return {
    gameId: first(params.game).trim(),
    pin: isValidChallengePin(pin) ? pin : '',
    group: group ? group.slice(0, 50) : null,
    deadline,
  }
}

/** True only when a valid deadline exists and is already past. */
export function isChallengeExpired(deadline: string | null, nowMs: number): boolean {
  if (!deadline) return false
  const target = new Date(deadline).getTime()
  if (Number.isNaN(target)) return false
  return nowMs > target
}

export interface ChallengeCountdown {
  expired: boolean
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** Pure countdown split, for the public challenge view. */
export function challengeCountdown(deadline: string | null, nowMs: number): ChallengeCountdown {
  if (!deadline) return { expired: false, days: 0, hours: 0, minutes: 0, seconds: 0 }
  const target = new Date(deadline).getTime()
  if (Number.isNaN(target)) return { expired: false, days: 0, hours: 0, minutes: 0, seconds: 0 }
  const diff = target - nowMs
  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 }
  const totalSeconds = Math.floor(diff / 1000)
  return {
    expired: false,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}
