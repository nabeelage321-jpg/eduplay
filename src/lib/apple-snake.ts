/**
 * Apple Snake — pure snake logic (no React, no sound, no storage).
 *
 * EduPlay's own snake game (type 42): the kid steers a snake
 * around a garden grid to EAT the apple with the correct answer.
 * Snake-STYLE mechanic only: the name, the snake, and the apples
 * are all EduPlay's own — no Snake/Nokia name, no copied Snake
 * art. Our snake is a friendly green snake drawn in SVG by the
 * component (round head with eyes and a smile); our apples are
 * red apples drawn in SVG here, each carrying one answer.
 * Nothing here invents content: prompts, correct answers, and
 * distractors all come from the game's real items; this module
 * only lays them out and moves the snake.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, 10 points per correct round, score out of 10 x rounds.
 * - One round per question. A round ends when the snake eats the
 *   correct apple (+10), or when its 45-second timer runs out
 *   (-1 life, round skipped). Eating a wrong apple costs 1 life
 *   AND shortens the snake by 2 segments (never below 2), and
 *   that apple is consumed, so one wrong apple can never cost
 *   two lives; the round continues until the correct apple is
 *   eaten. Bumping a wall or biting its own tail costs 1 life
 *   and the snake respawns at its start (round continues).
 * - The snake moves on its own, one cell every step (250 ms),
 *   in the current direction; the kid steers with arrow keys /
 *   WASD or the on-screen pad. Steering into the opposite
 *   direction is ignored (the snake cannot turn back on itself).
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win. Apple placement only uses cells the snake does not
 *   start on, with the correct apple always placed, so a round
 *   can never be unwinnable because of the layout.
 */

export const APPLE_SNAKE_LIVES = 3
export const APPLE_SNAKE_ROUND_SECONDS = 45
export const APPLE_SNAKE_WARNING_SECONDS = 5
export const APPLE_SNAKE_COLS = 12
export const APPLE_SNAKE_ROWS = 12
export const APPLE_SNAKE_STEP_MS = 250
export const APPLE_SNAKE_START_LENGTH = 4
export const APPLE_SNAKE_GROW_ON_CORRECT = 1
export const APPLE_SNAKE_SHRINK_ON_WRONG = 2
export const APPLE_SNAKE_MIN_LENGTH = 2

export interface AppleSnakePos {
  row: number
  col: number
}

export interface AppleSnakeApple {
  answer: string
  isCorrect: boolean
  row: number
  col: number
}

export interface AppleSnakeRound {
  prompt: string
  correctAnswer: string
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
  /** The snake at the start of the round, head first. */
  startSnake: AppleSnakePos[]
  startDir: AppleSnakeDir
  apples: AppleSnakeApple[]
}

export type AppleSnakeDir = 'up' | 'down' | 'left' | 'right'

const DIR_DELTA: Record<AppleSnakeDir, AppleSnakePos> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
}

const OPPOSITE: Record<AppleSnakeDir, AppleSnakeDir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

/** The snake's start: a row across the middle, head on the right,
 *  moving right, so the kid has open garden in front of it. */
export function appleSnakeStartSnake(): AppleSnakePos[] {
  const row = Math.floor(APPLE_SNAKE_ROWS / 2)
  const headCol = 3
  const snake: AppleSnakePos[] = []
  for (let i = 0; i < APPLE_SNAKE_START_LENGTH; i++) {
    snake.push({ row, col: headCol - i })
  }
  return snake
}

/** Steering into the opposite direction is ignored — the snake
 *  cannot turn back on itself and bite its own neck. */
export function appleSnakeNextDir(current: AppleSnakeDir, wanted: AppleSnakeDir): AppleSnakeDir {
  return wanted === OPPOSITE[current] ? current : wanted
}

