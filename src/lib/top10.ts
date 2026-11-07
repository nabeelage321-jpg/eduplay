/**
 * DEVICE-LOCAL TOP 10 (batch-1 shared build, final list item 9).
 *
 * The finish screen shows a Top 10 leaderboard — ROUTINE on every
 * game — built ONLY from this device's own real finishes. No scores,
 * players, or names are ever invented: an entry exists only because
 * a game was actually finished on this device. A server leaderboard
 * needs play-event tracking, which is a separate build — this file
 * never pretends the device list is a class or world ranking, and
 * the UI labels it "Your Top 10 on this device".
 *
 * Pure helpers (addTop10Entry) are testable without a browser; the
 * thin storage wrappers guard `window` the same way streak.ts does.
 */

export interface Top10Entry {
  activityId: string
  title: string
  score: number
  /** The name the player typed, or '' when none was given. */
  name: string
  /** Percent correct, when the player reported counts; else null. */
  percent: number | null
  /** ISO date of the finish. */
  date: string
}

export const TOP10_STORAGE_KEY = 'eduplay-top10-v1'
export const TOP10_MAX = 10

/** Keep the best 10 finishes for one game: highest score first,
 *  newest first on a tie. Pure — no storage, no window. */
export function addTop10Entry(
  existing: Top10Entry[],
  entry: Top10Entry,
): Top10Entry[] {
  const all = [...existing, entry].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.date.localeCompare(a.date)
  })
  return all.slice(0, TOP10_MAX)
}

type Top10Store = Record<string, Top10Entry[]>

function readStore(): Top10Store {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(TOP10_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Top10Store
  } catch {
    return {}
  }
}

function writeStore(store: Top10Store): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TOP10_STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* storage unavailable — the Top 10 just does not persist */
  }
}

/** The device's Top 10 for one game, best first. Empty when the
 *  game has never been finished on this device — never invented. */
export function readTop10(activityId: string): Top10Entry[] {
  const store = readStore()
  const list = store[activityId]
  return Array.isArray(list) ? list : []
}

/** Record a real finish on this device and return the updated
 *  Top 10 for that game. */
export function recordTop10Play(entry: Top10Entry): Top10Entry[] {
  const store = readStore()
  const updated = addTop10Entry(store[entry.activityId] ?? [], entry)
  store[entry.activityId] = updated
  writeStore(store)
  return updated
}
