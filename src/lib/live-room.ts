/**
 * Live room records — device-local room restore + session-report rules.
 *
 * Two separate things live here, both small and pure on purpose so
 * they are unit-testable without a browser or a database:
 *
 * 1. ROOM RESTORE (localStorage only, this device): after a host
 *    creates a room or a player joins one, the room is remembered
 *    here so a reload (or coming back from the play page) restores
 *    the room view instead of dropping back to the host/join
 *    choice. Nothing is ever created from a stored record — restore
 *    only re-opens a room that still exists on the server; an
 *    ended or missing room is forgotten, never resurrected.
 *
 * 2. REPORT RULES (pure, no storage): what counts as "played", and
 *    the free-plan 3-day report expiry. The report itself is
 *    server data (live_sessions + live_players rows); these helpers
 *    only decide what to show. Expiry never deletes anything — an
 *    expired report simply stops rendering its data.
 */

/** Free plan: a session report is viewable for 3 days after the room was created. */
export const REPORT_TTL_MS = 3 * 24 * 60 * 60 * 1000

const LIVE_ROOM_KEY = 'eduplay:live-room:v1'

export type LiveRoomRole = 'host' | 'player'

export interface LiveRoomRecord {
  sessionId: string
  roomCode: string
  role: LiveRoomRole
  playerId?: string | null
  nickname?: string | null
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
    /* storage unavailable — the room just does not persist */
  }
}

function removeStored(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** Remember the open room on this device (overwrites any earlier room). */
export function saveLiveRoom(record: LiveRoomRecord): void {
  if (!record.sessionId || !record.roomCode) return
  writeStored(
    LIVE_ROOM_KEY,
    JSON.stringify({
      sessionId: record.sessionId,
      roomCode: String(record.roomCode).trim().toUpperCase(),
      role: record.role,
      playerId: record.playerId ?? null,
      nickname: record.nickname ?? null,
    }),
  )
}

/** The room remembered on this device, or null. Never throws. */
export function loadLiveRoom(): LiveRoomRecord | null {
  const raw = readStored(LIVE_ROOM_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const rec = parsed as Partial<LiveRoomRecord>
    if (typeof rec.sessionId !== 'string' || !rec.sessionId) return null
    if (typeof rec.roomCode !== 'string' || !rec.roomCode) return null
    if (rec.role !== 'host' && rec.role !== 'player') return null
    return {
      sessionId: rec.sessionId,
      roomCode: rec.roomCode,
      role: rec.role,
      playerId: typeof rec.playerId === 'string' ? rec.playerId : null,
      nickname: typeof rec.nickname === 'string' ? rec.nickname : null,
    }
  } catch {
    return null
  }
}

/** Forget the remembered room on this device. */
export function clearLiveRoom(): void {
  removeStored(LIVE_ROOM_KEY)
}

export interface LiveRoomPlayerLike {
  nickname?: string | null
  score?: number | null
  correct_answers?: number | null
  finished_at?: string | null
}

/**
 * Did this player actually play (finish), as opposed to merely
 * joining? A finish is recorded as finished_at once migration 013
 * has run. Before that, fall back to a reported score: any points
 * or any correct answer means the player played. A 0-point finish
 * before 013 is the one case this cannot tell apart from a join —
 * it counts as not played until 013 runs.
 */
export function isPlayerFinished(player: LiveRoomPlayerLike): boolean {
  if (player.finished_at) return true
  if ((player.score ?? 0) > 0) return true
  if ((player.correct_answers ?? 0) > 0) return true
  return false
}

/** How many of these players played (finished). */
export function countPlayed(players: LiveRoomPlayerLike[]): number {
  return players.filter(isPlayerFinished).length
}

/**
 * Free-plan report expiry: a session report is gone once the room
 * is older than 3 days. An unknown creation date never expires the
 * report — the data is there, so it shows.
 */
export function isReportExpired(createdAt: string | null | undefined, nowMs: number = Date.now()): boolean {
  if (!createdAt) return false
  const createdMs = new Date(createdAt).getTime()
  if (!Number.isFinite(createdMs)) return false
  return nowMs - createdMs > REPORT_TTL_MS
}
