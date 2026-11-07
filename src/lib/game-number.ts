/**
 * GAME NUMBER (batch-1 shared build, final list items 11–14).
 *
 * Every game gets a SHORT number (6 digits, starting at 100001) so
 * a teacher or parent can say it, write it on the board, or message
 * it — and a kid can type it into the search box and open the game
 * directly. The number lives in activities.game_number (migration
 * 011) with a sequence default, so new games get one automatically
 * and all 5,112 programme games are backfilled by the migration.
 *
 * Until the owner runs migration 011 in the Supabase SQL Editor,
 * the column does not exist: the API routes detect the missing
 * column (PostgREST 42703 / schema-cache miss) and answer
 * setupReady:false with a plain "not set up yet" — the site never
 * breaks and no number is ever faked. The play page, detail page
 * and grid render without a number when it is absent.
 */

/** A game number is 6 digits (the sequence starts at 100001). */
export function cleanGameNumber(raw: string | null | undefined): number | null {
  if (!raw || typeof raw !== 'string') return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 1 || digits.length > 6) return null
  const n = Number(digits)
  if (!Number.isInteger(n) || n < 1) return null
  return n
}

/** True when a Supabase error means the game-number setup has not
 *  run yet (missing column 42703 / missing table 42P01 / schema
 *  cache miss) — the "not set up yet" signal, never a 500. */
export function isGameNumberSetupError(message: string | null | undefined): boolean {
  return /game_number|could not find the column|relation .* does not exist|schema cache|42703|42P01/i.test(
    message ?? '',
  )
}

export function formatGameNumber(n: number): string {
  return String(n)
}
