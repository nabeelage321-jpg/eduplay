/**
 * Guests and groups, v1 — device-local only.
 *
 * Two things, both stored only on this device (localStorage), never
 * sent to a server and never tied to an account:
 *
 * 1. Returning-guest nicknames. The join page remembers the nicknames
 *    a guest has typed on this device, so a returning guest can tap a
 *    previous nickname instead of retyping it. Tapping is an optional
 *    shortcut only — typing a fresh nickname still works exactly as
 *    before, and there is never a login wall. Nickname only: nothing
 *    else about the guest is collected, stored, or displayed.
 *
 * 2. Named groups. When hosting, the host may optionally name the
 *    session's group. The name is stored on the host's device keyed by
 *    session id and room code, shown above the leaderboard on that
 *    device, and included in the host's share message so guests who
 *    receive the invitation see it. A session without a group name
 *    behaves exactly as before — the name is never required.
 *
 * Honest limit, stated plainly: because this batch adds no database
 * column, no migration, and no API change, a group name is NOT
 * server-persistent and NOT visible on other devices on its own.
 * Cross-device server-persistent groups need a group column plus an
 * owner SQL run, and are phase 2 — not this batch. The same limit
 * applies to nicknames: they persist on this device only.
 */

const NICKNAMES_KEY = 'eduplay-guest-nicknames'
const GROUP_BY_SESSION_PREFIX = 'eduplay-group-by-session:'
const GROUP_BY_CODE_PREFIX = 'eduplay-group-by-code:'

const MAX_NICKNAME_LENGTH = 20
const MAX_GROUP_LENGTH = 30
const MAX_STORED_NICKNAMES = 5

export function cleanNickname(value: string): string {
  return String(value ?? '').trim().slice(0, MAX_NICKNAME_LENGTH)
}

export function cleanGroupName(value: string): string {
  return String(value ?? '').trim().slice(0, MAX_GROUP_LENGTH)
}

function readStored(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — the feature just does not persist */
  }
}

/** Nicknames previously used on this device, most recent first. */
export function loadGuestNicknames(): string[] {
  const raw = readStored(NICKNAMES_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const cleaned = parsed
      .map((entry) => cleanNickname(String(entry ?? '')))
      .filter((entry) => entry.length > 0)
    return [...new Set(cleaned)].slice(0, MAX_STORED_NICKNAMES)
  } catch {
    return []
  }
}

/** Remember a nickname on this device (most recent first, no duplicates). */
export function rememberGuestNickname(nickname: string): void {
  const cleaned = cleanNickname(nickname)
  if (!cleaned) return
  const rest = loadGuestNicknames().filter((entry) => entry !== cleaned)
  writeStored(NICKNAMES_KEY, JSON.stringify([cleaned, ...rest].slice(0, MAX_STORED_NICKNAMES)))
}

/** Save a group name for a session, keyed by session id and room code. */
export function saveGroupName(options: {
  sessionId?: string | null
  roomCode?: string | null
  name: string
}): void {
  const name = cleanGroupName(options.name)
  if (!name) return
  if (options.sessionId) writeStored(`${GROUP_BY_SESSION_PREFIX}${options.sessionId}`, name)
  if (options.roomCode) {
    writeStored(`${GROUP_BY_CODE_PREFIX}${options.roomCode.trim().toUpperCase()}`, name)
  }
}

/**
 * Load a stored group name for a session: session id first, then room
 * code. Returns null when the session was never given a group name —
 * callers must treat null as "no group, behave exactly as before".
 */
export function loadGroupName(options: {
  sessionId?: string | null
  roomCode?: string | null
}): string | null {
  if (options.sessionId) {
    const bySession = readStored(`${GROUP_BY_SESSION_PREFIX}${options.sessionId}`)
    if (bySession) return cleanGroupName(bySession) || null
  }
  if (options.roomCode) {
    const byCode = readStored(`${GROUP_BY_CODE_PREFIX}${options.roomCode.trim().toUpperCase()}`)
    if (byCode) return cleanGroupName(byCode) || null
  }
  return null
}
