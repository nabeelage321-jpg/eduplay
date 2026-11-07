/**
 * Brick Bounce — pure paddle/ball/brick physics + round logic (no
 * React, no sound, no storage).
 *
 * EduPlay's own Breakout-STYLE brick-breaker game (type 52): the
 * kid slides a paddle along the bottom and bounces a ball up to
 * smash bricks. Breakout-STYLE mechanic only: the name is
 * EduPlay's own, the paddle, ball, and bricks are plain shapes
 * drawn here with an answer written on each brick — no Breakout
 * or Arkanoid name, no Atari or Taito art copied. Nothing here
 * invents content: the bricks carry the game's real answers —
 * the round's correct answer on some bricks, wrong answers
 * borrowed from the game's other items on the rest.
 *
 * The field is 100 wide x 60 high, y grows downwards. The paddle
 * sits near the bottom (y = 56, 16 wide, 2 high) and slides
 * left/right. The ball bounces off the walls, the paddle, and
 * the bricks. A wall of 5 columns x 3 rows of bricks hangs near
 * the top (rows start at y = 6).
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per CORRECT brick smashed (3 correct
 *   bricks per round, one round per question, up to 10 rounds).
 *   Score out of 30 x rounds.
 * - 3 balls per round. The ball starts resting on the paddle;
 *   Space, a tap, or the LAUNCH button sends it up.
 * - Smashing a CORRECT brick: +10, the brick breaks, the ball
 *   bounces on. Smashing all 3 correct bricks wins the round.
 * - Smashing a WRONG brick breaks it too — but it costs the
 *   ball: the ball is lost at once (no points). If balls are
 *   left, a fresh ball rests on the paddle; if not, the round
 *   ends and costs 1 life. (A wrong brick is a trap, not a
 *   free hit: read the answers before you aim.)
 * - A ball that falls past the paddle is lost the same way:
 *   one ball gone, fresh ball on the paddle if any are left.
 * - Spending all 3 balls without smashing every correct brick
 *   ends the round with no more points and costs 1 life.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win.
 * - A round needs at least two different answers to borrow as
 *   wrong bricks, or the wall has no choice in it. Wrong bricks
 *   re-use the borrowed wrong answers across the wall (each
 *   wrong brick shows one of them).
 */

export const BRICK_BOUNCE_LIVES = 3
export const BRICK_BOUNCE_MAX_ROUNDS = 10
/** Points for smashing one correct brick. */
export const BRICK_BOUNCE_POINTS_PER_BRICK = 10
/** Correct bricks in every round's wall. */
export const BRICK_BOUNCE_CORRECT_BRICKS = 3
/** Balls per round. */
export const BRICK_BOUNCE_BALLS_PER_ROUND = 3
/** Field size, in field units (y grows downwards). */
export const BRICK_BOUNCE_FIELD_WIDTH = 100
export const BRICK_BOUNCE_FIELD_HEIGHT = 60
/** Ball radius, for bounce checks. */
export const BRICK_BOUNCE_BALL_RADIUS = 1.2
/** Paddle width / height, in field units. */
export const BRICK_BOUNCE_PADDLE_WIDTH = 16
export const BRICK_BOUNCE_PADDLE_HEIGHT = 2
/** Paddle top edge. */
export const BRICK_BOUNCE_PADDLE_Y = 56
/** Ball speed after launch, field units per second. */
export const BRICK_BOUNCE_BALL_SPEED = 38
/** Brick grid: 5 columns x 3 rows. */
export const BRICK_BOUNCE_COLS = 5
export const BRICK_BOUNCE_ROWS = 3
export const BRICK_BOUNCE_BRICK_WIDTH = 16
export const BRICK_BOUNCE_BRICK_HEIGHT = 5
export const BRICK_BOUNCE_GRID_X = 5
export const BRICK_BOUNCE_GRID_Y = 6
export const BRICK_BOUNCE_COL_STEP = 18
export const BRICK_BOUNCE_ROW_STEP = 7
/** Wrong answers borrowed per round (re-used across wrong bricks). */
export const BRICK_BOUNCE_MAX_WRONGS = 2
/** Paddle step per arrow-key press, in field units. */
export const BRICK_BOUNCE_PADDLE_STEP = 4
/** Max sub-step, so a fast ball can never tunnel through a brick. */
const MAX_SUBSTEP = 1 / 120

export interface BrickBouncePoint {
  x: number
  y: number
}

/** One brick in the wall. */
export interface BrickBounceBrick {
  id: string
  col: number
  row: number
  /** Left edge, in field units. */
  x: number
  /** Top edge, in field units. */
  y: number
  answer: string
  correct: boolean
  smashed: boolean
}

