/**
 * STREAK + LEVELS v1 (2026-11-04, master-list part 7 — Duolingo pattern,
 * improved, own star helper, never copied).
 *
 * Device-level only, on purpose: streak + levels + total points live in
 * this browser's localStorage. No account, no email, no personal data,
 * no server row, no migration. Account-synced streaks are a phase-2
 * batch (they need a progress table + an owner SQL run) and are NOT
 * built here.
 *
 * THE RULES, stated plainly (they are also shown in the UI):
 * - A day counts ONLY when the player finishes a game that day. An
 *   opened page, a started game, a preview, and a click never count.
 * - Playing more games the same day adds points but NEVER adds a
 *   second streak day.
 * - Miss a day and the old streak goes back to zero. The next
 *   finished game starts a new streak at 1 day — it never continues
 *   the old streak, and the missed days are never backfilled.
 * - Points are the finished games' real final scores, added up
 *   exactly as reported. Nothing is ever gifted, and a finish can
 *   never subtract points (a negative or non-finite score counts
 *   as 0 points, but the finish still counts as a played day).
 * - Levels come from total points only: every 250 points is one
 *   level (Level 1 = 0–249 points, Level 2 = 250–499, and so on).
 *   A level is never granted except by reaching its points total.
 *
 * Scope note: v1 counts finishes on the current play page
 * (/activity/[id]/play), whose handleComplete fires once per real
 * finish. Creator Preview finishes do NOT count (Preview is a
 * creator checking a draft, not a played game) and legacy
 * /play/[id]/ finishes do NOT count in v1 (that path is untouched
 * pending the owner's /en/play decision). Both limits are stated in
 * the batch report, not hidden.
 */

export const STREAK_STORAGE_KEY = 'eduplay-streak-v1'

/** Points needed for each level step. Level = floor(points / 250) + 1. */
export const LEVEL_POINTS = 250

export interface StreakProgress {
  /** Sum of real final scores from finished games, never gifted. */
  totalPoints: number
  /** Consecutive days with at least one finished game. */
  streakDays: number
  /** Local calendar date (YYYY-MM-DD) of the last finished game. */
  lastPlayedDate: string
  /** How many games were finished in total on this device. */
  gamesFinished: number
}

export interface FinishResult {
  progress: StreakProgress
  /** True when this finish also raised the level (points crossed a step). */
  leveledUp: boolean
  /** True when an old streak was wiped by a missed day before this finish. */
  streakReset: boolean
  /** True when this finish started a brand-new streak (first ever, or after a reset). */
  streakStarted: boolean
  level: number
  pointsToNextLevel: number
}

/** Local calendar date as YYYY-MM-DD (the player's own day, not UTC). */
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDay(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (date.getFullYear() !== Number(m[1]) || date.getMonth() !== Number(m[2]) - 1 || date.getDate() !== Number(m[3])) return null
  return date
}

function isYesterday(lastPlayedDate: string, today: string): boolean {
  const last = parseDay(lastPlayedDate)
  const now = parseDay(today)
  if (!last || !now) return false
  const next = new Date(last)
  next.setDate(next.getDate() + 1)
  return dayKey(next) === today
}

export function levelForPoints(totalPoints: number): number {
  return Math.floor(Math.max(0, totalPoints) / LEVEL_POINTS) + 1
}

export function pointsToNextLevel(totalPoints: number): number {
  const safe = Math.max(0, totalPoints)
  return LEVEL_POINTS - (safe % LEVEL_POINTS)
}

/**
 * Pure streak update: given the previous progress (or null on a fresh
 * device) and one finished game's score, return the new progress.
 * `today` is a YYYY-MM-DD local date, passed in so tests can fix it.
 */