/** All cells not occupied by the snake, in row-major order. */
export function appleSnakeFreeCells(snake: AppleSnakePos[]): AppleSnakePos[] {
  const taken = new Set(snake.map((p) => `${p.row},${p.col}`))
  const free: AppleSnakePos[] = []
  for (let r = 0; r < APPLE_SNAKE_ROWS; r++) {
    for (let c = 0; c < APPLE_SNAKE_COLS; c++) {
      if (!taken.has(`${r},${c}`)) free.push({ row: r, col: c })
    }
  }
  return free
}

/**
 * Build one round. `answers` carries the full apple list already
 * shuffled; this function guarantees the CORRECT apple is placed
 * and every other apple lands on a distinct free cell (never on
 * the snake). If the garden ever offered fewer free cells than
 * apples, extra apples are dropped — but the correct apple is
 * never the dropped one. Returns null when there is no correct
 * answer to place.
 */
export function buildAppleSnakeRound(
  prompt: string,
  answers: { answer: string; isCorrect: boolean }[],
  imageUrl?: string,
  imageCredit?: string,
): AppleSnakeRound | null {
  const correct = answers.find((a) => a.isCorrect)
  if (!correct || !correct.answer) return null
  const startSnake = appleSnakeStartSnake()
  const free = appleSnakeFreeCells(startSnake)
  if (free.length === 0) return null
  // Shuffle the free cells so apple spots vary round to round.
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[free[i], free[j]] = [free[j], free[i]]
  }
  const apples: AppleSnakeApple[] = []
  const correctCell = free.shift()!
  apples.push({ answer: correct.answer, isCorrect: true, row: correctCell.row, col: correctCell.col })
  const distractors = answers.filter((a) => !a.isCorrect && a.answer)
  for (const d of distractors) {
    const cell = free.shift()
    if (!cell) break
    apples.push({ answer: d.answer, isCorrect: false, row: cell.row, col: cell.col })
  }
  return { prompt, correctAnswer: correct.answer, imageUrl, imageCredit, startSnake, startDir: 'right', apples }
}

export type AppleSnakeStep =
  | { kind: 'moved'; snake: AppleSnakePos[] }
  | { kind: 'wall' }
  | { kind: 'self' }

/**
 * One automatic step: the head moves one cell in `dir`. A wall
 * (board edge) or the snake's own body blocks the step — the
 * caller treats that as a bump (-1 life, respawn). The tail cell
 * vacates on the same step, so moving into it is NOT a bite.
 * When `grow` is true the tail stays (the snake grows by one).
 * Pure, so the rule is testable without rendering.
 */
export function stepSnake(
  snake: AppleSnakePos[],
  dir: AppleSnakeDir,
  grow: boolean,
): AppleSnakeStep {
  if (snake.length === 0) return { kind: 'wall' }
  const head = snake[0]
  const d = DIR_DELTA[dir]
  const next = { row: head.row + d.row, col: head.col + d.col }
  if (next.row < 0 || next.row >= APPLE_SNAKE_ROWS || next.col < 0 || next.col >= APPLE_SNAKE_COLS) {
    return { kind: 'wall' }
  }
  // The tail vacates this step unless the snake is growing.
  const body = grow ? snake : snake.slice(0, -1)
  if (body.some((p) => p.row === next.row && p.col === next.col)) {
    return { kind: 'self' }
  }
  const moved = [next, ...snake]
  if (!grow) moved.pop()
  return { kind: 'moved', snake: moved }
}

/** The apple on `pos`, if the snake's head just reached one. */
export function appleSnakeAppleAt(
  apples: AppleSnakeApple[],
  pos: AppleSnakePos,
): AppleSnakeApple | undefined {
  return apples.find((a) => a.row === pos.row && a.col === pos.col)
}

/**
 * Shorten the snake by `by` segments from the tail, never below
 * APPLE_SNAKE_MIN_LENGTH — a wrong apple costs length, but the
 * snake is never eaten down to nothing.
 */
export function shrinkSnake(snake: AppleSnakePos[], by: number): AppleSnakePos[] {
  const keep = Math.max(APPLE_SNAKE_MIN_LENGTH, snake.length - by)
  return snake.slice(0, keep)
}
