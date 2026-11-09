import { describe, expect, it } from 'vitest'
import {
  gameNumberHref,
  liveHostHref,
  liveJoinHref,
  parseGameNumber,
  parseLiveCode,
  parseLiveMode,
} from '@/lib/live-rooms'

describe('live rooms helpers', () => {
  it('host href goes to the live page in host mode', () => {
    expect(liveHostHref('en')).toBe('/en/live?mode=host')
    expect(liveHostHref('ur')).toBe('/ur/live?mode=host')
  })

  it('join href prefills a valid 6-letter code, uppercased', () => {
    expect(liveJoinHref('en', 'rqbXvd')).toBe('/en/live?mode=join&code=RQBXVD')
    expect(liveJoinHref('en', '  abcdef ')).toBe('/en/live?mode=join&code=ABCDEF')
  })

  it('join href prefills a code with digits — real codes are base36', () => {
    expect(liveJoinHref('en', 'x46ccv')).toBe('/en/live?mode=join&code=X46CCV')
    expect(liveJoinHref('en', 'AB12EF')).toBe('/en/live?mode=join&code=AB12EF')
  })

  it('join href without a valid code still opens join mode, code-less', () => {
    expect(liveJoinHref('en', '')).toBe('/en/live?mode=join')
    expect(liveJoinHref('en', 'ABC')).toBe('/en/live?mode=join')
    expect(liveJoinHref('en', 'ABCDEF1')).toBe('/en/live?mode=join')
    expect(liveJoinHref('en', 'AB!2EF')).toBe('/en/live?mode=join')
  })

  it('parseLiveMode accepts only host/join', () => {
    expect(parseLiveMode('host')).toBe('host')
    expect(parseLiveMode('JOIN')).toBe('join')
    expect(parseLiveMode('play')).toBeNull()
    expect(parseLiveMode(undefined)).toBeNull()
    expect(parseLiveMode(['join'])).toBeNull()
  })

  it('parseLiveCode accepts only 6 letters, uppercased', () => {
    expect(parseLiveCode('rqbXvd')).toBe('RQBXVD')
    expect(parseLiveCode('RQBXVD')).toBe('RQBXVD')
    expect(parseLiveCode('abc')).toBeNull()
    expect(parseLiveCode('ABCDEF1')).toBeNull()
    expect(parseLiveCode('AB!2EF')).toBeNull()
    expect(parseLiveCode(undefined)).toBeNull()
  })

  it('parseLiveCode accepts codes with digits — real codes are base36', () => {
    expect(parseLiveCode('x46ccv')).toBe('X46CCV')
    expect(parseLiveCode('AB12EF')).toBe('AB12EF')
  })

  it('parseGameNumber keeps digits only, up to 6', () => {
    expect(parseGameNumber('100083')).toBe('100083')
    expect(parseGameNumber('100123')).toBe('100123')
    expect(parseGameNumber('abc100083xyz')).toBe('100083')
    expect(parseGameNumber('1000839')).toBe('100083')
    expect(parseGameNumber('')).toBeNull()
    expect(parseGameNumber('abc')).toBeNull()
    expect(parseGameNumber(undefined)).toBeNull()
  })

  it('gameNumberHref goes to the existing game-number route', () => {
    expect(gameNumberHref('en', '100083')).toBe('/en/game-number?number=100083')
    expect(gameNumberHref('ur', '100123')).toBe('/ur/game-number?number=100123')
    expect(gameNumberHref('en', 'abc100083')).toBe('/en/game-number?number=100083')
    expect(gameNumberHref('en', '')).toBeNull()
    expect(gameNumberHref('en', 'abc')).toBeNull()
  })
})
