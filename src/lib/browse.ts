/**
 * Structured browse v1 (2026-11-04) — pure helpers for the browse page.
 * No React, no network: the browse page reads public state only and
 * never changes any game's public/private state.
 */
import { FILTER_SUBJECTS, FILTER_GRADES, FILTER_TYPES } from './filters'

export const BROWSE_GRADE_ALL = 'all'
export const BROWSE_SUBJECT_ALL = 'All Subjects'
export const BROWSE_TYPE_ALL = 'All Types'

export const BROWSE_SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'popular', label: 'Most played' },
  { value: 'az', label: 'A–Z' },
]

// "New" means really recently added: created within the last 14 days
// from the game's real created_at. Older games never get the badge,
// however high they rank in the Newest sort.
export const BROWSE_NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

export function browseIsNew(createdAt: string): boolean {
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return false
  const age = Date.now() - t
  return age >= 0 && age <= BROWSE_NEW_WINDOW_MS
}

export function browseFormatAdded(createdAt: string): string {
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Normalize a possibly stale/bookmarked URL value to a known option
// value, or the "all" sentinel. The API normalizes server-side too;
// this only keeps the <select> from showing a blank value.
export function browseNormalizeGradeParam(raw: string | null): string {
  if (!raw) return BROWSE_GRADE_ALL
  const v = raw.trim()
  if (FILTER_GRADES.some((g) => g.value === v)) return v
  const lower = v.toLowerCase()
  if (lower === 'pre-k' || lower === 'prek') return 'pre-k'
  if (lower === 'kindergarten' || lower === 'kg') return 'kg'
  const m = /^grade\s+(\d+)$/.exec(lower)
  if (m) return `grade-${m[1]}`
  return BROWSE_GRADE_ALL
}

export function browseNormalizeSubjectParam(raw: string | null): string {
  if (!raw) return BROWSE_SUBJECT_ALL
  const v = raw.trim()
  if (FILTER_SUBJECTS.some((s) => s.value === v)) return v
  if (v.toLowerCase() === 'mathematics') return 'Math'
  return BROWSE_SUBJECT_ALL
}

export function browseNormalizeTypeParam(raw: string | null): string {
  if (!raw) return BROWSE_TYPE_ALL
  const v = raw.trim()
  if (FILTER_TYPES.some((t) => t.value === v)) return v
  if (v === 'wordsearch') return 'word-search'
  return BROWSE_TYPE_ALL
}

export function browseNormalizeSortParam(raw: string | null): string {
  if (raw === 'popular' || raw === 'az') return raw
  return 'newest'
}

// Build the /api/activities query for a filtered browse view.
// Deliberately no is_public parameter: the API hard-filters
// is_public = true server-side, so a private or pending game can
// never appear here whatever the client sends.
export function browseBuildQuery(opts: {
  grade: string
  subject: string
  type: string
  sort: string
  search: string
}): string {
  const params = new URLSearchParams()
  if (opts.grade !== BROWSE_GRADE_ALL) params.append('grade', opts.grade)
  if (opts.subject !== BROWSE_SUBJECT_ALL) params.append('subject', opts.subject)
  if (opts.type !== BROWSE_TYPE_ALL) params.append('type', opts.type)
  if (opts.search) params.append('search', opts.search)
  params.append('sort', opts.sort)
  return params.toString()
}
