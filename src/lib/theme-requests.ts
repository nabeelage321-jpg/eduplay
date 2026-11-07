/**
 * THEME REQUESTS (2026-11-07, build-list final 6, item 9).
 *
 * Signed-in users ask the EduPlay team for a theme under the 15 kids
 * worlds: "What theme do you want to add? Please message us." The
 * request goes TO THE TEAM — never user-to-user chat (no user-to-user
 * messaging exists on this platform and this feature must not create
 * one). Identical requests aggregate into a count; a theme is flagged
 * once it reaches 100 requests. The flag is only a flag: the team
 * adds the theme in a later step, it is never auto-created.
 *
 * Pure helpers only — the API route does the DB work, the UI does the
 * rendering. Kept separate so the counting rule is testable without a
 * database.
 */

/** Requests needed before a theme is flagged for the team to add. */
export const THEME_REQUEST_THRESHOLD = 100

/** Clean a submitted theme name: trim, collapse inner spaces, 1–60 chars. */
export function cleanThemeName(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const cleaned = raw.trim().replace(/\s+/g, ' ')
  if (cleaned.length < 1 || cleaned.length > 60) return null
  return cleaned
}

export interface ThemeRequestRow {
  theme_name: string
  user_id: string
}

export interface AggregatedThemeRequest {
  /** Display name: the first-seen original casing. */
  name: string
  /** Distinct users who asked for this theme. */
  count: number
  /** True once the count reaches THEME_REQUEST_THRESHOLD. */
  ready: boolean
}

/**
 * Aggregate raw request rows into per-theme counts. Grouping is by
 * lower-cased name (so "Space" and "space" are one theme); a user
 * counts once per theme even if duplicate rows exist (the DB also
 * enforces one request per user per theme name).
 */
export function aggregateThemeRequests(rows: ThemeRequestRow[]): AggregatedThemeRequest[] {
  const byKey = new Map<string, { name: string; users: Set<string> }>()
  for (const row of rows) {
    const name = cleanThemeName(row.theme_name)
    if (!name || !row.user_id) continue
    const key = name.toLowerCase()
    const entry = byKey.get(key) ?? { name, users: new Set<string>() }
    entry.users.add(row.user_id)
    byKey.set(key, entry)
  }
  return [...byKey.values()]
    .map(({ name, users }) => ({ name, count: users.size, ready: users.size >= THEME_REQUEST_THRESHOLD }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
