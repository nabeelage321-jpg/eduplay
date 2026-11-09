import { describe, expect, it } from 'vitest'
import { sessionPlayHref } from '@/lib/live-rooms'

const SESSION = '0eabadea-1145-4a7c-af30-c888a55e2e98'
const PLAYER = '71f34ff4-a129-4a95-a72a-9fb983788c01'
const ACTIVITY = '71f34ff4-a129-4a95-a72a-9fb983788c01'

describe('session play href (join fix 2026-11-09)', () => {
  it('carries session + player proof, never just the room code', () => {
    expect(sessionPlayHref('en', ACTIVITY, SESSION, PLAYER)).toBe(
      `/en/activity/${ACTIVITY}/play?session=${SESSION}&player=${PLAYER}`,
    )
    expect(sessionPlayHref('ur', ACTIVITY, SESSION, PLAYER)).toBe(
      `/ur/activity/${ACTIVITY}/play?session=${SESSION}&player=${PLAYER}`,
    )
  })

  it('returns null when the join answered without a player id', () => {
    expect(sessionPlayHref('en', ACTIVITY, SESSION, undefined)).toBeNull()
    expect(sessionPlayHref('en', ACTIVITY, SESSION, '')).toBeNull()
    expect(sessionPlayHref('en', ACTIVITY, SESSION, null)).toBeNull()
    expect(sessionPlayHref('en', ACTIVITY, SESSION, 123)).toBeNull()
  })

  it('returns null when the session id is missing', () => {
    expect(sessionPlayHref('en', ACTIVITY, undefined, PLAYER)).toBeNull()
    expect(sessionPlayHref('en', ACTIVITY, '', PLAYER)).toBeNull()
  })

  it('returns null for non-UUID ids — the endpoint only honours UUIDs', () => {
    expect(sessionPlayHref('en', ACTIVITY, 'not-a-uuid', PLAYER)).toBeNull()
    expect(sessionPlayHref('en', ACTIVITY, SESSION, 'player_1234567890')).toBeNull()
  })

  it('returns null for an empty activity id', () => {
    expect(sessionPlayHref('en', '  ', SESSION, PLAYER)).toBeNull()
  })

  it('trims surrounding whitespace on the ids', () => {
    expect(sessionPlayHref('en', ACTIVITY, ` ${SESSION} `, ` ${PLAYER} `)).toBe(
      `/en/activity/${ACTIVITY}/play?session=${SESSION}&player=${PLAYER}`,
    )
  })
})
