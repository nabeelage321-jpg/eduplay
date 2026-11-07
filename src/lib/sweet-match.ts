/**
 * Sweet Match — pure match-3 logic (no React, no sound, no storage).
 *
 * EduPlay's own match-3 game (type 44): the kid swaps adjacent
 * tiles on a 6x6 board to line up 3 tiles that spell a word
 * (S-U-N) or make a sum (2+6 = 8). Match-3-STYLE mechanic only:
 * the name is EduPlay's own, the tiles are plain coloured squares
 * with a letter or a number on them — no Candy Crush name, no
 * copied candy art, no copied characters.
 * Nothing here invents content: the target of a round comes from
 * the game's real items — the answer's first three letters for a
 * word, or the two numbers and the sign of a simple sum parsed
 * out of the question (and only when the sum really equals the
 * answer). This module only lays the tiles out and judges swaps.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, 10 points per correct match, score out of 10 x rounds.
 * - One round per question, up to 10 rounds. The target (word or
 *   sum) is shown as the question for the round.
 * - The board is 6 columns x 6 rows of letter/number tiles. Tap
 *   a tile, then tap an adjacent tile to swap them — or drag one
 *   tile onto its neighbour. Only a swap of two ADJACENT tiles
 *   counts; tapping a far-away tile just selects that tile instead.
 * - A swap only stays if it lines up the target's 3 tiles in a
 *   row — across or down, in order. Those 3 tiles clear with a
 *   sparkle. A swap that lines up nothing swaps back: no points,
 *   no life lost, just a shake and a "try again" note.
 * - After a clear, the tiles above fall down and new tiles drop
 *   in from the top. If the new tiles happen to line up the
 *   target again, that clears too — a cascade, worth +5 bonus
 *   points per extra clear (up to 5 clears per swap).
 * - Every board is built with at least one swap that completes
 *   the target, and with no target run already sitting on it —
 *   so a round can never be unwinnable or already won before the
 *   kid touches a tile.
 * - 60 seconds per round. Time up: -1 life, round skipped.
 *   Wrong swaps never cost a life — only the timer does.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win.
 */

export const SWEET_MATCH_ROWS = 6
export const SWEET_MATCH_COLS = 6
export const SWEET_MATCH_LIVES = 3
export const SWEET_MATCH_ROUND_SECONDS = 60
export const SWEET_MATCH_WARNING_SECONDS = 5
export const SWEET_MATCH_MAX_ROUNDS = 10
/** Extra points per cascade clear after the first one. */
export const SWEET_MATCH_CASCADE_BONUS = 5
/** The cascade loop never clears more than this many times per swap. */
export const SWEET_MATCH_MAX_CLEARS = 5

export interface SweetMatchCell {
  row: number
  col: number
}

/** A board is rows of single-character tiles: a letter or a digit/sign. */
export type SweetMatchBoard = string[][]

export interface SweetMatchTarget {
  /** The 3 tiles to line up, in order. */
  chars: [string, string, string]
  kind: 'word' | 'sum'
  /** "S-U-N" or "2 + 6" — the target as the kid sees it. */
  label: string
  /** The full target: "Spell SUN" or "2 + 6 = 8". */
  display: string
}

export interface SweetMatchRound {
  prompt: string
  correctAnswer: string
  target: SweetMatchTarget
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

const WORD_FILLERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const SUM_FILLERS = '0123456789+-×'

function randomChar(pool: string): string {
  return pool[Math.floor(Math.random() * pool.length)]
}

function fillerPoolFor(target: SweetMatchTarget): string {
  return target.kind === 'sum' ? SUM_FILLERS : WORD_FILLERS
}

/**
 * The target for one item, or null when the item cannot be a
 * Sweet Match round. A sum is only taken from the question when
 * the two single digits and the sign really add up to the answer
 * — a wrong sum in the data never becomes a round. Otherwise the
 * answer's first three letters are the word to spell.
 */
export function buildSweetMatchTarget(prompt: string, answer: string): SweetMatchTarget | null {
  const trimmedAnswer = (answer ?? '').trim()
  const sum = /(\d)\s*([+\-×x÷])\s*(\d)/.exec(prompt ?? '')
  if (sum) {
    const a = Number(sum[1])
    const b = Number(sum[3])
    const op = sum[2] === 'x' ? '×' : sum[2]
    let value: number | null = null
    if (op === '+') value = a + b
    else if (op === '-') value = a - b
    else if (op === '×') value = a * b
    else if (op === '÷') value = b !== 0 && a % b === 0 ? a / b : null
    if (value !== null && Number(trimmedAnswer) === value) {
      return {
        chars: [String(a), op, String(b)],
        kind: 'sum',
        label: `${a} ${op} ${b}`,
        display: `${a} ${op} ${b} = ${value}`,
      }
    }
  }
  const letters = trimmedAnswer.toUpperCase().replace(/[^A-Z]/g, '')
  if (letters.length >= 3) {
    const chars = letters.slice(0, 3).split('') as [string, string, string]
    return {
      chars,
      kind: 'word',
      label: chars.join('-'),
      display: `Spell ${letters}`,
    }
  }
  return null
}

/** True when this item can be a Sweet Match round. */
export function canBuildSweetMatchTarget(prompt: string, answer: string): boolean {
  return buildSweetMatchTarget(prompt, answer) !== null
}

/**
 * Build one round. Returns null when the item cannot be a round
 * (no sum in the question and an answer shorter than 3 letters).
 */
export function buildSweetMatchRound(
  prompt: string,
  answer: string,
  imageUrl?: string,
  imageCredit?: string,
): SweetMatchRound | null {
  const target = buildSweetMatchTarget(prompt, answer)
  if (!target) return null
  return { prompt, correctAnswer: answer, target, imageUrl, imageCredit }
}

/** True when the two tiles sit next to each other (up/down/left/right). */
export function areAdjacent(a: SweetMatchCell, b: SweetMatchCell): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
}

