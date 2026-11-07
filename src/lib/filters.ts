/**
 * Shared activity-filter mapping — single source of truth.
 *
 * BUG FIX (2026-10-30): the Activities page filter sent display labels
 * to /api/activities, which does an exact `eq` on the DB columns.
 * `subject=Mathematics` vs DB `Math`, and `grade=Pre-K` vs DB `pre-k`,
 * therefore returned 0 rows even though the DB holds 5,110 games.
 * Display labels and DB values are now kept separate everywhere:
 * <option value> is ALWAYS the DB value, the visible text is the label.
 *
 * DB values below are the live `activities` column values — do not
 * rename them here; if the DB ever changes, change this file only.
 */

export interface FilterOption {
  /** Exact live DB column value, sent to /api/activities. */
  value: string
  /** Human-readable label shown in the <select>. */
  label: string
}

export const FILTER_SUBJECTS: FilterOption[] = [
  { value: 'Math', label: 'Mathematics' },
  { value: 'English', label: 'English' },
  { value: 'Urdu', label: 'Urdu' },
  { value: 'Science', label: 'Science' },
  { value: 'Islamiyat', label: 'Islamiyat' },
  { value: 'Social Studies', label: 'Social Studies' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Art', label: 'Art' },
  { value: 'Physical Education', label: 'Physical Education' },
  { value: 'Geography', label: 'Geography' },
  { value: 'History', label: 'History' },
  { value: 'General Knowledge', label: 'General Knowledge' },
  { value: 'Biology', label: 'Biology' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Physics', label: 'Physics' },
]

/**
 * Game-type options for browse. Values are the exact live DB `type`
 * column values (same rule as subjects/grades above); labels are the
 * English display names from the activity-types seed. The only
 * slug/DB mismatch is Word Search: the creator slug is 'wordsearch',
 * the DB value is 'word-search' (see normalizeTypeFilter below).
 * STRUCTURED BROWSE v1 (2026-11-04): this list powers the browse
 * type filter; it is not a new game type and changes no gameplay.
 */
export const FILTER_TYPES: FilterOption[] = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'match-up', label: 'Match Up' },
  { value: 'anagram', label: 'Anagram' },
  { value: 'crossword', label: 'Crossword' },
  { value: 'word-search', label: 'Word Search' },
  { value: 'spin-wheel', label: 'Spin the Wheel' },
  { value: 'balloon-pop', label: 'Balloon Pop' },
  { value: 'whack-a-mole', label: 'Whack a Mole' },
  { value: 'true-false', label: 'True or False' },
  { value: 'categorize', label: 'Categorize' },
  { value: 'order', label: 'Order' },
  { value: 'fill-blank', label: 'Fill in the Blank' },
  { value: 'labelled-diagram', label: 'Labelled Diagram' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'missing-word', label: 'Missing Word' },
  { value: 'unjumble', label: 'Unjumble' },
  { value: 'gameshow-quiz', label: 'Gameshow Quiz' },
  { value: 'hangman', label: 'Hangman' },
  { value: 'random-wheel', label: 'Random Wheel' },
  { value: 'open-box', label: 'Open the Box' },
  { value: 'memory-match', label: 'Memory Match' },
  { value: 'typing-race', label: 'Typing Race' },
  { value: 'bingo', label: 'Bingo' },
  { value: 'jump-path', label: 'Jump Path' },
  { value: 'riddle', label: 'Riddle' },
  { value: 'aster-quiz', label: 'AsterQuiz' },
  { value: 'dictation', label: 'Dictation' },
  { value: 'dialogue', label: 'Dialogue' },
  { value: 'map-quiz', label: 'Map Quiz' },
  { value: 'jigsaw-puzzle', label: 'Jigsaw Puzzle' },
  { value: 'video-quiz', label: 'Video Quiz' },
  { value: 'letter-wheel', label: 'Letter Wheel' },
  { value: 'maze-run', label: 'Maze Run' },
  { value: 'speed-judge', label: 'Speed Judge' },
  { value: 'spell-it', label: 'Spell It' },
  { value: 'picture-answer', label: 'Picture Answer' },
  { value: 'memory-recall', label: 'Memory Recall' },
  { value: 'claim-line', label: 'Claim Line' },
  { value: 'opinion-cloud', label: 'Opinion Cloud' },
  { value: 'number-slider', label: 'Number Slider' },
  { value: 'maze-chase', label: 'Maze Chase' },
  { value: 'apple-snake', label: 'Apple Snake' },
  { value: 'flutter-flight', label: 'Flutter Flight' },
  { value: 'sweet-match', label: 'Sweet Match' },
  { value: 'star-shooter', label: 'Star Shooter' },
  { value: 'jump-blocks', label: 'Jump Blocks' },
  { value: 'fruit-slice', label: 'Fruit Slice' },
  { value: 'river-hop', label: 'River Hop' },
]

