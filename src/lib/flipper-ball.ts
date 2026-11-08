/**
 * Flipper Ball — pure pinball-style flipper / ball / target
 * physics + round logic (no React, no sound, no storage).
 *
 * EduPlay's own pinball-STYLE game (type 63): the kid works two
 * flippers at the bottom of the table and keeps a ball bouncing
 * among bumpers and answer targets. Pinball-STYLE mechanic only:
 * the name is EduPlay's own, the table, flippers, ball, bumpers,
 * and targets are plain shapes drawn here — no pinball machine
 * name, no trademarked game name, no copied art. Nothing here
 * invents content: the targets carry the game's real answers —
 * the round's correct answer on one target, wrong answers
 * borrowed from the game's other items on the other two.
 *
 * The field is 100 wide x 62 high, y grows downwards. Gravity
 * pulls the ball down; the walls, bumpers, and targets bounce
 * it; the two flippers at the bottom bat it back up. The ball
 * drops in from the top centre at the start of every ball.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per CORRECT target hit. One correct
 *   target per round, 10 rounds — score out of 10 x rounds.
 * - 3 balls per round. Space, a tap, or the FLIP button (or the
 *   arrow keys / A and D, or tapping the left / right half of
 *   the table) launches the ball, and the flippers bat it while
 *   it is in play.
 * - Hitting the CORRECT target: +10, the target lights up, the
 *   round is won at once.
 * - Hitting a WRONG target: the target flashes red and the ball
 *   is lost at once (no points). A fresh ball drops in if any
 *   are left; if not, the round ends and costs 1 life. (A wrong
 *   target is a trap, not a free hit: read the targets before
 *   you flip.)
 * - A ball that drains past the flippers is lost the same way —
 *   EXCEPT the first drain in every round is saved for free
 *   ("Ball saved!"), a fresh ball drops in and no ball is lost.
 *   The save is the forgiving part: one free mistake a round.
 * - Spending all 3 balls without hitting the correct target
 *   ends the round with no more points and costs 1 life.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win.
 * - A round needs at least two different answers to borrow as
 *   wrong targets, or the table has no choice in it.
 */

export const FLIPPER_BALL_LIVES = 3
export const FLIPPER_BALL_MAX_ROUNDS = 10
/** Points for hitting the one correct target in a round. */
export const FLIPPER_BALL_POINTS_PER_HIT = 10
/** Answer targets on the table in every round: one right
 *  answer, two borrowed wrong ones. */
export const FLIPPER_BALL_TARGETS_PER_ROUND = 3
/** Max points in one round: one correct target hit. */
export const FLIPPER_BALL_MAX_PER_ROUND = FLIPPER_BALL_POINTS_PER_HIT
/** Balls per round. */
export const FLIPPER_BALL_BALLS_PER_ROUND = 3
/** Field size, in field units (y grows downwards). */
export const FLIPPER_BALL_FIELD_WIDTH = 100
export const FLIPPER_BALL_FIELD_HEIGHT = 62
/** Ball radius, for bounce checks. */
export const FLIPPER_BALL_RADIUS = 1.4
/** Gravity pulling the ball down, field units per second squared. */
export const FLIPPER_BALL_GRAVITY = 55
/** Ball speed after a flipper bat, field units per second. */
export const FLIPPER_BALL_FLIP_SPEED = 42
/** How long one flip stays up, in seconds. */
export const FLIPPER_BALL_FLIP_DURATION = 0.18
/** Fastest the ball is ever allowed to go. */
export const FLIPPER_BALL_MAX_SPEED = 58
/** Max sub-step, so a fast ball can never tunnel through a
 *  target, bumper, or flipper. */
const MAX_SUBSTEP = 1 / 120

/** Flipper pivots (field units) and length. */
export const FLIPPER_BALL_LEFT_PIVOT = { x: 30, y: 56 }
export const FLIPPER_BALL_RIGHT_PIVOT = { x: 70, y: 56 }
export const FLIPPER_BALL_FLIPPER_LENGTH = 15
/** Flipper angles, radians from +x with y growing downwards, so
 *  a positive angle points down. At rest each flipper points
 *  down towards the middle gap; flipped, it points up. */
export const FLIPPER_BALL_LEFT_REST_ANGLE = 0.45
export const FLIPPER_BALL_LEFT_UP_ANGLE = -0.55
export const FLIPPER_BALL_RIGHT_REST_ANGLE = Math.PI - 0.45
export const FLIPPER_BALL_RIGHT_UP_ANGLE = Math.PI + 0.55