export function recordGameFinish(
  prev: StreakProgress | null,
  score: number,
  today: string,
): FinishResult {
  const points = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0
  if (prev === null) {
    const progress: StreakProgress = {
      totalPoints: points,
      streakDays: 1,
      lastPlayedDate: today,
      gamesFinished: 1,
    }
    return {
      progress,
      leveledUp: false,
      streakReset: false,
      streakStarted: true,
      level: levelForPoints(points),
      pointsToNextLevel: pointsToNextLevel(points),
    }
  }
  const beforeLevel = levelForPoints(prev.totalPoints)
  const totalPoints = prev.totalPoints + points
  const gamesFinished = prev.gamesFinished + 1
  let streakDays: number
  let streakReset = false
  let streakStarted = false
  if (prev.lastPlayedDate === today) {
    // Same day: points grow, streak does not.
    streakDays = prev.streakDays
  } else if (isYesterday(prev.lastPlayedDate, today)) {
    streakDays = prev.streakDays + 1
  } else {
    // Missed at least one day: the old streak is wiped to zero, and
    // this finish starts a new streak at 1. Never backfilled.
    streakDays = 1
    streakReset = true
    streakStarted = true
  }
  const progress: StreakProgress = { totalPoints, streakDays, lastPlayedDate: today, gamesFinished }
  const level = levelForPoints(totalPoints)
  return {
    progress,
    leveledUp: level > beforeLevel,
    streakReset,
    streakStarted,
    level,
    pointsToNextLevel: pointsToNextLevel(totalPoints),
  }
}

/** Minimal storage shape, so tests can pass a fake without localStorage. */
export interface StreakStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStorage(): StreakStorage | null {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage
  } catch {
    return null
  }
  return null
}

export function parseStreak(raw: string | null): StreakProgress | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Partial<StreakProgress>
    if (
      typeof data.totalPoints !== 'number' || !Number.isFinite(data.totalPoints) || data.totalPoints < 0 ||
      typeof data.streakDays !== 'number' || !Number.isFinite(data.streakDays) || data.streakDays < 1 ||
      typeof data.lastPlayedDate !== 'string' || parseDay(data.lastPlayedDate) === null ||
      typeof data.gamesFinished !== 'number' || !Number.isFinite(data.gamesFinished) || data.gamesFinished < 1
    ) {
      return null
    }
    return {
      totalPoints: Math.floor(data.totalPoints),
      streakDays: Math.floor(data.streakDays),
      lastPlayedDate: data.lastPlayedDate,
      gamesFinished: Math.floor(data.gamesFinished),
    }
  } catch {
    return null
  }
}

/** Fresh device, corrupt data, or unavailable storage all read as null — never a fake streak. */
export function loadStreak(storage: StreakStorage | null = defaultStorage()): StreakProgress | null {
  if (!storage) return null
  try {
    return parseStreak(storage.getItem(STREAK_STORAGE_KEY))
  } catch {
    return null
  }
}

function saveStreak(progress: StreakProgress, storage: StreakStorage | null): void {
  if (!storage) return
  try {
    storage.setItem(STREAK_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage full or blocked: the end screen still shows this
    // finish's result, it just will not survive a reload. Never crash.
  }
}

/**
 * Record one finished game on this device. Returns the result for the
 * end screen even when storage is unavailable (then it is session-only).
 */
export function recordFinish(score: number, storage: StreakStorage | null = defaultStorage()): FinishResult {
  const prev = loadStreak(storage)
  const result = recordGameFinish(prev, score, dayKey(new Date()))
  saveStreak(result.progress, storage)
  return result
}

/**
 * The star helper's encouragement line for a finish. Own wording, own
 * character (the existing orange star + teal book helper) — never
 * another product's mascot. Milestones are real streak days only.
 */
export function encouragementFor(result: FinishResult): string {
  if (result.leveledUp) {
    return `⭐ Your star helper says: Level ${result.level}! Amazing playing — keep going!`
  }
  const days = result.progress.streakDays
  if (result.streakReset) {
    return '⭐ Your star helper says: a fresh streak starts today — one finished game a day keeps it alive!'
  }
  if (days >= 30) return '⭐ Your star helper says: 30 days in a row! You are unstoppable!'
  if (days >= 14) return '⭐ Your star helper says: 14 days in a row! What a run!'
  if (days >= 7) return '⭐ Your star helper says: 7 days in a row! A full week of playing!'
  if (days >= 3) return '⭐ Your star helper says: 3 days in a row! The streak is growing!'
  if (result.streakStarted) return '⭐ Your star helper says: your streak has started! Finish a game tomorrow to keep it alive!'
  return '⭐ Your star helper says: well played! Finish a game tomorrow to grow your streak!'
}
