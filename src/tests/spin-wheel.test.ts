import { describe, expect, it } from 'vitest'
import {
  WHEEL_SEGMENTS,
  dbTypeToMetaSlug,
  humanizeGrade,
  metaSlugToDbType,
  randomOffset,
  rotationForSegment,
  segmentAngle,
  segmentIndexForDbType,
} from '@/lib/spin-wheel'
import { ACTIVITY_TYPE_META } from '@/lib/activity-type-meta'

describe('spin wheel helpers', () => {
  it('has one segment per game type, unique slugs', () => {
    expect(WHEEL_SEGMENTS.length).toBe(ACTIVITY_TYPE_META.length)
    expect(WHEEL_SEGMENTS.length).toBeGreaterThan(0)
    const slugs = WHEEL_SEGMENTS.map((s) => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of WHEEL_SEGMENTS) {
      expect(s.name.length).toBeGreaterThan(0)
      expect(s.icon.length).toBeGreaterThan(0)
      expect(s.colour).toMatch(/^hsl\(/)
    }
  })

  it('segment angle divides the wheel exactly', () => {
    expect(segmentAngle() * WHEEL_SEGMENTS.length).toBeCloseTo(360, 10)
  })

  it('every DB type maps to exactly one segment (word-search special case)', () => {
    expect(dbTypeToMetaSlug('word-search')).toBe('wordsearch')
    expect(metaSlugToDbType('wordsearch')).toBe('word-search')
    expect(dbTypeToMetaSlug('quiz')).toBe('quiz')
    for (const s of WHEEL_SEGMENTS) {
      expect(segmentIndexForDbType(s.dbType)).toBe(WHEEL_SEGMENTS.indexOf(s))
    }
    expect(segmentIndexForDbType('not-a-type')).toBe(-1)
  })

  it('rotation lands the segment centre under the top pointer (270 deg)', () => {
    const n = WHEEL_SEGMENTS.length
    const seg = segmentAngle()
    for (const index of [0, 1, 10, 32, n - 1]) {
      const r = rotationForSegment(index, 0)
      // At least five full turns forward.
      expect(r).toBeGreaterThanOrEqual(360 * 5)
      const centre = (index + 0.5) * seg
      const landed = (((centre + r) % 360) + 360) % 360
      expect(landed).toBeCloseTo(270, 10)
    }
  })

  it('rotation always moves forward from a non-zero start', () => {
    const r = rotationForSegment(3, 1234)
    expect(r).toBeGreaterThan(1234 + 360 * 5)
    const landed = ((((3 + 0.5) * segmentAngle() + r) % 360) + 360) % 360
    expect(landed).toBeCloseTo(270, 10)
  })

  it('random offset stays inside the list', () => {
    for (let i = 0; i < 200; i++) {
      const off = randomOffset(13932)
      expect(off).toBeGreaterThanOrEqual(0)
      expect(off).toBeLessThan(13932)
    }
    expect(randomOffset(0)).toBe(0)
    expect(randomOffset(1)).toBe(0)
  })

  it('humanizes grades', () => {
    expect(humanizeGrade('pre-k')).toBe('Pre-K')
    expect(humanizeGrade('kg')).toBe('KG')
    expect(humanizeGrade('grade-6')).toBe('Grade 6')
    expect(humanizeGrade('grade-12')).toBe('Grade 12')
  })
})
