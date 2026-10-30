import type { MetadataRoute } from 'next'
import { ALL_LOCALES } from './metadata'

import { getBaseUrl } from './base-url'

const BASE_URL = getBaseUrl()

// ─── Static data references (mirrors seed data) ──────────────────────────────

// Programmatic grid, 2026-10-30 SEO batch: ONLY the 15 subjects that
// actually have games in the live database (see lib/seo/programmatic.ts).
// The old 30-subject list generated 60k+ thin pages for subjects with
// zero games (arabic, music, economics, ...). Those are no longer listed.
export const SUBJECT_SLUGS = [
  'mathematics', 'science', 'english', 'urdu', 'islamiat',
  'history', 'geography', 'computer-science', 'art', 'physical-education',
  'biology', 'chemistry', 'physics', 'social-studies', 'general-knowledge',
] as const

export const ACTIVITY_TYPE_SLUGS = [
  'quiz', 'match-up', 'anagram', 'crossword', 'wordsearch',
  'spin-wheel', 'balloon-pop', 'whack-a-mole', 'true-false', 'categorize',
  'order', 'fill-blank', 'labelled-diagram', 'flashcards', 'missing-word',
  'unjumble', 'gameshow-quiz', 'hangman', 'random-wheel', 'open-box',
  'memory-match', 'typing-race', 'bingo',
] as const

export const GRADE_SLUGS = [
  'pre-k', 'kg', 'grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5', 'grade-6',
  'grade-7', 'grade-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12',
] as const

export const COMPETITOR_SLUGS = [
  'wordwall', 'kahoot', 'quizlet', 'blooket', 'gimkit', 'quizizz',
  'nearpod', 'baamboozle', 'liveworksheets', 'padlet', 'classdojo',
  'schoology', 'remind', 'flipgrid', 'peardeck', 'mentimeter',
  'polleverywhere', 'quizalize', 'formative', 'edpuzzle', 'seesaw',
  'classcharts', 'showbie', 'managebac', 'turnitin', 'canvas',
  'google-classroom', 'microsoft-teams-education', 'moodle', 'blackboard',
  'brightspace', 'schoology', 'classcraft', 'prodigy', 'istation',
  'raz-kids', 'reading-eggs', 'dreambox', 'khan-academy', 'duolingo',
  'mathway', 'photomath', 'ixl', 'splashlearn', 'abcmouse',
  'starfall', 'funbrain', 'coolmathgames', 'brainpop', 'scholastic',
] as const

// ─── Sitemap entry builders ───────────────────────────────────────────────────

/** T1: Activity Type Hub — 23 types × 11 locales = 253 pages (all types have real games) */
export function buildT1SitemapEntries(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []
  for (const locale of ALL_LOCALES) {
    for (const type of ACTIVITY_TYPE_SLUGS) {
      entries.push({
        url: `${BASE_URL}/${locale}/activities/${type}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  }
  return entries
}

/** T2: Subject + Type — 15 subjects × 23 types × 11 locales = 3,795 pages (every combo has 14 real games, one per grade) */
export function buildT2SitemapEntries(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []
  for (const locale of ALL_LOCALES) {
    for (const subject of SUBJECT_SLUGS) {
      for (const type of ACTIVITY_TYPE_SLUGS) {
        entries.push({
          url: `${BASE_URL}/${locale}/${subject}/${type}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
        })
      }
    }
  }
  return entries
}

/** T3: Subject + Grade + Type — 15 × 14 × 23 × 11 = 53,130 pages (every combo has >=1 real game) */
export function buildT3SitemapEntries(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []
  for (const locale of ALL_LOCALES) {
    for (const subject of SUBJECT_SLUGS) {
      for (const grade of GRADE_SLUGS) {
        for (const type of ACTIVITY_TYPE_SLUGS) {
          entries.push({
            url: `${BASE_URL}/${locale}/${subject}/${grade}/${type}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8, // Highest-value long-tail SEO pages
          })
        }
      }
    }
  }
  return entries
}

/** T5: Topic Pages — up to 500 topics × 11 locales (from DB, static here) */
export function buildT5SitemapEntries(topics: string[]): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []
  for (const locale of ALL_LOCALES) {
    for (const topic of topics) {
      entries.push({
        url: `${BASE_URL}/${locale}/topics/${topic}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
  }
  return entries
}

/** T8: Competitor Alternatives — 50 pages, English only */
export function buildT8SitemapEntries(): MetadataRoute.Sitemap {
  return COMPETITOR_SLUGS.map((slug) => ({
    url: `${BASE_URL}/en/alternatives/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.9, // High intent traffic
  }))
}

/** Count total static entries */
export function countStaticEntries(): {
  t1: number
  t2: number
  t3: number
  t8: number
  total: number
} {
  const t1 = ALL_LOCALES.length * ACTIVITY_TYPE_SLUGS.length
  const t2 = ALL_LOCALES.length * SUBJECT_SLUGS.length * ACTIVITY_TYPE_SLUGS.length
  const t3 = ALL_LOCALES.length * SUBJECT_SLUGS.length * GRADE_SLUGS.length * ACTIVITY_TYPE_SLUGS.length
  const t8 = COMPETITOR_SLUGS.length
  return { t1, t2, t3, t8, total: t1 + t2 + t3 + t8 }
}
