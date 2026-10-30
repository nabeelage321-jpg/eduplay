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