/** Answer-target spots on the table (centre, field units). */
export const FLIPPER_BALL_TARGET_SPOTS = [
  { x: 22, y: 18 },
  { x: 50, y: 12 },
  { x: 78, y: 18 },
]
/** Target radius, in field units. */
export const FLIPPER_BALL_TARGET_RADIUS = 6.5
/** Plain star bumpers: bounce only, never score. */
export const FLIPPER_BALL_BUMPERS = [
  { x: 35, y: 36, r: 4 },
  { x: 65, y: 36, r: 4 },
]
/** Where a fresh ball drops in from. */
export const FLIPPER_BALL_SERVE_X = 50
export const FLIPPER_BALL_SERVE_Y = 6

export interface FlipperBallPoint {
  x: number
  y: number
}

/** One answer target on the table. */
export interface FlipperBallTarget {
  id: string
  /** Centre, in field units. */
  x: number
  y: number
  answer: string
  correct: boolean
  /** True once this target has been hit (wrong ones flash red). */
  hit: boolean
}

export interface FlipperBallRound {
  prompt: string
  targets: FlipperBallTarget[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type FlipperBallStatus = 'serving' | 'playing' | 'won' | 'out'
export type FlipperBallSide = 'left' | 'right'

/** What the last ball step did — the component turns it into
 *  feedback and sounds. */
export type FlipperBallEvent =
  | { kind: 'hit-correct'; answer: string }
  | { kind: 'hit-wrong'; answer: string; ballsLeft: number }
  | { kind: 'ball-saved' }
  | { kind: 'ball-lost'; ballsLeft: number }
  | { kind: 'bump' }
  | null

/** The live state of one round. */
export interface FlipperBallState {
  round: FlipperBallRound
  ball: { x: number; y: number; vx: number; vy: number } | null
  ballsLeft: number
  /** True once the round's one free ball save has been used. */
  saveUsed: boolean
  /** Seconds of flip left on each flipper (0 = at rest). */
  leftFlip: number
  rightFlip: number
  status: FlipperBallStatus
  lastEvent: FlipperBallEvent
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
 * Wrong answers borrowed from the game's other items: distinct
 * answers that are not the correct one, at most
 * FLIPPER_BALL_TARGETS_PER_ROUND - 1, shuffled, without
 * mutating the caller's array.
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
  return shuffled(wrongs).slice(
    0,
    FLIPPER_BALL_TARGETS_PER_ROUND - 1,
  )
}

/** The angle of one flipper right now: up while its flip
 *  timer is running, at rest otherwise. */
export function flipperAngle(side: FlipperBallSide, flipTimer: number): number {
  if (side === 'left') {
    return flipTimer > 0
      ? FLIPPER_BALL_LEFT_UP_ANGLE
      : FLIPPER_BALL_LEFT_REST_ANGLE
  }
  return flipTimer > 0
    ? FLIPPER_BALL_RIGHT_UP_ANGLE
    : FLIPPER_BALL_RIGHT_REST_ANGLE
}

/** The tip of one flipper right now, from its pivot and angle. */
export function flipperTip(
  side: FlipperBallSide,
  flipTimer: number,
): FlipperBallPoint {
  const pivot =
    side === 'left'
      ? FLIPPER_BALL_LEFT_PIVOT
      : FLIPPER_BALL_RIGHT_PIVOT
  const angle = flipperAngle(side, flipTimer)
  return {
    x: pivot.x + Math.cos(angle) * FLIPPER_BALL_FLIPPER_LENGTH,
    y: pivot.y + Math.sin(angle) * FLIPPER_BALL_FLIPPER_LENGTH,
  }
}

/** A fresh round: three answer targets, a full set of balls,
 *  the free ball save still unused, ball not yet dropped in. */
export function newFlipperBallGame(
  round: FlipperBallRound,
): FlipperBallState {
  return {
    round: {
      ...round,
      targets: round.targets.map((t) => ({ ...t, hit: false })),
    },
    ball: null,
    ballsLeft: FLIPPER_BALL_BALLS_PER_ROUND,
    saveUsed: false,
    leftFlip: 0,
    rightFlip: 0,
    status: 'serving',
    lastEvent: null,
  }
}

/** Drop a fresh ball in from the top centre. */
export function launchBall(
  state: FlipperBallState,
  vx = 6,
): FlipperBallState {
  if (state.status !== 'serving' || state.ballsLeft <= 0) return state
  return {
    ...state,
    ball: { x: FLIPPER_BALL_SERVE_X, y: FLIPPER_BALL_SERVE_Y, vx, vy: 10 },
    status: 'playing',
    lastEvent: null,
  }
}

/** Bat one flipper: it stays up for FLIPPER_BALL_FLIP_DURATION.
 *  Works while serving too, so the kid can practise the flip. */
export function flip(
  state: FlipperBallState,
  side: FlipperBallSide,
): FlipperBallState {
  if (state.status === 'won' || state.status === 'out') return state
  if (side === 'left') {
    return { ...state, leftFlip: FLIPPER_BALL_FLIP_DURATION }
  }
  return { ...state, rightFlip: FLIPPER_BALL_FLIP_DURATION }
}

/** Lose one ball. Fresh ball drops in if any are left, else
 *  the round is out. */
function loseBall(
  state: FlipperBallState,
  event: FlipperBallEvent,
): FlipperBallState {
  const ballsLeft = state.ballsLeft - 1
  return {
    ...state,
    ball: null,
    ballsLeft,
    status: ballsLeft > 0 ? 'serving' : 'out',
    lastEvent: event,
  }
}

/** Closest point on the segment a->b to point p. */
function closestOnSegment(
  p: FlipperBallPoint,
  a: FlipperBallPoint,
  b: FlipperBallPoint,
): FlipperBallPoint {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return { ...a }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return { x: a.x + t * dx, y: a.y + t * dy }
}

/**
 * One physics step, split into small sub-steps so the ball can
 * never tunnel through a target, bumper, or flipper. Pure.
 *
 * Order per sub-step: flip timers tick down, gravity pulls the
 * ball, the ball moves, then walls, flippers, targets, and
 * bumpers, then the drain past the flippers. A correct target
 * wins the round at once; a wrong target costs the ball at
 * once; a plain bumper just bounces the ball on with a boing.
 * The first drain in a round is saved for free.
 */
export function stepBall(
  state: FlipperBallState,
  dt: number,
): FlipperBallState {
  if (state.status !== 'playing' || !state.ball) {
    return { ...state, lastEvent: null }
  }
  let s: FlipperBallState = {
    ...state,
    round: {
      ...state.round,
      targets: state.round.targets.map((t) => ({ ...t })),
    },
    ball: { ...state.ball },
    lastEvent: null,
  }
  let remaining = dt
  while (remaining > 0) {
    const h = Math.min(MAX_SUBSTEP, remaining)
    remaining -= h
    if (s.lastEvent) break
    if (!s.ball) break
    s = stepOnce(s, h)
  }
  return s
}

function stepOnce(
  s: FlipperBallState,
  h: number,
): FlipperBallState {
  const ball = s.ball
  if (!ball) return s
  const leftFlip = Math.max(0, s.leftFlip - h)
  const rightFlip = Math.max(0, s.rightFlip - h)
  let { x, y, vx, vy } = ball
  vy += FLIPPER_BALL_GRAVITY * h
  // Cap the speed so the ball stays catchable for a kid.
  const speed = Math.hypot(vx, vy)
  if (speed > FLIPPER_BALL_MAX_SPEED) {
    vx = (vx / speed) * FLIPPER_BALL_MAX_SPEED
    vy = (vy / speed) * FLIPPER_BALL_MAX_SPEED
  }
  x += vx * h
  y += vy * h
  let next: FlipperBallState = {
    ...s,
    ball: { x, y, vx, vy },
    leftFlip,
    rightFlip,
  }

  // Walls: left, right, top.
  if (x < FLIPPER_BALL_RADIUS) {
    x = FLIPPER_BALL_RADIUS
    vx = Math.abs(vx)
  } else if (x > FLIPPER_BALL_FIELD_WIDTH - FLIPPER_BALL_RADIUS) {
    x = FLIPPER_BALL_FIELD_WIDTH - FLIPPER_BALL_RADIUS
    vx = -Math.abs(vx)
  }
  if (y < FLIPPER_BALL_RADIUS) {
    y = FLIPPER_BALL_RADIUS
    vy = Math.abs(vy)
  }
  next = { ...next, ball: { x, y, vx, vy } }

  // Flippers: a ball touching a flipper segment is batted up.
  // A flipper mid-flip bats hard; a resting flipper bounces
  // the ball gently back up.
  for (const side of ['left', 'right'] as const) {
    const pivot =
      side === 'left'
        ? FLIPPER_BALL_LEFT_PIVOT
        : FLIPPER_BALL_RIGHT_PIVOT
    const timer = side === 'left' ? leftFlip : rightFlip
    const tip = flipperTip(side, timer)
    const closest = closestOnSegment({ x, y }, pivot, tip)
    const dx = x - closest.x
    const dy = y - closest.y
    const dist = Math.hypot(dx, dy)
    if (dist < FLIPPER_BALL_RADIUS + 0.8) {
      if (timer > 0) {
        // Mid-flip: strong bat upwards, away from the pivot.
        const away = x >= pivot.x ? 1 : -1
        vx = away * 14
        vy = -FLIPPER_BALL_FLIP_SPEED
      } else if (vy > 0) {
        // Resting flipper: gentle bounce back up.
        vy = -Math.abs(vy) * 0.55 - 4
        vx = vx * 0.8 + (x >= pivot.x ? 3 : -3)
      }
      // Push the ball out of the flipper so it cannot stick.
      const push = FLIPPER_BALL_RADIUS + 0.9 - dist
      const nx = dist > 0 ? dx / dist : 0
      const ny = dist > 0 ? dy / dist : -1
      x += nx * push
      y += ny * push
      next = { ...next, ball: { x, y, vx, vy } }
    }
  }

  // Answer targets: a hit on the correct one wins the round;
  // a hit on a wrong one costs the ball at once.
  for (let i = 0; i < next.round.targets.length; i++) {
    const t = next.round.targets[i]!
    if (t.hit) continue
    const dx = x - t.x
    const dy = y - t.y
    const dist = Math.hypot(dx, dy)
    if (dist < FLIPPER_BALL_TARGET_RADIUS + FLIPPER_BALL_RADIUS) {
      const targets = next.round.targets.map((tt, j) =>
        j === i ? { ...tt, hit: true } : tt,
      )
      if (t.correct) {
        return {
          ...next,
          round: { ...next.round, targets },
          status: 'won',
          lastEvent: { kind: 'hit-correct', answer: t.answer },
        }
      }
      return loseBall(
        { ...next, round: { ...next.round, targets } },
        { kind: 'hit-wrong', answer: t.answer, ballsLeft: next.ballsLeft - 1 },
      )
    }
  }

  // Plain star bumpers: bounce only, never score.
  for (const b of FLIPPER_BALL_BUMPERS) {
    const dx = x - b.x
    const dy = y - b.y
    const dist = Math.hypot(dx, dy)
    if (dist < b.r + FLIPPER_BALL_RADIUS && dist > 0) {
      const nx = dx / dist
      const ny = dy / dist
      // Reflect the velocity across the bumper normal.
      const dot = vx * nx + vy * ny
      vx = vx - 2 * dot * nx
      vy = vy - 2 * dot * ny
      // A little extra push so the ball never stalls on a bumper.
      vx += nx * 6
      vy += ny * 6
      x = b.x + nx * (b.r + FLIPPER_BALL_RADIUS + 0.1)
      y = b.y + ny * (b.r + FLIPPER_BALL_RADIUS + 0.1)
      return {
        ...next,
        ball: { x, y, vx, vy },
        lastEvent: { kind: 'bump' },
      }
    }
  }

  // Drain past the flippers: the first drain in a round is
  // saved for free; later drains cost the ball.
  if (y > FLIPPER_BALL_FIELD_HEIGHT + 2) {
    if (!next.saveUsed) {
      return {
        ...next,
        ball: null,
        saveUsed: true,
        status: 'serving',
        lastEvent: { kind: 'ball-saved' },
      }
    }
    return loseBall(next, {
      kind: 'ball-lost',
      ballsLeft: next.ballsLeft - 1,
    })
  }

  return next
}

/**
 * Build one round's table: 3 answer targets, one holding the
 * correct answer and the other two holding borrowed wrong
 * answers, standing on the three target spots in shuffled
 * order. Returns null when the answers build no round: fewer
 * than two different answers to borrow as wrong targets.
 */
export function buildFlipperBallRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): FlipperBallRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowWrongAnswers(otherAnswers, clean)
  if (wrongs.length < FLIPPER_BALL_TARGETS_PER_ROUND - 1) return null
  const correctSpot = Math.floor(
    Math.random() * FLIPPER_BALL_TARGETS_PER_ROUND,
  )
  const spots = shuffled(FLIPPER_BALL_TARGET_SPOTS)
  const targets: FlipperBallTarget[] = spots.map((spot, i) => {
    const correct = i === correctSpot
    return {
      id: `target-${i}`,
      x: spot.x,
      y: spot.y,
      answer: correct ? clean : wrongs[i < correctSpot ? i : i - 1]!,
      correct,
      hit: false,
    }
  })
  return {
    prompt,
    targets,
    imageUrl,
    imageCredit,
  }
}
