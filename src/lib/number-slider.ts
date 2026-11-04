/**
 * Number Slider — pure round + number-line logic (type 40, last
 * of the remaining 8 toward 40). No React here, so it is
 * unit-testable and shared by the player and the print
 * worksheet (the worksheet draws the same line the player
 * slides on, so sheet and key can never drift apart).
 *
 * The game: the player answers by SLIDING a marker along a
 * number line to the answer value, then confirming — the
 * skill is judging magnitude and position, not typing
 * digits and not picking an option.
 *
 * How this differs from the look-alikes (audit,
 * 2026-11-04 — read before building, not assumed):
 * - Typing Race types the answer's digits against the
 *   clock (30 seconds, retry on a wrong try, streak
 *   bonus). Number Slider never types a digit: the
 *   answer is a position on a line, chosen with a
 *   slider (mouse, touch, or arrow keys) and locked in
 *   with one confirm.
 * - Order drags ALL items into one sequence and checks
 *   the whole set once (no lives, no per-item timer,
 *   retry allowed). Number Slider never arranges a
 *   sequence: one round at a time, one value at a
 *   time, immediate feedback per round, lives and a
 *   per-round timer, and a confirmed value is locked
 *   — it is never re-dragged.
 * - Quiz (and Quiz-family) picks one option from a
 *   list. Number Slider offers no options at all: the
 *   whole line is the answer space, so a near miss is
 *   possible and is scored as one (see below).
 * - Speed Judge judges one claim at a time (Correct or
 *   Wrong), 10 seconds, no line, no position. Number
 *   Slider never judges a claim: it places a value.
 * - No slider, number-line, or estimation mechanic
 *   exists anywhere else on EduPlay (codebase grep,
 *   2026-11-04: no "slider", "number line", or
 *   "estimation" in any player or logic file).
 *
 * Rules (exact, also stated in the player's How to Play):
 * - 3 lives. One round per usable item: prompt present
 *   and answer parsing as a finite number (see
 *   parseNumberAnswer). A game with no usable item
 *   shows "This game has no numbers to slide to yet."
 *   Non-numeric items are skipped in the player's own
 *   rounds — they are never forced onto a slider.
 *   (Convert is stricter: it refuses a game unless
 *   EVERY answer is numeric, so convert never drops an
 *   item — see convert.ts.)
 * - The line: one shared line per game, built from ALL
 *   the game's numeric answers (not per round, so the
 *   line never moves between rounds and can never leak
 *   a single round's answer). lineMin is 0 when every
 *   answer is >= 0, otherwise the lowest answer minus
 *   padding, rounded down to a step; lineMax is the
 *   highest answer plus padding, rounded up to a step.
 *   Padding is max(2, a quarter of the answer span),
 *   so the highest answer never sits exactly on the
 *   end of the line. Step is 1 for integer answers
 *   (5 when the span is over 100), or 10^-decimals
 *   when answers carry decimals (capped at 2 places).
 * - Scoring, exact: an EXACT hit (slider value equals
 *   the answer) earns +10. A NEAR miss (off by more
 *   than zero but no more than the tolerance — the
 *   larger of one step and 5% of the line span) earns
 *   +5, because estimation this close is good
 *   estimating, not a failure. A FAR miss (beyond the
 *   tolerance) earns 0 and costs 1 life. Score is out
 *   of 10 x rounds; the end screen also reports exact
 *   hits ("E exact of R rounds"), because a near miss
 *   is not an exact hit even though it scores.
 * - Timer: 30 seconds per round, one timer warning at
 *   5 seconds left; time-up costs 1 life ("Time's
 *   up!") and the round is skipped.
 * - Win: all rounds done with lives left ("Number
 *   Slider Complete!"); 0 lives = game over
 *   ("Out of lives!"). onComplete fires exactly once
 *   with the real score + exact/total counts + lives
 *   left.
 *
 * Nothing is invented: every round is a real item from
 * the teacher's own game, every value on the line is a
 * real answer from that same game, and the line range
 * is computed from those answers only.
 */

