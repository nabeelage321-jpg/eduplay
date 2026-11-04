/**
 * Spell It — pure round-building logic (type 35, third of the
 * remaining 8 toward 40). No React here, so it is unit-testable
 * and shared by the player and the print worksheet.
 *
 * The game: the player must spell the answer word for a shown
 * prompt/clue, letter by letter, in order. Nothing is invented:
 * every round is a real item from the teacher's own game, and
 * the word to spell is that item's own answer.
 *
 * Rules (exact, also stated in the player's How to Play):
 * - 3 lives. +1 point per correct letter, +5 bonus per completed
 *   word. A round's max is its letter count + 5, so the game's
 *   max score is the sum of its rounds' maxima.
 * - One round per usable item (prompt present and answer
 *   containing at least one letter). Items with no letter in
 *   the answer have nothing to spell, so they are not rounds;
 *   a game with no usable item shows "no words to spell yet".
 * - Letters are entered in order, by typing or by tapping the
 *   on-screen A–Z keyboard (Latin letters; answers in other
 *   scripts are typed on the device keyboard). Comparison is
 *   case-insensitive; a locked letter shows the answer's own
 *   character.
 * - A correct letter locks green with a correct sound and +1
 *   point. A wrong letter flashes red with a wrong sound, is
 *   rejected (the blank stays empty), and costs NO life — it
 *   costs time only. Lives are lost only by running out of
 *   time or by skipping a word.
 * - Spaces in an answer show as word gaps; non-letter,
 *   non-space characters (digits, hyphens, apostrophes) are
 *   shown revealed — they are not letters to spell and earn
 *   no points.
 * - 60 seconds per word, one timer warning at 10 seconds left.
 *   Time-up costs 1 life and the word is skipped. The "Skip
 *   word" button also costs 1 life and skips the word.
 * - All words attempted with lives left = win; 0 lives =
 *   game over.
 */

export const SPELL_IT_LIVES = 3
export const SPELL_IT_WORD_SECONDS = 60
export const SPELL_IT_WARNING_SECONDS = 10
export const SPELL_IT_LETTER_POINTS = 1
export const SPELL_IT_WORD_BONUS = 5

export type SpellItCellKind = 'letter' | 'gap' | 'shown'

export interface SpellItCell {
  kind: SpellItCellKind
  /** The answer's own character (for 'letter' cells, the letter to spell). */
  char: string
}

export interface SpellItRound {
  /** The clue/question the word answers (the item's prompt). */
  prompt: string
  /** The full answer word (never shown on the student sheet / in play). */
  answer: string
  /** Display cells, in answer order. */
  cells: SpellItCell[]
  /** Number of letters to spell (cells of kind 'letter'). */
  letterCount: number
  /** Max points for this round: letters + word bonus. */
  maxPoints: number
}

interface SpellItItem {
  prompt: string
  answer: string
}

const isLetter = (ch: string): boolean => /\p{L}/u.test(ch)

/**
 * Split an answer into display cells: letters become blanks to
 * spell, spaces become word gaps, everything else is shown
 * revealed. Shared by the player and the print worksheet so the
 * two can never disagree about what a word looks like.
 */
export function spellItCells(answer: string): SpellItCell[] {
  return [...answer].map((ch) => {
    if (ch === ' ') return { kind: 'gap' as const, char: ch }
    if (isLetter(ch)) return { kind: 'letter' as const, char: ch }
    return { kind: 'shown' as const, char: ch }
  })
}

/** True when the answer has at least one letter to spell. */
export function spellItIsUsable(item: SpellItItem): boolean {
  return Boolean(item.prompt && item.answer && [...item.answer].some(isLetter))
}

/**
 * Build one round per usable item.
 *
 * Player mode (deterministic: false): round order is shuffled.
 * Print mode (deterministic: true): original item order, so the
 * student worksheet and the answer key can never drift apart.
 * Either way every round is a real item, and no answer is ever
 * invented or rewritten.
 */
export function buildSpellItRounds<T extends SpellItItem>(
  items: T[],
  opts?: { deterministic?: boolean; shuffle?: <U>(arr: U[]) => U[] },
): SpellItRound[] {
  const usable = items.filter(spellItIsUsable)
  if (usable.length === 0) return []
  const shuffleFn =
    opts?.shuffle ??
    (<U>(arr: U[]): U[] => {
      const copy = [...arr]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    })
  const ordered = opts?.deterministic === true ? usable : shuffleFn(usable)
  return ordered.map((item) => {
    const cells = spellItCells(item.answer)
    const letterCount = cells.filter((c) => c.kind === 'letter').length
    return {
      prompt: item.prompt,
      answer: item.answer,
      cells,
      letterCount,
      maxPoints: letterCount * SPELL_IT_LETTER_POINTS + SPELL_IT_WORD_BONUS,
    }
  })
}