function cloneBoard(board: SweetMatchBoard): SweetMatchBoard {
  return board.map((row) => [...row])
}

/** A new board with the two tiles swapped (the input is untouched). */
export function swapTiles(
  board: SweetMatchBoard,
  a: SweetMatchCell,
  b: SweetMatchCell,
): SweetMatchBoard {
  const next = cloneBoard(board)
  const tmp = next[a.row][a.col]
  next[a.row][a.col] = next[b.row][b.col]
  next[b.row][b.col] = tmp
  return next
}

export interface SweetMatchRun {
  cells: [SweetMatchCell, SweetMatchCell, SweetMatchCell]
  direction: 'across' | 'down'
}

/**
 * Every place the target's 3 tiles sit in a row, in order —
 * across (left to right) or down (top to bottom). Empty when the
 * board holds no complete target.
 */
export function findTargetRuns(board: SweetMatchBoard, target: SweetMatchTarget): SweetMatchRun[] {
  const [c0, c1, c2] = target.chars
  const runs: SweetMatchRun[] = []
  for (let r = 0; r < SWEET_MATCH_ROWS; r++) {
    for (let c = 0; c <= SWEET_MATCH_COLS - 3; c++) {
      if (board[r][c] === c0 && board[r][c + 1] === c1 && board[r][c + 2] === c2) {
        runs.push({
          cells: [
            { row: r, col: c },
            { row: r, col: c + 1 },
            { row: r, col: c + 2 },
          ],
          direction: 'across',
        })
      }
    }
  }
  for (let c = 0; c < SWEET_MATCH_COLS; c++) {
    for (let r = 0; r <= SWEET_MATCH_ROWS - 3; r++) {
      if (board[r][c] === c0 && board[r + 1][c] === c1 && board[r + 2][c] === c2) {
        runs.push({
          cells: [
            { row: r, col: c },
            { row: r + 1, col: c },
            { row: r + 2, col: c },
          ],
          direction: 'down',
        })
      }
    }
  }
  return runs
}

/**
 * The first adjacent swap that would line up the target, or null
 * when no single swap on this board can. The solver the board
 * builder — and the "no moves left" check — both use.
 */
export function findSwapForTarget(
  board: SweetMatchBoard,
  target: SweetMatchTarget,
): { a: SweetMatchCell; b: SweetMatchCell } | null {
  for (let r = 0; r < SWEET_MATCH_ROWS; r++) {
    for (let c = 0; c < SWEET_MATCH_COLS; c++) {
      const a: SweetMatchCell = { row: r, col: c }
      const neighbours: SweetMatchCell[] = []
      if (c + 1 < SWEET_MATCH_COLS) neighbours.push({ row: r, col: c + 1 })
      if (r + 1 < SWEET_MATCH_ROWS) neighbours.push({ row: r + 1, col: c })
      for (const b of neighbours) {
        if (findTargetRuns(swapTiles(board, a, b), target).length > 0) {
          return { a, b }
        }
      }
    }
  }
  return null
}

/**
 * Drop the tiles above each cleared cell down, and fill the empty
 * cells at the top with fresh random tiles. Pure apart from the
 * random fill, so the fall itself is testable.
 */
export function applyGravity(
  board: SweetMatchBoard,
  cleared: SweetMatchCell[],
  pool: string,
): SweetMatchBoard {
  const next = cloneBoard(board)
  const clearedSet = new Set(cleared.map((cell) => `${cell.row},${cell.col}`))
  for (let c = 0; c < SWEET_MATCH_COLS; c++) {
    const kept: string[] = []
    for (let r = SWEET_MATCH_ROWS - 1; r >= 0; r--) {
      if (!clearedSet.has(`${r},${c}`)) kept.push(next[r][c])
    }
    let r = SWEET_MATCH_ROWS - 1
    for (const tile of kept) {
      next[r][c] = tile
      r--
    }
    for (; r >= 0; r--) {
      next[r][c] = randomChar(pool)
    }
  }
  return next
}