export const FILTER_GRADES: FilterOption[] = [
  { value: 'pre-k', label: 'Pre-K' },
  { value: 'kg', label: 'Kindergarten' },
  { value: 'grade-1', label: 'Grade 1' },
  { value: 'grade-2', label: 'Grade 2' },
  { value: 'grade-3', label: 'Grade 3' },
  { value: 'grade-4', label: 'Grade 4' },
  { value: 'grade-5', label: 'Grade 5' },
  { value: 'grade-6', label: 'Grade 6' },
  { value: 'grade-7', label: 'Grade 7' },
  { value: 'grade-8', label: 'Grade 8' },
  { value: 'grade-9', label: 'Grade 9' },
  { value: 'grade-10', label: 'Grade 10' },
  { value: 'grade-11', label: 'Grade 11' },
  { value: 'grade-12', label: 'Grade 12' },
]

/** Legacy display labels -> DB values, for old URLs/bookmarks. */
const SUBJECT_LABEL_TO_DB: Record<string, string> = {
  mathematics: 'Math',
  math: 'Math',
}

const GRADE_LABEL_TO_DB: Record<string, string> = {
  'pre-k': 'pre-k',
  prek: 'pre-k',
  kindergarten: 'kg',
  kg: 'kg',
}

/** Normalize a subject filter value to the exact DB value. */
export function normalizeSubjectFilter(input: string): string {
  const v = input.trim()
  if (!v) return ''
  if (FILTER_SUBJECTS.some((s) => s.value === v)) return v
  return SUBJECT_LABEL_TO_DB[v.toLowerCase()] ?? v
}

/**
 * BEAT-PLAN BUILD #3 — resolve a raw ?subject= value to a canonical
 * DB subject value, or '' when it is not a known subject. Mirrors
 * resolveInitialCountry (curricula.ts): an exact subject name
 * (case-insensitive, trimmed) preselects it, anything else means no
 * preselection — never a crash and never a guessed subject. The
 * legacy display labels ('math', 'mathematics') resolve to 'Math'
 * exactly like the browse normalizer; every other unknown value
 * returns '' instead of passing through.
 */
export function resolveInitialSubject(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return ''
  const name = value.trim().toLowerCase()
  if (!name) return ''
  const match = FILTER_SUBJECTS.find((s) => s.value.toLowerCase() === name)
  if (match) return match.value
  return SUBJECT_LABEL_TO_DB[name] ?? ''
}

/** Normalize a grade filter value to the exact DB value. */
export function normalizeGradeFilter(input: string): string {
  const v = input.trim()
  if (!v) return ''
  if (FILTER_GRADES.some((g) => g.value === v)) return v
  const lower = v.toLowerCase()
  if (GRADE_LABEL_TO_DB[lower]) return GRADE_LABEL_TO_DB[lower]
  const m = /^grade\s+(\d+)$/.exec(lower)
  if (m) return `grade-${m[1]}`
  return v
}

/**
 * Normalize a type filter value to the exact DB value.
 * The only mismatch: the creator TypeSelector slug is 'wordsearch',
 * the live DB (and play router) use 'word-search'. Every other
 * type slug already matches its DB value exactly.
 */
export function normalizeTypeFilter(input: string): string {
  return input.trim() === 'wordsearch' ? 'word-search' : input.trim()
}