export interface BrickBounceRound {
  prompt: string
  bricks: BrickBounceBrick[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type BrickBounceStatus = 'serving' | 'playing' | 'won' | 'out'

/** What the last ball event was — the component turns it into feedback. */
export type BrickBounceEvent =
  | { kind: 'hit-correct'; answer: string; correctLeft: number }
  | { kind: 'hit-wrong'; answer: string; ballsLeft: number }
  | { kind: 'ball-lost'; ballsLeft: number }
  | null

/** The live state of one round. */
export interface BrickBounceState {
  round: BrickBounceRound
  paddleX: number
  ball: { x: number; y: number; vx: number; vy: number } | null
  ballsLeft: number
  status: BrickBounceStatus
  lastEvent: BrickBounceEvent
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

/** Left edge of a brick column. */
export function brickX(col: number): number {
  return BRICK_BOUNCE_GRID_X + col * BRICK_BOUNCE_COL_STEP
}

/** Top edge of a brick row. */
export function brickY(row: number): number {
  return BRICK_BOUNCE_GRID_Y + row * BRICK_BOUNCE_ROW_STEP
}

/** Centre of the paddle, clamped so it never leaves the field. */
export function clampPaddleX(x: number): number {
  const half = BRICK_BOUNCE_PADDLE_WIDTH / 2
  return Math.max(half, Math.min(BRICK_BOUNCE_FIELD_WIDTH - half, x))
}

/** How many correct bricks are still standing. */
export function correctBricksLeft(state: BrickBounceState): number {
  return state.round.bricks.filter((b) => b.correct && !b.smashed).length
}

/**
 * Wrong answers borrowed from the game's other items: distinct
 * answers that are not the correct one, at most
 * BRICK_BOUNCE_MAX_WRONGS, shuffled, without mutating the
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
  return shuffled(wrongs).slice(0, BRICK_BOUNCE_MAX_WRONGS)
}

/** A fresh round: a full wall, a full set of balls, ball on the paddle. */
export function newBrickBounceGame(round: BrickBounceRound): BrickBounceState {
  return {
    round: {
      ...round,
      bricks: round.bricks.map((b) => ({ ...b, smashed: false })),
    },
    paddleX: BRICK_BOUNCE_FIELD_WIDTH / 2,
    ball: null,
    ballsLeft: BRICK_BOUNCE_BALLS_PER_ROUND,
    status: 'serving',
    lastEvent: null,
  }
}

/** Where a served ball rests: on the paddle, following it. */
export function servedBallPosition(paddleX: number): BrickBouncePoint {
  return {
    x: paddleX,
    y: BRICK_BOUNCE_PADDLE_Y - BRICK_BOUNCE_BALL_RADIUS - 0.5,
  }
}

/** Launch the served ball upwards (vx tilts it left or right). */
export function launchBall(
  state: BrickBounceState,
  vx = 10,
): BrickBounceState {
  if (state.status !== 'serving' || state.ballsLeft <= 0) return state
  const vy = -Math.sqrt(
    Math.max(0, BRICK_BOUNCE_BALL_SPEED ** 2 - vx * vx),
  )
  const pos = servedBallPosition(state.paddleX)
  return {
    ...state,
    ball: { x: pos.x, y: pos.y, vx, vy },
    status: 'playing',
    lastEvent: null,
  }
}

/** Slide the paddle to x (clamped); a served ball rides along. */
export function movePaddle(
  state: BrickBounceState,
  x: number,
): BrickBounceState {
  if (state.status === 'won' || state.status === 'out') return state
  return { ...state, paddleX: clampPaddleX(x) }
}

/** Lose one ball. Fresh ball on the paddle if any are left, else the round is out. */
function loseBall(
  state: BrickBounceState,
  event: BrickBounceEvent,
): BrickBounceState {
  const ballsLeft = state.ballsLeft - 1
  return {
    ...state,
    ball: null,
    ballsLeft,
    status: ballsLeft > 0 ? 'serving' : 'out',
    lastEvent: event,
  }
}

/**
 * One physics step, split into small sub-steps so the ball can
 * never tunnel through a brick or the paddle. Pure.
 *
 * Order per sub-step: move, then walls, then paddle, then bricks,
 * then the fall past the paddle. A brick hit breaks the brick and
 * bounces the ball (vertical bounce, unless the ball struck the
 * brick's side — then a horizontal bounce). A correct brick that
 * was the last one standing wins the round at once; a wrong brick
 * costs the ball at once.
 */
export function stepBall(
  state: BrickBounceState,
  dt: number,
): BrickBounceState {
  if (state.status !== 'playing' || !state.ball) return state
  let current: BrickBounceState = { ...state, lastEvent: null }
  const steps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP))
  const sub = dt / steps
  for (let i = 0; i < steps; i++) {
    if (current.status !== 'playing' || !current.ball) return current
    current = stepBallOnce(current, sub)
  }
  return current
}

function stepBallOnce(
  state: BrickBounceState,
  dt: number,
): BrickBounceState {
  const b = state.ball!
  const r = BRICK_BOUNCE_BALL_RADIUS
  let x = b.x + b.vx * dt
  let y = b.y + b.vy * dt
  let vx = b.vx
  let vy = b.vy

  // Side walls.
  if (x - r < 0) {
    x = r
    vx = Math.abs(vx)
  } else if (x + r > BRICK_BOUNCE_FIELD_WIDTH) {
    x = BRICK_BOUNCE_FIELD_WIDTH - r
    vx = -Math.abs(vx)
  }
  // Top wall.
  if (y - r < 0) {
    y = r
    vy = Math.abs(vy)
  }

  // Paddle: only when the ball is falling onto it.
  const halfP = BRICK_BOUNCE_PADDLE_WIDTH / 2
  if (
    vy > 0 &&
    y + r >= BRICK_BOUNCE_PADDLE_Y &&
    y - r <= BRICK_BOUNCE_PADDLE_Y + BRICK_BOUNCE_PADDLE_HEIGHT &&
    x >= state.paddleX - halfP - r &&
    x <= state.paddleX + halfP + r
  ) {
    y = BRICK_BOUNCE_PADDLE_Y - r
    // Bounce angle follows where the ball struck the paddle:
    // centre = straight up, edge = a sharp tilt (max 60°).
    const offset = Math.max(
      -1,
      Math.min(1, (x - state.paddleX) / halfP),
    )
    const angle = offset * (Math.PI / 3)
    const speed = Math.hypot(vx, vy)
    vx = speed * Math.sin(angle)
    vy = -speed * Math.cos(angle)
  }

  // Bricks: first standing brick the ball overlaps.
  for (const brick of state.round.bricks) {
    if (brick.smashed) continue
    if (
      x + r < brick.x ||
      x - r > brick.x + BRICK_BOUNCE_BRICK_WIDTH ||
      y + r < brick.y ||
      y - r > brick.y + BRICK_BOUNCE_BRICK_HEIGHT
    ) {
      continue
    }
    // Side hit when the ball's centre is outside the brick's
    // left/right span; otherwise a top/bottom hit.
    const sideHit =
      x < brick.x + r || x > brick.x + BRICK_BOUNCE_BRICK_WIDTH - r
    if (sideHit) vx = -vx
    else vy = -vy
    const smashed = state.round.bricks.map((t) =>
      t.id === brick.id ? { ...t, smashed: true } : t,
    )
    const ball = { x, y, vx, vy }
    if (brick.correct) {
      const left = smashed.filter((t) => t.correct && !t.smashed).length
      if (left === 0) {
        return {
          ...state,
          round: { ...state.round, bricks: smashed },
          ball: null,
          status: 'won',
          lastEvent: { kind: 'hit-correct', answer: brick.answer, correctLeft: 0 },
        }
      }
      return {
        ...state,
        round: { ...state.round, bricks: smashed },
        ball,
        lastEvent: { kind: 'hit-correct', answer: brick.answer, correctLeft: left },
      }
    }
    // A wrong brick costs the ball at once — no points.
    return loseBall(
      { ...state, round: { ...state.round, bricks: smashed }, ball },
      { kind: 'hit-wrong', answer: brick.answer, ballsLeft: state.ballsLeft - 1 },
    )
  }

  // Fell past the paddle: the ball is lost.
  if (y - r > BRICK_BOUNCE_FIELD_HEIGHT) {
    return loseBall(
      { ...state, ball: { x, y, vx, vy } },
      { kind: 'ball-lost', ballsLeft: state.ballsLeft - 1 },
    )
  }

  return { ...state, ball: { x, y, vx, vy } }
}

/**
 * Play a served ball until it stops (brick win, ball lost, or
 * the round ends). Pure and deterministic — for tests.
 */
export function simulateBall(
  state: BrickBounceState,
  dt = 1 / 60,
  maxSteps = 3600,
): BrickBounceState {
  let current = state
  for (let i = 0; i < maxSteps; i++) {
    if (current.status !== 'playing') return current
    current = stepBall(current, dt)
  }
  return current
}

/**
 * Build one round's wall: 15 bricks (5 x 3). The correct answer
 * sits on BRICK_BOUNCE_CORRECT_BRICKS bricks in shuffled spots;
 * the other bricks show the borrowed wrong answers, re-used
 * across the wall. Returns null when the answers build no round:
 * fewer than two different answers to borrow as wrong bricks.
 */
export function buildBrickBounceRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): BrickBounceRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowWrongAnswers(otherAnswers, clean)
  if (wrongs.length < BRICK_BOUNCE_MAX_WRONGS) return null
  const total = BRICK_BOUNCE_COLS * BRICK_BOUNCE_ROWS
  const spots = shuffled(
    Array.from({ length: total }, (_, i) => i),
  )
  const correctSpots = new Set(spots.slice(0, BRICK_BOUNCE_CORRECT_BRICKS))
  const wrongCycle = shuffled(wrongs)
  const bricks: BrickBounceBrick[] = []
  let wrongIdx = 0
  for (let i = 0; i < total; i++) {
    const col = i % BRICK_BOUNCE_COLS
    const row = Math.floor(i / BRICK_BOUNCE_COLS)
    const correct = correctSpots.has(i)
    const label = correct
      ? clean
      : wrongCycle[wrongIdx++ % wrongCycle.length]!
    bricks.push({
      id: `brick-${i}`,
      col,
      row,
      x: brickX(col),
      y: brickY(row),
      answer: label,
      correct,
      smashed: false,
    })
  }
  return { prompt, bricks, imageUrl, imageCredit }
}
