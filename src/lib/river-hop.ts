/**
 * River Hop — pure crossing logic (no React, no sound, no storage).
 *
 * EduPlay's own Frogger-STYLE crossing game (type 48): the kid hops
 * across a busy road and then a river on logs and lily pads to reach
 * the far bank. Frogger-STYLE mechanic only: the name is EduPlay's
 * own, the hopper is a plain kid emoji, the pads are plain log and
 * lily-pad emojis with a number written on them, the cars are plain
 * car emojis — no Frogger name, no frog, no Konami art copied.
 * Nothing here invents content: the pads carry the game's real
 * answers — the counting-sequence numbers for the round plus wrong
 * numbers borrowed from the game's other items.
 *
 * The grid is 7 columns x 9 rows (row 0 at the top):
 * - row 0: far bank (the goal — reaching it completes the round)
 * - rows 1-3: river (logs and lily pads float across; the kid may
 *   only stand on a pad, never on open water)
 * - row 4: middle bank (safe ground between road and river)
 * - rows 5-7: road (cars drive across; touching one costs a life)
 * - row 8: start bank (where every round and every respawn begins)
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per completed crossing (per round, NOT per
 *   hop — a hop itself earns nothing), score out of 10 x rounds.
 *   One round per question, up to 10 rounds.
 * - The question is a counting sequence (e.g. "Count by 2s"), and
 *   the kid hops the pads IN SEQUENCE ORDER: the first river row
 *   holds the first number, the second row the second, the third
 *   row the third, and the far bank is the answer itself. The
 *   question is shown above the field; the correct answer is NEVER
 *   shown as a pad — the kid has to know the next number. The
 *   "Next hop" indicator always shows which number comes next.
 * - The three sequence numbers are derived from the round's own
 *   answer (a whole number of 4 or more): the step comes from the
 *   question when it says "count by Ns" (or "by Ns"), otherwise 2
 *   for an even answer and 1 for an odd one; when the step would
 *   push a term below zero it falls back to 1. The terms are the
 *   three numbers before the answer at that step (answer 8, step
 *   2 -> 2, 4, 6, and the far bank is 8). A round whose answer is
 *   not a whole number of 4 or more cannot be built.
 * - Each river row carries three pads: the correct next number
 *   plus two wrong numbers borrowed from the game's other items
 *   (distinct, never a sequence number and never the answer).
 * - Hopping onto the pad with the NEXT number in the sequence is
 *   safe. Hopping onto any other pad sinks it: -1 life, back to
 *   the start bank, and the sequence starts over. Hopping onto
 *   open water (a river cell with no pad) splashes: -1 life, same
 *   respawn. Hopping onto a road cell with a car — or a car
 *   driving onto the kid — is a hit: -1 life, same respawn.
 *   Once all three numbers are hopped the sequence is complete
 *   and any pad is safe to stand on while crossing to the far bank.
 * - Pads and cars move one cell per tick and wrap around the
 *   edges; a kid standing on a pad rides it as it moves. Adjacent
 *   rows move in opposite directions.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win.
 */

export const RIVER_HOP_LIVES = 3
export const RIVER_HOP_MAX_ROUNDS = 10
/** Points for one completed crossing (one round) — hops earn none. */
export const RIVER_HOP_POINTS_PER_ROUND = 10
/** Grid size. */
export const RIVER_HOP_COLS = 7
export const RIVER_HOP_ROWS = 9
/** Game tick: the player advances traffic every RIVER_HOP_TICK_MS. */
export const RIVER_HOP_TICK_MS = 500
/** How many wrong pads share a river row with the correct one. */
export const RIVER_HOP_WRONGS_PER_ROW = 2
/** How many distinct numeric wrong answers a round needs in total. */
export const RIVER_HOP_MIN_NUMERIC_WRONGS = 2

