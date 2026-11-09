import { describe, expect, it } from 'vitest'
import { HELPER_FEATURES, HELPER_OPEN_EVENT, MASCOT_GREETING } from '@/lib/mascot'

// Twinkle's "What we have" panel (owner order 2026-11-08): clicking
// Twinkle lists the important features. Every href below was verified
// against src/app/[locale]/... — each target has a real page.tsx.
// The wheel is a homepage section (anchor #spin-the-wheel); the
// chapter box lives at the top of /create. The only number allowed
// anywhere is 65, the real game-type count.
const VERIFIED_PATHS = new Set([
  '/play-games',
  '/#spin-the-wheel',
  '/live',
  '/prompt-to-game',
  '/create',
  '/video-to-game',
  '/browse',
  '/join',
  '/dashboard',
])

describe('twinkle features panel', () => {
  it('lists exactly the 10 important features, no duplicates', () => {
    expect(HELPER_FEATURES.length).toBe(10)
    const titles = HELPER_FEATURES.map((f) => f.title)
    expect(new Set(titles).size).toBe(titles.length)
    for (const f of HELPER_FEATURES) {
      expect(f.title.length).toBeGreaterThan(0)
      expect(f.line.length).toBeGreaterThan(0)
      expect(f.path.length).toBeGreaterThan(0)
    }
  })

  it('every feature links to a real, verified page — never an invented URL', () => {
    for (const f of HELPER_FEATURES) {
      expect(f.path.startsWith('/')).toBe(true)
      expect(VERIFIED_PATHS.has(f.path)).toBe(true)
      expect(f.path).not.toContain('/activity/')
      expect(f.path).not.toContain('http')
    }
  })

  it('the wheel links to its homepage anchor, the chapter to the creator', () => {
    const wheel = HELPER_FEATURES.find((f) => f.title === 'Spin the Wheel and Play')
    expect(wheel?.path).toBe('/#spin-the-wheel')
    const chapter = HELPER_FEATURES.find((f) => f.title === 'Make a game from a chapter')
    expect(chapter?.path).toBe('/create')
  })

  it('the only number anywhere is the real 65 game types', () => {
    for (const f of HELPER_FEATURES) {
      const digits = f.line.match(/\d+/g) ?? []
      if (f.title === 'Play Games') {
        expect(digits).toEqual(['65'])
      } else {
        expect(digits).toEqual([])
      }
    }
  })

  it('the wheel Twinkle asks the roaming mascot to open the panel', () => {
    expect(HELPER_OPEN_EVENT.length).toBeGreaterThan(0)
    expect(HELPER_OPEN_EVENT.startsWith('eduplay:')).toBe(true)
  })

  it('the speech bubble invites visitors to ask what we have (owner order 2026-11-09)', () => {
    expect(MASCOT_GREETING).toBe('Ask me what we have! 💭')
  })
})
