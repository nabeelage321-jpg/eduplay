/**
 * Mine Logic — pure logic-grid logic (no React, no sound, no
 * storage).
 *
 * EduPlay's own Minesweeper-STYLE logic grid (type 56): a grid
 * hides mines and the numbers tell you how many mines touch
 * each square. Minesweeper-STYLE mechanic only: the name is
 * EduPlay's own, the grid is plain squares with numbers drawn
 * here — no Minesweeper name, no mine, and no Microsoft art
 * copied. Nothing here invents content: the numbers are
 * computed from the mines actually placed, and every square
 * is opened by answering one of the game's real questions.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per CLEARED round (one grid per round,
 *   one round per grid, up to 10 rounds). Score out of 10 x
 *   rounds.
 * - The grid is 6 x 6 = 36 squares with 6 mines hidden in it.
 * - Mines are placed when the first square is opened, never
 *   under that square or its neighbours — the first tap is
 *   always safe and always opens a blank square, which
 *   flood-opens its neighbourhood like a classic grid.
 * - Tap a covered safe square and a quick question appears
 *   (the next question from the round's shuffled question
 *   queue, with the right answer plus wrong answers borrowed
 *   from the game's other items). Answer it right and the
 *   square opens, showing how many mines touch it — 0 opens
 *   blank and flood-opens every connected blank square and
 *   their numbered border, no extra question needed for those.
 *   Answer it wrong and the square stays covered: no life
 *   lost, only the streak breaks.
 * - Flag mode (the 🚩 button, or a long press on a square)
 *   flags a square you believe hides a mine. Flags only work
 *   once a square has been opened — before the mines are
 *   placed there is nothing to flag yet. Flagging a real mine
 *   sticks and the mines-left counter drops. Unflagging is
 *   free. Flagging a SAFE square is a WRONG FLAG: the round
 *   ends at once and costs 1 life, and all mines are shown.
 * - Tapping a mine (answering its question right — the mine
 *   is hidden, so the kid cannot know) ends the round at once
 *   and costs 1 life, and all mines are shown.
 * - A round is cleared when every safe square is revealed
 *   (flagging every mine is not required). 0 lives = game over
 *   (lose). All rounds done with lives left = win.
 * - A round needs at least three different answers across the
 *   game's items (one right answer plus at least two different
 *   answers to borrow as wrong choices), or there is no choice
 *   in its questions.
 */

export const MINE_LOGIC_LIVES = 3
export const MINE_LOGIC_MAX_ROUNDS = 10
/** Points for clearing one whole grid (one round). */
export const MINE_LOGIC_POINTS_PER_ROUND = 10
export const MINE_LOGIC_ROWS = 6
export const MINE_LOGIC_COLS = 6
/** Mines hidden in every grid. */
export const MINE_LOGIC_MINES = 6
/** Wrong answers borrowed per question (re-used across choices). */
export const MINE_LOGIC_MAX_WRONGS = 3
/** How long a press must be held to flag instead of reveal. */
export const MINE_LOGIC_LONG_PRESS_MS = 500

export const MINE_LOGIC_CELLS =
  MINE_LOGIC_ROWS * MINE_LOGIC_COLS

/** One square of the grid. */
export interface MineLogicCell {
  mine: boolean
  /** How many mines touch this square (0–8; only shown once revealed). */
  adjacent: number
  revealed: boolean
  flagged: boolean
}

/** One quick question, as the player shows it. */
export interface MineLogicQuestion {
  prompt: string
  choices: string[]
  correctAnswer: string
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export interface MineLogicRound {
  questions: MineLogicQuestion[]
}

export type MineLogicStatus = 'playing' | 'won' | 'out'

/** What the last action resolved to — the component turns
 *  it into feedback. */
export type MineLogicEvent =
  | { kind: 'asked'; cell: number }
  | { kind: 'revealed'; cell: number; flood: number }
  | { kind: 'wrong-answer' }
  | { kind: 'flagged'; cell: number }
  | { kind: 'unflagged'; cell: number }
  | { kind: 'flag-too-early' }
  | { kind: 'wrong-flag'; cell: number }
  | { kind: 'mine-hit'; cell: number }
  | { kind: 'round-won'; revealed: number }
  | null

/** The live state of one round. */
export interface MineLogicState {
  round: MineLogicRound
  cells: MineLogicCell[]
  minesPlaced: boolean
  /** The question waiting for an answer, if any. */
  pending: { cell: number; question: MineLogicQuestion } | null
  /** Next question in the round's queue (cycles when it runs out). */
  questionIndex: number
  /** Flags currently on the grid. */
  flagsPlaced: number
  /** True once the round has ended — the component shows all mines. */
  showMines: boolean
  status: MineLogicStatus
  lastEvent: MineLogicEvent
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

/** Row/col of a cell index. */
export function mineLogicRowCol(index: number): { row: number; col: number } {
  return {
    row: Math.floor(index / MINE_LOGIC_COLS),
    col: index % MINE_LOGIC_COLS,
  }
}

/** The 8 neighbours of a cell (fewer on an edge or a corner). */
export function mineLogicNeighbours(index: number): number[] {
  const { row, col } = mineLogicRowCol(index)
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const r = row + dr
      const c = col + dc
      if (r < 0 || r >= MINE_LOGIC_ROWS || c < 0 || c >= MINE_LOGIC_COLS) continue
      out.push(r * MINE_LOGIC_COLS + c)
    }
  }
  return out
}

