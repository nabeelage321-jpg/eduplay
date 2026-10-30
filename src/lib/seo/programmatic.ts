import { createServerClient } from '@/lib/supabase/server'

/**
 * Programmatic SEO — real-DB mapping (2026-10-30 SEO batch).
 *
 * The code seed grid (30 subjects) does NOT match the live database.
 * The database holds exactly these 15 subjects (Browse page list +
 * live /api/activities totals, 5,110 rows). Only these combinations
 * can ever have real games, so only these combinations are ever
 * indexed or listed in the sitemap. Every other slug combination
 * stays noindex and out of the sitemap.
 *
 * Slug -> live DB `activities.subject` value. The only non-obvious
 * mappings are mathematics -> Math and general-knowledge -> General
 * Knowledge (the latter has no seed entry of its own; see
 * SUBJECTS_SEED, where it was added from the real DB subject).
 */
export const DB_SUBJECT_BY_SLUG: Record<string, string> = {
  mathematics: 'Math',
  science: 'Science',
  english: 'English',
  urdu: 'Urdu',
  islamiat: 'Islamiyat',
  history: 'History',
  geography: 'Geography',
  'computer-science': 'Computer Science',
  art: 'Art',
  'physical-education': 'Physical Education',
  biology: 'Biology',
  chemistry: 'Chemistry',
  physics: 'Physics',
  'social-studies': 'Social Studies',
  'general-knowledge': 'General Knowledge',
}

export const PROGRAMMATIC_SUBJECT_SLUGS = Object.keys(DB_SUBJECT_BY_SLUG)

/**
 * Slug -> live DB `activities.type` value. The seed slug for Word
 * Search is 'wordsearch'; the live DB (and the play router) use
 * 'word-search'. Every other type slug matches its DB value exactly.
 */
export const DB_TYPE_BY_SLUG: Record<string, string> = {
  quiz: 'quiz',
  'match-up': 'match-up',
  anagram: 'anagram',
  crossword: 'crossword',
  wordsearch: 'word-search',
  'spin-wheel': 'spin-wheel',
  'balloon-pop': 'balloon-pop',
  'whack-a-mole': 'whack-a-mole',
  'true-false': 'true-false',
  categorize: 'categorize',
  order: 'order',
  'fill-blank': 'fill-blank',
  'labelled-diagram': 'labelled-diagram',
  flashcards: 'flashcards',
  'missing-word': 'missing-word',
  unjumble: 'unjumble',
  'gameshow-quiz': 'gameshow-quiz',
  hangman: 'hangman',
  'random-wheel': 'random-wheel',
  'open-box': 'open-box',
  'memory-match': 'memory-match',
  'typing-race': 'typing-race',
  bingo: 'bingo',
}

export interface ProgrammaticActivity {
  id: string
  title: string
  description: string | null
  subject: string
  grade: string
  type: string
}

export function getDbSubject(subjectSlug: string): string | null {
  return DB_SUBJECT_BY_SLUG[subjectSlug] ?? null
}

export function getDbType(typeSlug: string): string | null {
  return DB_TYPE_BY_SLUG[typeSlug] ?? null
}

export interface ProgrammaticQuery {
  subjectSlug?: string
  gradeSlug?: string
  typeSlug?: string
  limit?: number
}

/**
 * Fetch real public activities for a programmatic combination.
 * Returns [] on any error (e.g. placeholder env at build time), so a
 * page can never render invented games — it renders the empty state
 * and stays noindex instead. Language is deliberately NOT filtered:
 * the games in the DB are English-titled, and the localized page
 * shell (labels, headings) is what varies by locale.
 */
export async function fetchProgrammaticActivities(
  query: ProgrammaticQuery,
): Promise<{ activities: ProgrammaticActivity[]; count: number }> {
  const dbSubject = query.subjectSlug ? getDbSubject(query.subjectSlug) : null
  const dbType = query.typeSlug ? getDbType(query.typeSlug) : null
  // An unknown slug can never match a real game.
  if (query.subjectSlug && !dbSubject) return { activities: [], count: 0 }
  if (query.typeSlug && !dbType) return { activities: [], count: 0 }

  try {
    // Server-side service-role client, same as the working /api/activities
    // route. The anon client is NOT used here: no existing page ever
    // queried Supabase with it live, and the repo's supabase-js (2.39)
    // predates the new publishable-key format, so an anon query cannot
    // be trusted to work on Vercel. This runs only on the server
    // (generateMetadata + server components), so the key never reaches
    // the browser.
    const supabase = createServerClient()
    let countQuery = supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('is_public', true)
    let dataQuery = supabase
      .from('activities')
      .select('id, title, description, subject, grade, type')
      .eq('is_public', true)
      .order('title', { ascending: true })
      .range(0, (query.limit ?? 100) - 1)

    if (dbSubject) {
      countQuery = countQuery.eq('subject', dbSubject)
      dataQuery = dataQuery.eq('subject', dbSubject)
    }
    if (query.gradeSlug) {
      countQuery = countQuery.eq('grade', query.gradeSlug)
      dataQuery = dataQuery.eq('grade', query.gradeSlug)
    }
    if (dbType) {
      countQuery = countQuery.eq('type', dbType)
      dataQuery = dataQuery.eq('type', dbType)
    }

    const [{ count, error: countError }, { data, error }] = await Promise.all([
      countQuery,
      dataQuery,
    ])
    if (countError || error) return { activities: [], count: 0 }
    return {
      activities: (data ?? []) as ProgrammaticActivity[],
      count: count ?? (data ?? []).length,
    }
  } catch {
    return { activities: [], count: 0 }
  }
}

/** Indexing rule, single source of truth: >=1 real game = index. */
export function isIndexable(count: number): boolean {
  return count > 0
}
