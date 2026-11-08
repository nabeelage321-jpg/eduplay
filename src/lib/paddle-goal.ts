/**
 * Paddle Goal — pure paddle/ball/goal physics + round logic (no
 * React, no sound, no storage).
 *
 * EduPlay's own arcade paddle game (type 60): the kid slides a
 * paddle along the bottom and bounces a ball up into the goal
 * mouth with the right answer. Paddle-and-ball mechanic only:
 * the name is EduPlay's own, the paddle, ball, and goal mouths
 * are plain shapes drawn here with an answer written on each
 * goal — no Breakout, Arkanoid, Pong, or other game's name or
 * art copied. Nothing here invents content: the goals carry
 * the game's real answers — the round's correct answer on one
 * goal, wrong answers borrowed from the game's other items on
 * the other two.
 *
 * The field is 100 wide x 60 high, y grows downwards. The
 * paddle sits near the bottom (y = 56, 16 wide, 2 high) and
 * slides left/right. Three goal mouths open in the top wall,
 * each 20 wide with solid wall between them: a ball that
 * reaches the top inside a goal mouth goes IN; a ball that
 * reaches the top between goals bounces back down off the
 * wall, so the kid keeps rallying until the ball finds a
 * mouth. The ball also bounces off the side walls and the
 * paddle; the bounce angle follows where the ball struck the
 * paddle (centre = straight up, edge = a sharp tilt).
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per CORRECT goal scored (one goal per
 *   round, one round per question, up to 10 rounds). Score out
 *   of 10 x rounds.
 * - 3 balls per round. The ball starts resting on the paddle;
 *   Space, a tap, or the LAUNCH button sends it up.
 * - Scoring in the CORRECT goal: +10, the goal flashes, the
 *   round is won at once.
 * - Scoring in a WRONG goal: the ball is swallowed — no
 *   points, the ball is lost at once. If balls are left, a
 *   fresh ball rests on the paddle; if not, the round ends and
 *   costs 1 life. (A wrong goal is a trap, not a free shot:
 *   read the answers before you aim.)
 * - A ball that falls past the paddle is lost the same way:
 *   one ball gone, fresh ball on the paddle if any are left.
 * - Spending all 3 balls without scoring the correct goal
 *   ends the round with no more points and costs 1 life.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win.
 * - A round needs at least two different answers to borrow as
 *   wrong goals, or the top has no choice in it.
 */

export const PADDLE_GOAL_LIVES = 3
export const PADDLE_GOAL_MAX_ROUNDS = 10
/** Points for scoring in the correct goal. */
export const PADDLE_GOAL_POINTS_PER_GOAL = 10
/** Max points in one round: one correct goal. */
export const PADDLE_GOAL_MAX_PER_ROUND = PADDLE_GOAL_POINTS_PER_GOAL
/** Balls per round. */
export const PADDLE_GOAL_BALLS_PER_ROUND = 3
/** Field size, in field units (y grows downwards). */
export const PADDLE_GOAL_FIELD_WIDTH = 100
export const PADDLE_GOAL_FIELD_HEIGHT = 60
/** Ball radius, for bounce checks. */
export const PADDLE_GOAL_BALL_RADIUS = 1.2
/** Paddle width / height, in field units. */
export const PADDLE_GOAL_PADDLE_WIDTH = 16
export const PADDLE_GOAL_PADDLE_HEIGHT = 2
/** Paddle top edge. */
export const PADDLE_GOAL_PADDLE_Y = 56
/** Ball speed after launch, field units per second. */
export const PADDLE_GOAL_BALL_SPEED = 38
/** Goal mouths across the top: 3 mouths, each 20 wide. */
export const PADDLE_GOAL_GOALS = 3
export const PADDLE_GOAL_GOAL_WIDTH = 20
/** Left edge of each goal mouth, in field units. */
export const PADDLE_GOAL_GOAL_X = [4, 40, 76]
/** Wrong answers borrowed per round. */
export const PADDLE_GOAL_MAX_WRONGS = 2
/** Paddle step per arrow-key press, in field units. */
export const PADDLE_GOAL_PADDLE_STEP = 4
/** Max sub-step, so a fast ball can never tunnel through a goal or the paddle. */
const MAX_SUBSTEP = 1 / 120

