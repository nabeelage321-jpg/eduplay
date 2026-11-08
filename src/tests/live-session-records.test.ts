import { describe, it, expect } from 'vitest'
import {
  REPORT_TTL_MS,
  clearLiveRoom,
  countPlayed,
  isPlayerFinished,
  isReportExpired,
  loadLiveRoom,
  saveLiveRoom,
} from '@/lib/live-room'

// LIVE RECORDS 2026-11-08: what counts as "played", the free-plan
// 3-day report expiry, and the device-local room restore. The
// storage helpers run in a node test env (no window), so they must
// no-op safely there; the pure rules are tested exactly.

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-11-08T13:00:00Z').getTime()
const iso = (ms: number) => new Date(ms).toISOString()

describe('isReportExpired (free plan: 3 days)', () => {
  it('is false for a room created just now', () => {
    expect(isReportExpired(iso(NOW), NOW)).toBe(false)
  })

  it('is false for a room created 2 days ago', () => {
    expect(isReportExpired(iso(NOW - 2 * DAY), NOW)).toBe(false)
  })

  it('is false at exactly 3 days (expiry is strictly older)', () => {
    expect(isReportExpired(iso(NOW - 3 * DAY), NOW)).toBe(false)
  })

  it('is true for a room created 3 days and 1 second ago', () => {
    expect(isReportExpired(iso(NOW - 3 * DAY - 1000), NOW)).toBe(true)
  })

  it('is true for a room created 10 days ago', () => {
    expect(isReportExpired(iso(NOW - 10 * DAY), NOW)).toBe(true)
  })

  it('never expires a room with an unknown creation date', () => {
    expect(isReportExpired(null, NOW)).toBe(false)
    expect(isReportExpired(undefined, NOW)).toBe(false)
    expect(isReportExpired('not-a-date', NOW)).toBe(false)
  })

  it('keeps the 3-day window at exactly 3 * 24h', () => {
    expect(REPORT_TTL_MS).toBe(3 * DAY)
  })
})

describe('isPlayerFinished (played vs merely joined)', () => {
  it('counts a 0-point finish once finished_at is set', () => {
    expect(
      isPlayerFinished({ nickname: 'Kid', score: 0, correct_answers: 0, finished_at: iso(NOW) }),
    ).toBe(true)
  })

  it('counts a player with points even without finished_at (pre-013 fallback)', () => {
    expect(isPlayerFinished({ nickname: 'Kid', score: 100, correct_answers: 10 })).toBe(true)
  })

  it('counts a player with correct answers but 0 points', () => {
    expect(isPlayerFinished({ nickname: 'Kid', score: 0, correct_answers: 3 })).toBe(true)
  })

  it('does not count a player who only joined', () => {
    expect(isPlayerFinished({ nickname: 'Kid', score: 0, correct_answers: 0 })).toBe(false)
    expect(isPlayerFinished({ nickname: 'Kid' })).toBe(false)
  })
})

describe('countPlayed', () => {
  it('counts only finished players', () => {
    const players = [
      { nickname: 'A', score: 100, correct_answers: 10, finished_at: iso(NOW) },
      { nickname: 'B', score: 0, correct_answers: 0, finished_at: iso(NOW) },
      { nickname: 'C', score: 50, correct_answers: 5 },
      { nickname: 'D', score: 0, correct_answers: 0 },
    ]
    expect(countPlayed(players)).toBe(3)
  })

  it('is 0 when nobody played', () => {
    expect(countPlayed([])).toBe(0)
    expect(countPlayed([{ nickname: 'A', score: 0, correct_answers: 0 }])).toBe(0)
  })
})

describe('room restore storage (no window in this env)', () => {
  it('load returns null without a window and save/clear never throw', () => {
    expect(loadLiveRoom()).toBeNull()
    expect(() =>
      saveLiveRoom({ sessionId: 's1', roomCode: 'RQBXVD', role: 'host' }),
    ).not.toThrow()
    expect(() => clearLiveRoom()).not.toThrow()
    expect(loadLiveRoom()).toBeNull()
  })
})