export const NUMBER_SLIDER_LIVES = 3
export const NUMBER_SLIDER_ROUND_SECONDS = 30
export const NUMBER_SLIDER_WARNING_SECONDS = 5
export const NUMBER_SLIDER_POINTS_EXACT = 10
export const NUMBER_SLIDER_POINTS_NEAR = 5

export interface NumberSliderItem {
  prompt: string
  answer: string
}

export interface NumberSliderRound {
  /** The question (the item's prompt). */
  prompt: string
  /** The numeric answer. */
  answer: number
  /** The answer exactly as the teacher wrote it (for the print key). */
  answerText: string
}

export interface NumberSliderLine {
  min: number
  max: number
  step: number
  /** Largest miss that still counts as "near" (see scoring). */
  tolerance: number
  /** Five labelled ticks: min, 25%, 50%, 75%, max. */
  ticks: number[]
}

/**
 * Parse a teacher-written answer as a number, or null when it
 * is not a plain number. Accepts an optional sign, thousands
 * commas, and decimals ("2", "-3.5", "2,000"); refuses words,
 * fractions, expressions, and anything else ("twenty",
 * "2 × 10", "3/4", ""), so a word answer can never be
 * forced onto a number line.
 */
export function parseNumberAnswer(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const cleaned = raw.trim().replace(/,/g, '').replace(/\s+/g, '')
  if (!/^[+-]?\d+(\.\d+)?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/** Decimal places in a parsed number, capped at 2 (line-step granularity). */
function decimalPlaces(value: number): number {
  const text = String(value)
  const dot = text.indexOf('.')
  if (dot === -1) return 0
  return Math.min(2, text.length - dot - 1)
}

/** Format a line value for display: up to 2 decimals, no trailing zeros. */
export function formatLineValue(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return String(rounded)
}

/**
 * One shared line per game, from ALL its numeric answers.
 * Deterministic: the same answers always build the same
 * line, so the player and the print worksheet agree.
 */
export function buildNumberSliderLine(answers: number[]): NumberSliderLine {
  const lo = Math.min(...answers)
  const hi = Math.max(...answers)
  const span = hi - lo
  const decimals = Math.max(0, ...answers.map(decimalPlaces))
  const step = decimals > 0 ? Math.pow(10, -decimals) : span > 100 ? 5 : 1
  const pad = span === 0 ? Math.max(2, Math.abs(hi) * 0.25) : Math.max(2, span * 0.25)
  const min = lo >= 0 ? 0 : Math.floor((lo - pad) / step) * step
  const max = Math.ceil((hi + pad) / step) * step
  const lineSpan = max - min
  const tolerance = Math.max(step, lineSpan * 0.05)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((min + lineSpan * f) * 100) / 100)
  return { min, max, step, tolerance, ticks }
}

/**
 * One round per usable item (prompt present, answer parses
 * as a number). Player mode shuffles; print mode
 * (deterministic: true) keeps original order so the
 * worksheet and the key below are built from the exact
 * same rounds and can never drift apart.
 */
export function buildNumberSliderRounds<T extends NumberSliderItem>(
  items: T[],
  opts?: { deterministic?: boolean; shuffle?: <U>(arr: U[]) => U[] },
): NumberSliderRound[] {
  if (!items || items.length === 0) return []
  const usable = items
    .filter((i) => i.prompt?.trim() && parseNumberAnswer(i.answer) !== null)
    .map((i) => ({
      prompt: i.prompt,
      answer: parseNumberAnswer(i.answer) as number,
      answerText: i.answer.trim(),
    }))
  if (usable.length === 0) return []
  if (opts?.deterministic === true) return usable
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
  return shuffleFn(usable)
}

/** Score a confirmed slider value: 'exact' (+10), 'near' (+5), or 'far' (0 + 1 life). */
export function scoreNumberSliderGuess(
  guess: number,
  answer: number,
  line: NumberSliderLine,
): { kind: 'exact' | 'near' | 'far'; points: number } {
  const diff = Math.abs(guess - answer)
  if (diff < 1e-9) return { kind: 'exact', points: NUMBER_SLIDER_POINTS_EXACT }
  if (diff <= line.tolerance) return { kind: 'near', points: NUMBER_SLIDER_POINTS_NEAR }
  return { kind: 'far', points: 0 }
}
