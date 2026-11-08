import { createServerClient } from '@/lib/supabase/server'
import { resolveCurriculumTag, type CurriculumTag } from '@/lib/curricula'

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
  // Queue types added 2026-11-02/03 (Jump Path, Riddle, AsterQuiz,
  // Dictation, Dialogue, Map Quiz, Jigsaw Puzzle, Video Quiz),
  // plus Letter Wheel (2026-11-04, first of the 9 types toward 40),
  // Maze Run (2026-11-04, first of the remaining 8) and Speed
  // Judge (2026-11-04, second of the remaining 8).
  // Creator-saved games store the TypeSelector slug as the type
  // value, so slug == DB value for all ten, exactly as for the
  // original 23 (only 'wordsearch' differs, see above).
  'jump-path': 'jump-path',
  riddle: 'riddle',
  'aster-quiz': 'aster-quiz',
  dictation: 'dictation',
  dialogue: 'dialogue',
  'map-quiz': 'map-quiz',
  'jigsaw-puzzle': 'jigsaw-puzzle',
  'video-quiz': 'video-quiz',
  'letter-wheel': 'letter-wheel',
  'maze-run': 'maze-run',
  'speed-judge': 'speed-judge',
  'spell-it': 'spell-it',
  'picture-answer': 'picture-answer',
  'memory-recall': 'memory-recall',
  'claim-line': 'claim-line',
  'opinion-cloud': 'opinion-cloud',
  'number-slider': 'number-slider',
  'maze-chase': 'maze-chase',
  'apple-snake': 'apple-snake',
  'flutter-flight': 'flutter-flight',
  'sweet-match': 'sweet-match',
  'star-shooter': 'star-shooter',
  'jump-blocks': 'jump-blocks',
  'fruit-slice': 'fruit-slice',
  'river-hop': 'river-hop',
  'lane-runner': 'lane-runner',
  'block-drop': 'block-drop',
  'slingshot-aim': 'slingshot-aim',
  'brick-bounce': 'brick-bounce',
  'rock-blaster': 'rock-blaster',
  'ladder-climb': 'ladder-climb',
  'beat-tap': 'beat-tap',
  'mine-logic': 'mine-logic',
  'number-merge': 'number-merge',
  'bounce-up': 'bounce-up',
  'creature-catch': 'creature-catch',
  'paddle-goal': 'paddle-goal',
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

export interface PakistanCurriculumActivity extends ProgrammaticActivity {
  /** Validated seed tag, or null (a row that fails validation is dropped). */
  curriculum: CurriculumTag | null
}

/**
 * BEAT-PLAN BUILD #1 — Pakistan curriculum hub listing.
 *
 * AUDIT (2026-11-05): curriculum tags are stored ONLY inside the
 * game's content JSON (content.curriculum = { countryCode,
 * syllabusSlug }, server-validated on save in POST /api/activities).
 * There is NO server query path to list games by tag — GET
 * /api/activities filters subject/grade/type/locale/search only, and
 * the browse country/syllabus filter is phase 2 and NOT built here.
 * So this hub carries its own server fetch, mirroring
 * fetchProgrammaticActivities above (same service-role client, same
 * fail-to-empty behaviour). It is the hub's own listing, not a browse
 * filter: no browse UI changes in this batch.
 *
 * A game counts only when its tag validates against the seed AND
 * names Pakistan (countryCode 'PK') — any Pakistan syllabus (NCP
 * 2022, BISE/FBISE, AKU-EB, Cambridge, IB) counts, because the tag
 * means "made for Pakistan". Public only, so a pending kid game can
 * never appear here. Returns [] / 0 on any error (e.g. placeholder
 * env at build time), so the page renders the honest empty state
 * and stays noindex instead of inventing games.
 */