/**
 * Wrong answers borrowed from the game's other items: distinct
 * answers that are not the correct one, at most
 * MINE_LOGIC_MAX_WRONGS, shuffled, without mutating the
 * caller's array.
 */
export function borrowWrongAnswers(
  answers: string[],
  correctAnswer: string,
): string[] {
  const seen = new Set<string>()
  const wrongs: string[] = []
  for (const a of answers) {
    const label = (a ?? '').trim()
    if (!label || label === correctAnswer || seen.has(label)) continue
    seen.add(label)
    wrongs.push(label)
  }
  return shuffled(wrongs).slice(0, MINE_LOGIC_MAX_WRONGS)
}

/**
 * A grid with mines on the given cells and every adjacent count
 * computed from them. Pure — tests build known grids with it.
 */
export function createGridWithMines(mineIndexes: number[]): MineLogicCell[] {
  const mines = new Set(mineIndexes)
  const cells: MineLogicCell[] = []
  for (let i = 0; i < MINE_LOGIC_CELLS; i++) {
    const mine = mines.has(i)
    cells.push({
      mine,
      adjacent: 0,
      revealed: false,
      flagged: false,
    })
  }
  for (let i = 0; i < MINE_LOGIC_CELLS; i++) {
    if (cells[i]!.mine) continue
    cells[i]!.adjacent = mineLogicNeighbours(i).filter((n) => cells[n]!.mine).length
  }
  return cells
}

/**
 * Place MINE_LOGIC_MINES mines on a fresh grid, never on the
 * safe cells (the first opened square and its neighbours).
 * `random` is injectable so tests can pass a seeded source;
 * it defaults to Math.random.
 */
export function placeMines(
  safeIndexes: number[],
  random: () => number = Math.random,
): MineLogicCell[] {
  const safe = new Set(safeIndexes)
  const pool: number[] = []
  for (let i = 0; i < MINE_LOGIC_CELLS; i++) {
    if (!safe.has(i)) pool.push(i)
  }
  const mines: number[] = []
  while (mines.length < MINE_LOGIC_MINES && pool.length > 0) {
    const at = Math.floor(random() * pool.length)
    mines.push(pool.splice(at, 1)[0]!)
  }
  return createGridWithMines(mines)
}

/** How many safe squares are still covered. */
export function mineLogicSafeLeft(cells: MineLogicCell[]): number {
  return cells.filter((c) => !c.mine && !c.revealed).length
}

/**
 * Reveal a cell and, when it is blank (0 touching mines),
 * flood-open every connected blank square and their numbered
 * border — the classic grid behaviour. Flagged squares are
 * never flood-opened. Returns the new cells plus how many
 * squares the reveal opened in total.
 */
export function revealWithFlood(
  cells: MineLogicCell[],
  start: number,
): { cells: MineLogicCell[]; opened: number } {
  const next = cells.map((c) => ({ ...c }))
  const target = next[start]
  if (!target || target.revealed || target.flagged || target.mine) {
    return { cells: next, opened: 0 }
  }
  let opened = 0
  const queue: number[] = [start]
  const seen = new Set<number>([start])
  while (queue.length > 0) {
    const at = queue.shift()!
    const cell = next[at]!
    if (cell.revealed || cell.flagged || cell.mine) continue
    cell.revealed = true
    opened++
    if (cell.adjacent === 0) {
      for (const n of mineLogicNeighbours(at)) {
        if (!seen.has(n)) {
          seen.add(n)
          queue.push(n)
        }
      }
    }
  }
  return { cells: next, opened }
}

/** A fresh round: no mines placed yet, no question waiting. */
export function newMineLogicGame(round: MineLogicRound): MineLogicState {
  return {
    round,
    cells: createGridWithMines([]),
    minesPlaced: false,
    pending: null,
    questionIndex: 0,
    flagsPlaced: 0,
    showMines: false,
    status: 'playing',
    lastEvent: null,
  }
}

/**
 * Tap a covered square in Reveal mode. Pure.
 *
 * A revealed, flagged, or already-waiting square does nothing.
 * Otherwise the round's next question appears for that square
 * (the queue cycles when it runs out) — answering it is what
 * opens the square, so a mine can never be hit by the tap
 * itself, only by a right answer to its question.
 */
export function requestReveal(
  state: MineLogicState,
  cell: number,
): MineLogicState {
  if (state.status !== 'playing' || state.pending) return state
  const target = state.cells[cell]
  if (!target || target.revealed || target.flagged) return state
  const question =
    state.round.questions[state.questionIndex % state.round.questions.length]
  if (!question) return state
  return {
    ...state,
    pending: { cell, question },
    questionIndex: state.questionIndex + 1,
    lastEvent: { kind: 'asked', cell },
  }
}