export const RIVER_HOP_GOAL_ROW = 0
export const RIVER_HOP_RIVER_ROWS = [1, 2, 3] as const
export const RIVER_HOP_MIDDLE_ROW = 4
export const RIVER_HOP_ROAD_ROWS = [5, 6, 7] as const
export const RIVER_HOP_START_ROW = 8
export const RIVER_HOP_START_COL = 3

/** River rows, bottom to top: the row each sequence term lives on. */
export const RIVER_HOP_TERM_ROWS = [3, 2, 1] as const
/** Traffic direction per row: adjacent rows move opposite ways. */
export const RIVER_HOP_ROW_DIRS: Record<number, 1 | -1> = {
  1: 1,
  2: -1,
  3: 1,
  5: -1,
  6: 1,
  7: -1,
}

export function isRiverRow(row: number): boolean {
  return row >= 1 && row <= 3
}

export function isRoadRow(row: number): boolean {
  return row >= 5 && row <= 7
}

/** Wrap a column around the grid edges (traffic wraps, the kid rides). */
export function wrapCol(col: number): number {
  return ((col % RIVER_HOP_COLS) + RIVER_HOP_COLS) % RIVER_HOP_COLS
}

export interface RiverHopPad {
  id: number
  row: number
  col: number
  label: string
  /** True only for the pad carrying the next number of the sequence. */
  correct: boolean
  kind: 'log' | 'lily'
}

export interface RiverHopCar {
  id: number
  row: number
  col: number
  emoji: string
}

export interface RiverHopPlayer {
  col: number
  row: number
}

/** The hopper's start spot: middle of the start bank. */
export const RIVER_HOP_START: RiverHopPlayer = { col: RIVER_HOP_START_COL, row: RIVER_HOP_START_ROW }