export async function fetchPakistanCurriculumActivities(
  limit = 100,
): Promise<{ activities: PakistanCurriculumActivity[]; count: number }> {
  // Node fetch has no default timeout: on this VM a dead host hangs
  // instead of failing (observed 2026-11-05 — a plain Node fetch to
  // the placeholder host never returns, while curl fails in 0.25s).
  // Race the queries so a hung network can never hang a build or a
  // page render; a timeout is just another empty result. 10s is far
  // above a real Supabase round-trip for this select (<1s).
  const queryTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Pakistan hub query timed out')), 10_000),
  )
  try {
    const supabase = createServerClient()
    const [countRes, dataRes] = await Promise.race([
      Promise.all([
        supabase
          .from('activities')
          .select('id', { count: 'exact', head: true })
          .eq('is_public', true)
          .filter('content->curriculum->>countryCode', 'eq', 'PK'),
        supabase
          .from('activities')
          .select('id, title, description, subject, grade, type, content')
          .eq('is_public', true)
          .filter('content->curriculum->>countryCode', 'eq', 'PK')
          .order('created_at', { ascending: false })
          .range(0, limit - 1),
      ]),
      queryTimeout,
    ])
    if (countRes.error || dataRes.error) return { activities: [], count: 0 }
    const rows = (dataRes.data ?? []) as Array<{
      id: string
      title: string
      description: string | null
      subject: string
      grade: string
      type: string
      content?: { curriculum?: unknown } | null
    }>
    const activities: PakistanCurriculumActivity[] = rows
      .map((row) => {
        const raw = row.content?.curriculum
        const tag =
          raw && typeof raw === 'object'
            ? resolveCurriculumTag(
                (raw as { countryCode?: unknown }).countryCode,
                (raw as { syllabusSlug?: unknown }).syllabusSlug,
              )
            : null
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          subject: row.subject,
          grade: row.grade,
          type: row.type,
          curriculum: tag && tag.countryCode === 'PK' ? tag : null,
        }
      })
      // Defence in depth: a row can only carry a server-validated tag,
      // so this drops nothing in practice — it only guards against a
      // hand-written row with a stale or invented syllabus slug.
      .filter((a) => a.curriculum !== null)
    // The displayed count is the validated total whenever this page
    // holds every match; above the limit it is the DB total (a row can
    // only carry a server-validated tag, so validated == DB total in
    // practice — the page never overcounts).
    const dbCount = countRes.count ?? activities.length
    return { activities, count: dbCount <= limit ? activities.length : dbCount }
  } catch {
    return { activities: [], count: 0 }
  }
}

/**
 * BEAT-PLAN BUILD #3 — "Urdu games for kids" hub listing.
 *
 * Distinct filter: subject = 'Urdu' (DB_SUBJECT_BY_SLUG['urdu']),
 * ANY curriculum — a game counts by its subject column, never by a
 * curriculum tag, so Pakistani, Indian, diaspora and international
 * Urdu games all belong here. Public only, newest first. Same shape
 * and fail-to-empty behaviour as fetchPakistanCurriculumActivities
 * (same service-role client, same 10s timeout race — a hung network
 * can never hang a build or a page render), so the page renders the
 * honest empty state and stays noindex instead of inventing games.
 */
export async function fetchUrduSubjectActivities(
  limit = 100,
): Promise<{ activities: ProgrammaticActivity[]; count: number }> {
  const queryTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Urdu hub query timed out')), 10_000),
  )
  try {
    const supabase = createServerClient()
    const [countRes, dataRes] = await Promise.race([
      Promise.all([
        supabase
          .from('activities')
          .select('id', { count: 'exact', head: true })
          .eq('is_public', true)
          .eq('subject', DB_SUBJECT_BY_SLUG.urdu),
        supabase
          .from('activities')
          .select('id, title, description, subject, grade, type')
          .eq('is_public', true)
          .eq('subject', DB_SUBJECT_BY_SLUG.urdu)
          .order('created_at', { ascending: false })
          .range(0, limit - 1),
      ]),
      queryTimeout,
    ])
    if (countRes.error || dataRes.error) return { activities: [], count: 0 }
    const activities = (dataRes.data ?? []) as ProgrammaticActivity[]
    const dbCount = countRes.count ?? activities.length
    return { activities, count: dbCount <= limit ? activities.length : dbCount }
  } catch {
    return { activities: [], count: 0 }
  }
}

