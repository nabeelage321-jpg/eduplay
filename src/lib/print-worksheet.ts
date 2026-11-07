/**
 * Print worksheet rules (2026-11-04, Print/PDF worksheet v1).
 *
 * Browser Save as PDF is the PDF route in v1 — there is NO server
 * PDF generation and NO new PDF library in this batch. A teacher
 * opens the print view and picks "Save as PDF" in the browser's
 * own print dialog. Server-generated PDF export, if ever wanted,
 * is a separate phase-2 batch.
 *
 * A type prints ONLY when its questions can be rendered as text
 * on paper. Image, map, video and audio tasks cannot — they get
 * NO print button, never a mangled printout. Grid games (crossword,
 * word search) also do not print in v1: a clue/word list without
 * its grid is not the game, and building a printable grid is
 * phase-2 work, not faked here.
 */

/** DB type spellings differ in one place: 'word-search' vs 'wordsearch'. */
export function normalizeWorksheetTypeSlug(slug: string | undefined | null): string {
  if (!slug) return ''
  return slug === 'word-search' ? 'wordsearch' : slug
}

/**
 * Types whose items print as a proper student worksheet.
 * - quiz / gameshow-quiz / jump-path / aster-quiz / balloon-pop /
 *   whack-a-mole / spin-wheel / open-box / typing-race: text
 *   question + answer items (options shown as blank checkboxes
 *   when present, never with the correct one marked).
 * - match-up / memory-match: two-column matching (special format).
 * - fill-blank / missing-word: sentence with a blank line.
 * - true-false: True / False checkboxes.
 * - unjumble / anagram: jumbled text + writing line.
 * - flashcards: prompt only + writing line (the answer lives
 *   ONLY in the answer key, never on the student sheet).
 * - hangman: clue + letter blanks. riddle / letter-wheel:
 *   clue or definition + writing line. categorize / bingo:
 *   prompt + writing line. order: shuffled list + "write the
 *   correct position" blanks. speed-judge: claim statement
 *   (prompt + claimed answer, deterministic so worksheet and
 *   key agree) + Correct / Wrong checkboxes; the key lists the
 *   correct judgement per round, never the judgement on the
 *   student sheet. spell-it: clue + letter blanks (spaces as
 *   gaps, non-letters shown), key lists the word — never on
 *   the student sheet. picture-answer: the item's picture
 *   when it carries one (a plain "No picture" line when it
 *   does not — never a fake picture) + clue + option
 *   checkboxes, key lists the answer — never on the student
 *   sheet. A printed picture is the teacher's own URL, so a
 *   printed sheet only shows pictures the teacher already
 *   supplied; the browser prints the image from its URL.
 * - memory-recall: prompt + writing line (answer from
 *   memory, never on the student sheet), key lists the
 *   answer — never on the student sheet. The on-screen
 *   study phase has no paper equivalent, so the sheet
 *   says plainly to answer from memory.
 * - claim-line: an empty 3x3 board to mark by hand +
 *   questions with option checkboxes (deterministic
 *   question order, options stably shuffled so the sheet
 *   never leaks the answer position), key lists the
 *   answer — never on the student sheet. The on-screen
 *   computer opponent has no paper equivalent, so the
 *   sheet says plainly to play with a friend, taking
 *   turns, or on your own.
 * - opinion-cloud: a KEYLESS opinion sheet — statements
 *   with Agree / Disagree / Not sure checkboxes and a
 *   plain "no right answers" note. There is deliberately
 *   NO answer key page for this type: opinions have no
 *   right answers, so a key would be a lie; the final
 *   page states plainly that there is no key.
 * - number-slider: prompt + the game's shared number line
 *   to mark by hand (same line the player slides on, so
 *   sheet and key can never drift), key lists the exact
 *   value — never on the student sheet. Only questions
 *   with a number answer appear; a word answer has no
 *   position on the line, so the sheet says so plainly.
 */