export interface RiverHopRound {
  prompt: string
  correctAnswer: string
  /** The three numbers to hop, in order, bottom river row first. */
  terms: string[]
  /** The counting step the terms were built with. */
  step: number
  pads: RiverHopPad[]
  cars: RiverHopCar[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

/** Car emojis, one per car — plain emoji, own art. */
export const RIVER_HOP_CAR_EMOJIS = ['🚗', '🚕', '🚙', '🚛'] as const

/**
 * The counting step for a question, when the question itself says
 * it ("Count by 2s", "count by 10s", "by 3s"). Null when the
 * question names no step — the caller then picks a default.
 */
export function parseSequenceStep(prompt: string): number | null {
  const m = (prompt ?? '').match(/count\s+by\s+(\d+)/i) ?? (prompt ?? '').match(/by\s+(\d+)\s*s\b/i)
  if (!m) return null
  const step = Number(m[1])
  return Number.isInteger(step) && step >= 1 ? step : null
}

/**
 * The three numbers to hop for this round's answer, in order.
 * Returns null when the answer is not a whole number of 4 or
 * more — such a round has no counting sequence to hop.
 * The step comes from the question when it says "count by Ns",
 * otherwise 2 for an even answer and 1 for an odd one; when the
 * step would push a term below zero it falls back to 1.
 */
export function sequenceTerms(
  prompt: string,
  answer: string,
): { terms: [string, string, string]; step: number } | null {
  const n = Number((answer ?? '').trim())
  if (!Number.isInteger(n) || n < 4) return null
  let step = parseSequenceStep(prompt) ?? (n % 2 === 0 ? 2 : 1)
  if (n - 3 * step < 0) step = 1
  return {
    terms: [String(n - 3 * step), String(n - 2 * step), String(n - step)],
    step,
  }
}

/** The number the kid must hop next, or null once the sequence is done. */
export function nextExpectedLabel(terms: string[], expectedIndex: number): string | null {
  return expectedIndex < terms.length ? terms[expectedIndex] : null
}

/**
 * Wrong numbers borrowed from the game's other items: distinct
 * whole-number answers that differ from this round's correct
 * answer and from every sequence term, shuffled, at most 6.
 * Empty (or short) when the game has too few other number
 * answers to borrow — such a round cannot be played.
 */
export function borrowNumericWrongAnswers(
  answers: string[],
  correctAnswer: string,
  terms: string[],
): string[] {
  const excluded = new Set([correctAnswer.trim(), ...terms])
  const seen = new Set<string>()
  const wrongs: string[] = []
  for (const a of answers) {
    const label = (a ?? '').trim()
    if (!label || excluded.has(label) || seen.has(label)) continue
    const n = Number(label)
    if (!Number.isInteger(n)) continue
    seen.add(label)
    wrongs.push(label)
  }
  // Shuffle without mutating the caller's array.
  for (let i = wrongs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = wrongs[i]
    wrongs[i] = wrongs[j]
    wrongs[j] = tmp
  }
  return wrongs.slice(0, 6)
}

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

/**
 * Build one round. Returns null when the answer has no counting
 * sequence (not a whole number of 4 or more) or when fewer than
 * two distinct wrong numbers can be borrowed — a round with no
 * wrong pads has no choice in it. Each river row gets the correct
 * next number plus two wrong pads at distinct columns, shuffled
 * so the right pad sits somewhere different every round. Each
 * road row gets two cars at distinct columns.
 */
export function buildRiverHopRound(
  prompt: string,
  answer: string,
  wrongAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): RiverHopRound | null {
  const correctAnswer = (answer ?? '').trim()
  if (!prompt || !correctAnswer) return null
  const seq = sequenceTerms(prompt, correctAnswer)
  if (!seq) return null
  if (wrongAnswers.length < RIVER_HOP_MIN_NUMERIC_WRONGS) return null
  const pads: RiverHopPad[] = []
  let padId = 0
  RIVER_HOP_TERM_ROWS.forEach((row, i) => {
    const correctLabel = seq.terms[i]
    const rowWrongs = shuffled(wrongAnswers.filter((w) => w !== correctLabel)).slice(0, RIVER_HOP_WRONGS_PER_ROW)
    if (rowWrongs.length < RIVER_HOP_WRONGS_PER_ROW) return
    const labels = shuffled([correctLabel, ...rowWrongs])
    const cols = shuffled([0, 1, 2, 3, 4, 5, 6]).slice(0, labels.length)
    labels.forEach((label, j) => {
      pads.push({
        id: padId++,
        row,
        col: cols[j],
        label,
        correct: label === correctLabel,
        kind: i % 2 === 0 ? 'log' : 'lily',
      })
    })
  })
  // Every river row needs its full set of pads, or the round is unplayable.
  if (pads.length !== RIVER_HOP_TERM_ROWS.length * (RIVER_HOP_WRONGS_PER_ROW + 1)) return null
  const cars: RiverHopCar[] = []
  let carId = 0
  RIVER_HOP_ROAD_ROWS.forEach((row, i) => {
    const cols = shuffled([0, 1, 2, 3, 4, 5, 6]).slice(0, 2)
    cols.forEach((col, j) => {
      cars.push({
        id: carId++,
        row,
        col,
        emoji: RIVER_HOP_CAR_EMOJIS[(i * 2 + j) % RIVER_HOP_CAR_EMOJIS.length],
      })
    })
  })
  return { prompt, correctAnswer, terms: [...seq.terms], step: seq.step, pads, cars, imageUrl, imageCredit }
}

export type HopDirection = 'up' | 'down' | 'left' | 'right'

export type HopOutcome =
  | 'blocked'
  | 'moved'
  | 'correct-pad'
  | 'wrong-pad'
  | 'splash'
  | 'car-hit'
  | 'goal'

export interface HopResult {
  player: RiverHopPlayer
  /** How many sequence numbers have been hopped so far. */
  expectedIndex: number
  outcome: HopOutcome
}

/**
 * One hop. Pure: nothing is mutated, the result carries the new
 * player spot and sequence progress. Hopping off the sides or
 * past the start bank is blocked; the far bank is the goal and
 * only opens once all three numbers are hopped (a kid can only
 * be standing on the top river row after hopping its number, so
 * this guard never fires in play — it is here so a bad state can
 * never skip the sequence). A river hop needs a pad: open water
 * splashes, a wrong pad sinks, the next number in the sequence
 * (or any pad once the sequence is complete) is safe. A road hop
 * onto a car is a hit. Banks are always safe.
 */
export function hopPlayer(
  player: RiverHopPlayer,
  pads: RiverHopPad[],
  cars: RiverHopCar[],
  terms: string[],
  expectedIndex: number,
  dir: HopDirection,
): HopResult {
  const next: RiverHopPlayer =
    dir === 'up'
      ? { col: player.col, row: player.row - 1 }
      : dir === 'down'
        ? { col: player.col, row: player.row + 1 }
        : dir === 'left'
          ? { col: player.col - 1, row: player.row }
          : { col: player.col + 1, row: player.row }
  if (next.col < 0 || next.col >= RIVER_HOP_COLS || next.row > RIVER_HOP_START_ROW) {
    return { player, expectedIndex, outcome: 'blocked' }
  }
  if (next.row === RIVER_HOP_GOAL_ROW) {
    if (expectedIndex >= terms.length) return { player: next, expectedIndex, outcome: 'goal' }
    return { player, expectedIndex, outcome: 'blocked' }
  }
  if (isRiverRow(next.row)) {
    const pad = pads.find((p) => p.row === next.row && p.col === next.col)
    if (!pad) return { player: next, expectedIndex, outcome: 'splash' }
    const nextLabel = nextExpectedLabel(terms, expectedIndex)
    if (nextLabel !== null && pad.label === nextLabel) {
      return { player: next, expectedIndex: expectedIndex + 1, outcome: 'correct-pad' }
    }
    if (nextLabel === null) return { player: next, expectedIndex, outcome: 'moved' }
    return { player: next, expectedIndex, outcome: 'wrong-pad' }
  }
  if (isRoadRow(next.row)) {
    const car = cars.find((c) => c.row === next.row && c.col === next.col)
    if (car) return { player: next, expectedIndex, outcome: 'car-hit' }
  }
  return { player: next, expectedIndex, outcome: 'moved' }
}

export type TrafficOutcome = 'ok' | 'splash' | 'hit'

export interface TrafficResult {
  pads: RiverHopPad[]
  cars: RiverHopCar[]
  player: RiverHopPlayer
  outcome: TrafficOutcome
}

/**
 * One traffic tick: every pad and car moves one cell in its row's
 * direction and wraps around the edges; a kid standing on a pad
 * rides it as it moves (wrapping with it). A kid left standing
 * on open water splashes, and a car driving onto a kid standing
 * on the road is a hit. Pure: nothing is mutated.
 */
export function advanceTraffic(
  pads: RiverHopPad[],
  cars: RiverHopCar[],
  player: RiverHopPlayer,
): TrafficResult {
  const nextPads = pads.map((p) => ({
    ...p,
    col: wrapCol(p.col + (RIVER_HOP_ROW_DIRS[p.row] ?? 1)),
  }))
  const nextCars = cars.map((c) => ({
    ...c,
    col: wrapCol(c.col + (RIVER_HOP_ROW_DIRS[c.row] ?? 1)),
  }))
  let nextPlayer = player
  if (isRiverRow(player.row)) {
    const padUnder = pads.find((p) => p.row === player.row && p.col === player.col)
    if (!padUnder) return { pads: nextPads, cars: nextCars, player, outcome: 'splash' }
    nextPlayer = {
      col: wrapCol(player.col + (RIVER_HOP_ROW_DIRS[player.row] ?? 1)),
      row: player.row,
    }
  } else if (isRoadRow(player.row)) {
    const carOnPlayer = nextCars.find((c) => c.row === player.row && c.col === player.col)
    if (carOnPlayer) return { pads: nextPads, cars: nextCars, player, outcome: 'hit' }
  }
  return { pads: nextPads, cars: nextCars, player: nextPlayer, outcome: 'ok' }
}