/**
 * BEAT-PLAN BUILD #6 — "Free educational games for kids" hub listing.
 *
 * Distinct filter: NONE — every public game is free to play, so this
 * hub lists ALL public games, newest first. That is exactly why the
 * page is a value-proposition landing page (free + ad-free promise,
 * safety note, capped start-here picks, FAQ), NOT a second browse
 * catalogue: /en/browse is the filterable catalogue (filters, sort,
 * 500 per page); this page shows only 12 newest games plus subject
 * and type entry points and answers the parent's "is it really free
 * and safe?" questions. Same shape and fail-to-empty behaviour as
 * the subject helpers (same service-role client, same 10s timeout
 * race), so the page renders the honest empty state and stays
 * noindex instead of inventing games.
 *
 * LIVE COUNT (verified 2026-11-05 against GET /api/activities?
 * sort=newest — pagination.total): 5,112 public games (5,110
 * programme + 2 saved since). The hub is POPULATED from day one.
 */
export async function fetchFreeEducationalGamesActivities(
  limit = 12,
): Promise<{ activities: ProgrammaticActivity[]; count: number }> {
  const queryTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Free games hub query timed out')), 10_000),
  )
  try {
    const supabase = createServerClient()
    const [countRes, dataRes] = await Promise.race([
      Promise.all([
        supabase
          .from('activities')
          .select('id', { count: 'exact', head: true })
          .eq('is_public', true),
        supabase
          .from('activities')
          .select('id, title, description, subject, grade, type')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .range(0, limit - 1),
      ]),
      queryTimeout,
    ])
    if (countRes.error || dataRes.error) return { activities: [], count: 0 }
    const activities = (dataRes.data ?? []) as ProgrammaticActivity[]
    const dbCount = countRes.count ?? activities.length
    return { activities, count: dbCount <= limit ? activities.length : dbCount }
  } catch {
    return { activities: [], count: 0 }
  }
}
/**
 * BEAT-PLAN BUILD #4 — "Islamiyat quiz" hub listing.
 *
 * Distinct filter: subject = 'Islamiyat' (DB_SUBJECT_BY_SLUG['islamiat']),
 * ANY curriculum — a game counts by its subject column, never by a
 * curriculum tag, so Pakistani, diaspora and international Islamiyat
 * games all belong here. Public only, newest first. Same shape and
 * fail-to-empty behaviour as fetchUrduSubjectActivities (same
 * service-role client, same 10s timeout race — a hung network can
 * never hang a build or a page render), so the page renders the
 * honest empty state and stays noindex instead of inventing games.
 *
 * LIVE COUNT (verified 2026-11-05 against GET /api/activities?
 * subject=Islamiyat, all 342 rows fetched): 342 public games, ALL
 * subject=Islamiyat, ALL public — 23 per grade × 14 grades = 322
 * programme games + 20 older pre-k games; 23 types present. The hub
 * is POPULATED from day one — unlike hub #3, whose builder expected
 * 0 and found 342 live. The empty state is kept only as the honest
 * fallback for a fetch failure.
 */
export async function fetchIslamiyatSubjectActivities(
  limit = 100,
): Promise<{ activities: ProgrammaticActivity[]; count: number }> {
  const queryTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Islamiyat hub query timed out')), 10_000),
  )
  try {
    const supabase = createServerClient()
    const [countRes, dataRes] = await Promise.race([
      Promise.all([
        supabase
          .from('activities')
          .select('id', { count: 'exact', head: true })
          .eq('is_public', true)
          .eq('subject', DB_SUBJECT_BY_SLUG.islamiat),
        supabase
          .from('activities')
          .select('id, title, description, subject, grade, type')
          .eq('is_public', true)
          .eq('subject', DB_SUBJECT_BY_SLUG.islamiat)
          .order('created_at', { ascending: false })
          .range(0, limit - 1),
      ]),
      queryTimeout,
    ])
    if (countRes.error || dataRes.error) return { activities: [], count: 0 }
    const activities = (dataRes.data ?? []) as ProgrammaticActivity[]
    const dbCount = countRes.count ?? activities.length
    return { activities, count: dbCount <= limit ? activities.length : dbCount }
  } catch {
    return { activities: [], count: 0 }
  }
}