export const PRINTABLE_WORKSHEET_TYPES: ReadonlySet<string> = new Set([
  'quiz',
  'gameshow-quiz',
  'match-up',
  'memory-match',
  'fill-blank',
  'missing-word',
  'true-false',
  'unjumble',
  'anagram',
  'flashcards',
  'hangman',
  'riddle',
  'letter-wheel',
  'categorize',
  'bingo',
  'order',
  'spin-wheel',
  'balloon-pop',
  'whack-a-mole',
  'open-box',
  'typing-race',
  'jump-path',
  'aster-quiz',
  'speed-judge',
  'spell-it',
  'picture-answer',
  'memory-recall',
  'claim-line',
  'opinion-cloud',
  'number-slider',
])

/** Deliberately NOT printable in v1, and why (shown as a plain note, never a printout). */
export const NOT_PRINTABLE_WORKSHEET_REASONS: Record<string, string> = {
  'labelled-diagram': 'This game needs its picture to label, so it cannot be printed as a text worksheet yet.',
  'map-quiz': 'This game needs its map to tap, so it cannot be printed as a text worksheet yet.',
  'video-quiz': 'This game needs its video to watch, so it cannot be printed as a text worksheet yet.',
  'jigsaw-puzzle': 'This game needs its picture pieces, so it cannot be printed as a text worksheet yet.',
  'dictation': 'This game needs its audio to hear, so it cannot be printed as a text worksheet yet.',
  'dialogue': 'This game is a conversation to follow, not a set of questions, so it has no worksheet yet.',
  'crossword': 'This game needs its grid, so a clue list alone is not printed yet.',
  'wordsearch': 'This game needs its letter grid, so a word list alone is not printed yet.',
  'random-wheel': 'This game picks a name or topic at random — it has no questions to print.',
  'maze-run': 'This game needs its maze to move through, so it cannot be printed as a text worksheet yet.',
  'maze-chase': 'This game needs its maze and moving ghost, so it cannot be printed as a text worksheet yet.',
  'apple-snake': 'This game needs its garden and moving snake, so it cannot be printed as a text worksheet yet.',
  'flutter-flight': 'This game needs its sky and flying bird, so it cannot be printed as a text worksheet yet.',
  'sweet-match': 'This game needs its swapping board, so it cannot be printed as a text worksheet yet.',
  'star-shooter': 'This game needs its sky and moving invaders, so it cannot be printed as a text worksheet yet.',
}

export function isPrintableWorksheetType(slug: string | undefined | null): boolean {
  return PRINTABLE_WORKSHEET_TYPES.has(normalizeWorksheetTypeSlug(slug))
}

export function notPrintableWorksheetReason(slug: string | undefined | null): string | null {
  return NOT_PRINTABLE_WORKSHEET_REASONS[normalizeWorksheetTypeSlug(slug)] ?? null
}

/**
 * Print-view audience rule: a print view follows the same audience
 * as play. A public game prints for anyone; a private game prints
 * ONLY for its owner. Callers pass isOwner from the session-scoped
 * /api/my-activities check (the same check HostLiveGame and the
 * play page's convert gate use); a signed-out viewer is never an
 * owner, so a private game's button never renders for them.
 */
export function canShowPrintButton(opts: {
  typeSlug: string | undefined | null
  isPublic: boolean
  isOwner: boolean
}): boolean {
  if (!isPrintableWorksheetType(opts.typeSlug)) return false
  if (opts.isPublic) return true
  return opts.isOwner
}

/** Small deterministic hash, so a shuffled column is stable per game. */
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Deterministic shuffle: the same items always print in the same
 * shuffled order, so the answer key's number→letter mapping can
 * never drift from the worksheet. Never used for gameplay, only
 * for the printed matching/order columns.
 */
export function stableShuffle<T>(items: readonly T[], keyOf: (item: T) => string): T[] {
  return [...items]
    .map((item, i) => ({ item, sort: hashString(keyOf(item)) * 1000 + i }))
    .sort((a, b) => a.sort - b.sort)
    .map((e) => e.item)
}

/** Escape user/creator text before it is interpolated into print HTML. */
export function escapePrintHtml(s: string | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
