import { describe, it, expect } from 'vitest'
import {
  buildT1SitemapEntries,
  buildT2SitemapEntries,
  buildT3SitemapEntries,
  buildT8SitemapEntries,
  countStaticEntries,
  SUBJECT_SLUGS,
  ACTIVITY_TYPE_SLUGS,
  COMPETITOR_SLUGS,
} from '../lib/seo/sitemap'
import { ALL_LOCALES } from '../lib/seo/metadata'
import { GRADES_SEED } from '../lib/supabase/seed/grades'

// ─── T1 ───────────────────────────────────────────────────────────────────────

describe('buildT1SitemapEntries', () => {
  const entries = buildT1SitemapEntries()

  it('generates exactly 23 types × 11 locales = 253 entries', () => {
    expect(entries).toHaveLength(ACTIVITY_TYPE_SLUGS.length * ALL_LOCALES.length)
    expect(entries).toHaveLength(253)
  })

  it('every URL contains a valid locale and type slug', () => {
    for (const entry of entries) {
      const parts = entry.url.split('/')
      const locale = parts[3]
      const type = parts[5]
      expect(ALL_LOCALES).toContain(locale as typeof ALL_LOCALES[number])
      expect(ACTIVITY_TYPE_SLUGS).toContain(type)
    }
  })

  it('no duplicate URLs', () => {
    const urls = entries.map((e) => e.url)
    const unique = new Set(urls)
    expect(unique.size).toEqual(urls.length)
  })

  it('all entries have priority set', () => {
    expect(entries.every((e) => typeof e.priority === 'number')).toBe(true)
  })
})

// ─── T2 ───────────────────────────────────────────────────────────────────────

describe('buildT2SitemapEntries', () => {
  const entries = buildT2SitemapEntries()

  it('generates 15 subjects × 23 types × 11 locales = 3,795 entries', () => {
    expect(entries).toHaveLength(
      SUBJECT_SLUGS.length * ACTIVITY_TYPE_SLUGS.length * ALL_LOCALES.length,
    )
    expect(entries).toHaveLength(3795)
  })

  it('no duplicate URLs', () => {
    const urls = entries.map((e) => e.url)
    const unique = new Set(urls)
    expect(unique.size).toEqual(urls.length)
  })
})

// ─── T3 ───────────────────────────────────────────────────────────────────────

describe('buildT3SitemapEntries', () => {
  const entries = buildT3SitemapEntries()

  const expectedCount =
    SUBJECT_SLUGS.length *
    GRADES_SEED.length *
    ACTIVITY_TYPE_SLUGS.length *
    ALL_LOCALES.length

  it(`generates ${expectedCount.toLocaleString()} entries`, () => {
    expect(entries).toHaveLength(expectedCount)
  })

  it('T3 pages have the highest priority (0.8)', () => {
    expect(entries.every((e) => e.priority === 0.8)).toBe(true)
  })

  it('no duplicate URLs in first 1000 entries (sample)', () => {
    const sample = entries.slice(0, 1000).map((e) => e.url)
    const unique = new Set(sample)
    expect(unique.size).toEqual(sample.length)
  })

  it('Urdu URLs contain the locale segment "ur"', () => {
    const urduEntries = entries.filter((e) => e.url.includes('/ur/'))
    expect(urduEntries.length).toBeGreaterThan(0)
    const expectedUrduCount =
      SUBJECT_SLUGS.length * GRADES_SEED.length * ACTIVITY_TYPE_SLUGS.length
    expect(urduEntries).toHaveLength(expectedUrduCount)
  })
})

// ─── T8 ───────────────────────────────────────────────────────────────────────

describe('buildT8SitemapEntries', () => {
  const entries = buildT8SitemapEntries()

  it('generates one entry per competitor', () => {
    expect(entries).toHaveLength(COMPETITOR_SLUGS.length)
  })

  it('all URLs are under /en/alternatives/', () => {
    for (const entry of entries) {
      expect(entry.url).toContain('/en/alternatives/')
    }
  })

  it('T8 entries have high priority (0.9)', () => {
    expect(entries.every((e) => e.priority === 0.9)).toBe(true)
  })

  it('includes wordwall and kahoot', () => {
    const urls = entries.map((e) => e.url)
    expect(urls.some((u) => u.includes('wordwall'))).toBe(true)
    expect(urls.some((u) => u.includes('kahoot'))).toBe(true)
  })
})

// ─── countStaticEntries ───────────────────────────────────────────────────────

describe('countStaticEntries', () => {
  it('returns correct individual counts', () => {
    const counts = countStaticEntries()
    expect(counts.t1).toBe(253)
    expect(counts.t2).toBe(3795)
    expect(counts.t8).toBe(COMPETITOR_SLUGS.length)
  })

  it('total is sum of individual parts', () => {
    const counts = countStaticEntries()
    expect(counts.total).toBe(counts.t1 + counts.t2 + counts.t3 + counts.t8)
  })

  it('total static entries is the programmatic grid only', () => {
    // T1: 253 + T2: 3,795 + T3: 15×14×23×11 = 53,130 + T8: 50 = 57,228
    const counts = countStaticEntries()
    expect(counts.total).toBe(57_228)
  })
})