export interface PaddleGoalPoint {
  x: number
  y: number
}

/** One goal mouth in the top wall. */
export interface PaddleGoalGoal {
  id: string
  slot: number
  /** Left edge, in field units. */
  x: number
  answer: string
  correct: boolean
}

export interface PaddleGoalRound {
  prompt: string
  goals: PaddleGoalGoal[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type PaddleGoalStatus = 'serving' | 'playing' | 'won' | 'out'

/** What the last ball event was — the component turns it into feedback. */
export type PaddleGoalEvent =
  | { kind: 'goal'; answer: string }
  | { kind: 'wrong-goal'; answer: string; ballsLeft: number }
  | { kind: 'ball-lost'; ballsLeft: number }
  | null

/** The live state of one round. */
export interface PaddleGoalState {
  round: PaddleGoalRound
  paddleX: number
  ball: { x: number; y: number; vx: number; vy: number } | null
  ballsLeft: number
  status: PaddleGoalStatus
  lastEvent: PaddleGoalEvent
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

/** Left edge of a goal slot. */
export function goalX(slot: number): number {
  return PADDLE_GOAL_GOAL_X[slot] ?? 0
}

/** The goal mouth, if any, that the ball's x sits inside. */
export function goalAtX(x: number): number {
  for (let slot = 0; slot < PADDLE_GOAL_GOALS; slot++) {
    const left = goalX(slot)
    if (x >= left && x <= left + PADDLE_GOAL_GOAL_WIDTH) return slot
  }
  return -1
}

/** Centre of the paddle, clamped so it never leaves the field. */
export function clampPaddleX(x: number): number {
  const half = PADDLE_GOAL_PADDLE_WIDTH / 2
  return Math.max(half, Math.min(PADDLE_GOAL_FIELD_WIDTH - half, x))
}

/**
 * Wrong answers borrowed from the game's other items: distinct
 * answers that are not the correct one, at most
 * PADDLE_GOAL_MAX_WRONGS, shuffled, without mutating the
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
  return shuffled(wrongs).slice(0, PADDLE_GOAL_MAX_WRONGS)
}

/** A fresh round: three goal mouths, a full set of balls, ball on the paddle. */
export function newPaddleGoalGame(round: PaddleGoalRound): PaddleGoalState {
  return {
    round,
    paddleX: PADDLE_GOAL_FIELD_WIDTH / 2,
    ball: null,
    ballsLeft: PADDLE_GOAL_BALLS_PER_ROUND,
    status: 'serving',
    lastEvent: null,
  }
}

/** Where a served ball rests: on the paddle, following it. */
export function servedBallPosition(paddleX: number): PaddleGoalPoint {
  return {
    x: paddleX,
    y: PADDLE_GOAL_PADDLE_Y - PADDLE_GOAL_BALL_RADIUS - 0.5,
  }
}

/** Launch the served ball upwards (vx tilts it left or right). */
export function launchBall(
  state: PaddleGoalState,
  vx = 10,
): PaddleGoalState {
  if (state.status !== 'serving' || state.ballsLeft <= 0) return state
  const vy = -Math.sqrt(
    Math.max(0, PADDLE_GOAL_BALL_SPEED ** 2 - vx * vx),
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
  state: PaddleGoalState,
  x: number,
): PaddleGoalState {
  if (state.status === 'won' || state.status === 'out') return state
  return { ...state, paddleX: clampPaddleX(x) }
}

/** Lose one ball. Fresh ball on the paddle if any are left, else the round is out. */
function loseBall(
  state: PaddleGoalState,
  event: PaddleGoalEvent,
): PaddleGoalState {
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
 * never tunnel through a goal mouth or the paddle. Pure.
 *
 * Order per sub-step: move, then side walls, then the top
 * (goal mouth or wall bounce), then the paddle, then the fall
 * past the paddle. A ball in the correct goal wins the round
 * at once; a ball in a wrong goal costs the ball at once.
 */
export function stepBall(
  state: PaddleGoalState,
  dt: number,
): PaddleGoalState {
  if (state.status !== 'playing' || !state.ball) return state
  let current: PaddleGoalState = { ...state, lastEvent: null }
  const steps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP))
  const sub = dt / steps
  for (let i = 0; i < steps; i++) {
    if (current.status !== 'playing' || !current.ball) return current
    current = stepBallOnce(current, sub)
  }
  return current
}

function stepBallOnce(
  state: PaddleGoalState,
  dt: number,
): PaddleGoalState {
  const b = state.ball!
  const r = PADDLE_GOAL_BALL_RADIUS
  let x = b.x + b.vx * dt
  let y = b.y + b.vy * dt
  let vx = b.vx
  let vy = b.vy

  // Side walls.
  if (x - r < 0) {
    x = r
    vx = Math.abs(vx)
  } else if (x + r > PADDLE_GOAL_FIELD_WIDTH) {
    x = PADDLE_GOAL_FIELD_WIDTH - r
    vx = -Math.abs(vx)
  }

  // Top: a goal mouth swallows the ball, solid wall bounces it.
  if (y - r < 0) {
    const slot = goalAtX(x)
    if (slot >= 0) {
      const goal = state.round.goals.find((g) => g.slot === slot)
      if (goal) {
        if (goal.correct) {
          return {
            ...state,
            ball: null,
            status: 'won',
            lastEvent: { kind: 'goal', answer: goal.answer },
          }
        }
        // A wrong goal swallows the ball at once — no points.
        return loseBall(
          { ...state, ball: { x, y, vx, vy } },
          { kind: 'wrong-goal', answer: goal.answer, ballsLeft: state.ballsLeft - 1 },
        )
      }
    }
    y = r
    vy = Math.abs(vy)
  }

  // Paddle: only when the ball is falling onto it.
  const halfP = PADDLE_GOAL_PADDLE_WIDTH / 2
  if (
    vy > 0 &&
    y + r >= PADDLE_GOAL_PADDLE_Y &&
    y - r <= PADDLE_GOAL_PADDLE_Y + PADDLE_GOAL_PADDLE_HEIGHT &&
    x >= state.paddleX - halfP - r &&
    x <= state.paddleX + halfP + r
  ) {
    y = PADDLE_GOAL_PADDLE_Y - r
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

  // Fell past the paddle: the ball is lost.
  if (y - r > PADDLE_GOAL_FIELD_HEIGHT) {
    return loseBall(
      { ...state, ball: { x, y, vx, vy } },
      { kind: 'ball-lost', ballsLeft: state.ballsLeft - 1 },
    )
  }

  return { ...state, ball: { x, y, vx, vy } }
}

/**
 * Play a served ball until it stops (goal, ball lost, or the
 * round ends). Pure and deterministic — for tests.
 */
export function simulateBall(
  state: PaddleGoalState,
  dt = 1 / 60,
  maxSteps = 3600,
): PaddleGoalState {
  let current = state
  for (let i = 0; i < maxSteps; i++) {
    if (current.status !== 'playing') return current
    current = stepBall(current, dt)
  }
  return current
}

/**
 * Build one round's top wall: 3 goal mouths. The correct answer
 * sits on one goal in a shuffled slot; the other two show the
 * borrowed wrong answers. Returns null when the answers build
 * no round: fewer than two different answers to borrow as
 * wrong goals.
 */
export function buildPaddleGoalRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): PaddleGoalRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowWrongAnswers(otherAnswers, clean)
  if (wrongs.length < PADDLE_GOAL_MAX_WRONGS) return null
  const correctSlot = Math.floor(Math.random() * PADDLE_GOAL_GOALS)
  const goals: PaddleGoalGoal[] = []
  for (let slot = 0; slot < PADDLE_GOAL_GOALS; slot++) {
    const correct = slot === correctSlot
    goals.push({
      id: `goal-${slot}`,
      slot,
      x: goalX(slot),
      answer: correct ? clean : wrongs[slot < correctSlot ? slot : slot - 1]!,
      correct,
    })
  }
  return { prompt, goals, imageUrl, imageCredit }
}