export interface SweetMatchSwapResult {
  /** True when the swap lined up the target and cleared it. */
  matched: boolean
  /** The board after the swap — the original board when the swap
   *  did not match (the tiles swap back), the settled board with
   *  all cascades resolved when it did. */
  board: SweetMatchBoard
  /** The cells of the FIRST clear — the sparkle spots. Empty when
   *  the swap did not match. */
  cleared: SweetMatchCell[]
  /** How many clears the swap caused: 1 for the match itself,
   *  plus one per cascade. 0 when the swap did not match. */
  clears: number
  /** Points the swap earned: 10 for the match, +5 per cascade. */
  points: number
}

/**
 * Judge one swap. Non-adjacent tiles never move. A swap that
 * lines up nothing returns the ORIGINAL board (the tiles swap
 * back) with matched false. A swap that lines up the target
 * clears it, lets the tiles fall, and keeps clearing while the
 * falling tiles line the target up again — a cascade — up to
 * SWEET_MATCH_MAX_CLEARS clears per swap.
 */
export function attemptSwap(
  board: SweetMatchBoard,
  target: SweetMatchTarget,
  a: SweetMatchCell,
  b: SweetMatchCell,
): SweetMatchSwapResult {
  if (!areAdjacent(a, b)) {
    return { matched: false, board: cloneBoard(board), cleared: [], clears: 0, points: 0 }
  }
  const swapped = swapTiles(board, a, b)
  const runs = findTargetRuns(swapped, target)
  if (runs.length === 0) {
    return { matched: false, board: cloneBoard(board), cleared: [], clears: 0, points: 0 }
  }
  const pool = fillerPoolFor(target)
  const firstCleared: SweetMatchCell[] = [...runs[0].cells]
  let current = swapped
  let clears = 0
  let safety = 0
  while (safety < SWEET_MATCH_MAX_CLEARS) {
    const found = findTargetRuns(current, target)
    if (found.length === 0) break
    const cells = found.flatMap((run) => run.cells)
    current = applyGravity(current, cells, pool)
    clears++
    safety++
  }
  return {
    matched: true,
    board: current,
    cleared: firstCleared,
    clears,
    points: 10 + SWEET_MATCH_CASCADE_BONUS * Math.max(0, clears - 1),
  }
}

/**
 * Build a fresh board for a target: random tiles, with the target
 * one swap away and no target run already on it. The planted
 * solution sits on one row — the first two target tiles side by
 * side, a filler, then the third tile — so swapping the filler
 * with the third tile completes the row. Retried when a random
 * board already holds a run; after 200 tries a deterministic
 * board is built instead (fillers that never spell the target),
 * so this always returns a playable board.
 */
export function buildSweetMatchBoard(target: SweetMatchTarget): SweetMatchBoard {
  const pool = fillerPoolFor(target)
  for (let attempt = 0; attempt < 200; attempt++) {
    const board: SweetMatchBoard = Array.from({ length: SWEET_MATCH_ROWS }, () =>
      Array.from({ length: SWEET_MATCH_COLS }, () => randomChar(pool)),
    )
    const row = Math.floor(Math.random() * SWEET_MATCH_ROWS)
    const col = Math.floor(Math.random() * (SWEET_MATCH_COLS - 3))
    board[row][col] = target.chars[0]
    board[row][col + 1] = target.chars[1]
    let filler = randomChar(pool)
    while (filler === target.chars[2]) filler = randomChar(pool)
    board[row][col + 2] = filler
    board[row][col + 3] = target.chars[2]
    if (findTargetRuns(board, target).length > 0) continue
    if (!findSwapForTarget(board, target)) continue
    return board
  }
  // Deterministic fallback: fillers drawn from letters/digits that
  // never appear in the target, so no run can exist by accident;
  // the planted solution is still one swap away.
  const safePool = pool.split('').filter((ch) => !target.chars.includes(ch)).join('') || 'X'
  const board: SweetMatchBoard = Array.from({ length: SWEET_MATCH_ROWS }, (_, r) =>
    Array.from({ length: SWEET_MATCH_COLS }, (_, c) => safePool[(r * SWEET_MATCH_COLS + c) % safePool.length]),
  )
  const row = 2
  const col = 1
  board[row][col] = target.chars[0]
  board[row][col + 1] = target.chars[1]
  board[row][col + 2] = safePool[0]
  board[row][col + 3] = target.chars[2]
  return board
}
