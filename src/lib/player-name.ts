/**
 * Player name, v1 (build-list item 5, 2026-11-07).
 *
 * The name a player types (or has auto-filled from their signed-in
 * account) on the Quiz How-to-Play screen, shown on the finish
 * screen only. It never changes game rules, scoring, lives, timers,
 * or questions, and it is never sent to a server.
 *
 * Signed-out players are asked once: the name is remembered on this
 * device only (localStorage, same pattern as the guest nicknames in
 * guests.ts), so the next game pre-fills it. A signed-in player's
 * account name takes precedence on every visit — the stored device
 * name is only a fallback. There is never a login wall: the name is
 * optional, and skipping without a name plays exactly the same.
 */

const PLAYER_NAME_KEY = 'eduplay-player-name'
const MAX_PLAYER_NAME_LENGTH = 20

export function cleanPlayerName(value: string): string {
  return String(value ?? '').trim().slice(0, MAX_PLAYER_NAME_LENGTH)
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
    /* storage unavailable — the name just does not persist */
  }
}

/** The name remembered on this device, or null when none was saved. */
export function loadPlayerName(): string | null {
  const raw = readStored(PLAYER_NAME_KEY)
  if (!raw) return null
  const cleaned = cleanPlayerName(raw)
  return cleaned.length > 0 ? cleaned : null
}

/**
 * Which name the intro screen starts with, and where it came from.
 * A signed-in account name always wins; a name remembered on this
 * device is the fallback; otherwise the field starts empty.
 */
export function resolvePlayerName(sessionName: string | null, storedName: string | null): {
  name: string
  source: 'account' | 'remembered' | 'none'
} {
  const account = cleanPlayerName(sessionName ?? '')
  if (account.length > 0) return { name: account, source: 'account' }
  const remembered = cleanPlayerName(storedName ?? '')
  if (remembered.length > 0) return { name: remembered, source: 'remembered' }
  return { name: '', source: 'none' }
}

/** Remember a name on this device. An empty name saves nothing. */
export function savePlayerName(name: string): void {
  const cleaned = cleanPlayerName(name)
  if (cleaned.length === 0) return
  writeStored(PLAYER_NAME_KEY, cleaned)
}