/**
 * Answer the waiting question. Pure.
 *
 * A wrong answer leaves the square covered — no life lost,
 * only the streak breaks (the component tracks the streak).
 * A right answer opens the square: mines are placed first
 * when this is the round's first opening (never under the
 * square or its neighbours, so the first tap is always safe);
 * opening a mine ends the round at once and costs a life
 * (the component applies the life); opening the last safe
 * square clears the round.
 */
export function answerQuestion(
  state: MineLogicState,
  choice: string,
): MineLogicState {
  if (state.status !== 'playing' || !state.pending) return state
  const { cell, question } = state.pending
  if (choice !== question.correctAnswer) {
    return { ...state, pending: null, lastEvent: { kind: 'wrong-answer' } }
  }
  let cells = state.cells
  let minesPlaced = state.minesPlaced
  if (!minesPlaced) {
    const safe = [cell, ...mineLogicNeighbours(cell)]
    cells = placeMines(safe)
    minesPlaced = true
  }
  if (cells[cell]!.mine) {
    return {
      ...state,
      cells,
      minesPlaced,
      pending: null,
      showMines: true,
      status: 'out',
      lastEvent: { kind: 'mine-hit', cell },
    }
  }
  const revealed = revealWithFlood(cells, cell)
  const won = mineLogicSafeLeft(revealed.cells) === 0
  return {
    ...state,
    cells: revealed.cells,
    minesPlaced,
    pending: null,
    showMines: won,
    status: won ? 'won' : 'playing',
    lastEvent: won
      ? { kind: 'round-won', revealed: revealed.opened }
      : { kind: 'revealed', cell, flood: revealed.opened },
  }
}

/**
 * Flag or unflag a covered square. Pure.
 *
 * Unflagging is always free. Flagging before any square has
 * been opened does nothing yet — there are no mines placed
 * to check against — and the component says so. Flagging a
 * real mine sticks and the mines-left counter drops.
 * Flagging a SAFE square is a wrong flag: the round ends at
 * once and costs a life (the component applies the life),
 * and all mines are shown.
 */
export function toggleFlag(
  state: MineLogicState,
  cell: number,
): MineLogicState {
  if (state.status !== 'playing' || state.pending) return state
  const target = state.cells[cell]
  if (!target || target.revealed) return state
  if (target.flagged) {
    const cells = state.cells.map((c, i) =>
      i === cell ? { ...c, flagged: false } : c,
    )
    return {
      ...state,
      cells,
      flagsPlaced: Math.max(0, state.flagsPlaced - 1),
      lastEvent: { kind: 'unflagged', cell },
    }
  }
  if (!state.minesPlaced) {
    return { ...state, lastEvent: { kind: 'flag-too-early' } }
  }
  if (!target.mine) {
    // The wrong flag stays on the square, so the grid shows
    // where the mistake was when the mines are revealed.
    const cells = state.cells.map((c, i) =>
      i === cell ? { ...c, flagged: true } : c,
    )
    return {
      ...state,
      cells,
      showMines: true,
      status: 'out',
      lastEvent: { kind: 'wrong-flag', cell },
    }
  }
  const cells = state.cells.map((c, i) =>
    i === cell ? { ...c, flagged: true } : c,
  )
  return {
    ...state,
    cells,
    flagsPlaced: state.flagsPlaced + 1,
    lastEvent: { kind: 'flagged', cell },
  }
}

/** Mines still unflagged — what the counter shows. */
export function mineLogicMinesLeft(state: MineLogicState): number {
  return MINE_LOGIC_MINES - state.flagsPlaced
}

/**
 * Build one round's question queue from the game's items:
 * every usable item becomes a question, shuffled, each with
 * the right answer plus wrong answers borrowed from the
 * game's other items. Returns null when the items build no
 * round: no usable item, or fewer than three different
 * answers across the game (one right answer plus at least
 * two to borrow as wrong choices).
 */
export function buildMineLogicRound(
  items: Array<{
    prompt: string
    answer: string
    imageUrl?: string
    imageCredit?: string
  }>,
): MineLogicRound | null {
  const usable = items.filter((i) => i.prompt && (i.answer ?? '').trim())
  if (usable.length === 0) return null
  const allAnswers = usable.map((i) => i.answer.trim())
  const distinct = new Set(allAnswers)
  if (distinct.size < 3) return null
  const questions: MineLogicQuestion[] = []
  for (const item of shuffled(usable)) {
    const correct = item.answer.trim()
    const wrongs = borrowWrongAnswers(allAnswers, correct)
    if (wrongs.length < 2) return null
    questions.push({
      prompt: item.prompt,
      choices: shuffled([correct, ...wrongs]),
      correctAnswer: correct,
      imageUrl: item.imageUrl,
      imageCredit: item.imageCredit,
    })
  }
  if (questions.length === 0) return null
  return { questions }
}
