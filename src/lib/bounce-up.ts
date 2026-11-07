/**
 * Bounce Up — pure vertical-jumper / auto-bounce logic (no React,
 * no sound, no storage).
 *
 * EduPlay's own Doodle Jump-STYLE vertical jumper (type 58):
 * a little bouncer bounces upward from platform to platform
 * and must not fall. Doodle Jump-STYLE mechanic only: the name
 * is EduPlay's own, the bouncer is a plain smiling circle and
 * the platforms are plain rounded slabs drawn here — no Doodle
 * Jump name, no doodler, no Lima Sky art copied. Nothing here
 * invents content: the platforms carry the game's real answers
 * — the round's correct answer on some, wrong answers borrowed
 * from the game's other items on the rest.
 *
 * The world is 100 wide, y grows UPWARDS, and the camera shows
 * a 60-high window that follows the highest point the bouncer
 * has reached. The bounce itself is automatic: every landing
 * on a solid platform bounces the bouncer back up, high enough
 * to reach the next row (rows are 12 apart, a bounce rises
 * about 16). The kid only steers left and right in the air.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per CORRECT platform landed on (each
 *   correct platform scores only the first time it is landed
 *   on) and +10 for the star platform at the top. Every row
 *   holds two platforms — one with the right answer, one with
 *   a wrong one — so a round has 6 correct platforms plus the
 *   star, 70 points a round at most — score out of 70 x rounds.
 *   A wrong platform breaking never blocks the climb, because
 *   its row's other platform is still there to bounce from.
 * - Landing on a WRONG platform breaks it: it cracks and the
 *   bouncer falls straight through it, no bounce, no points —
 *   but no life is lost yet. The bouncer can still land on a
 *   lower platform on the way down and keep climbing.
 * - Falling below the bottom of the screen (the camera has
 *   scrolled up past the bouncer) ends the round at once and
 *   costs 1 life. The start pad at the bottom always bounces
 *   and never breaks, so an early fall is always recoverable.
 * - Landing on the star platform at the top wins the round.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win.
 * - A round needs at least two different answers to borrow as
 *   wrong platforms, or there is no choice in it. Wrong
 *   platforms re-use the borrowed wrong answers.
 */

export const BOUNCE_UP_LIVES = 3
export const BOUNCE_UP_MAX_ROUNDS = 10
/** Points for landing on one correct platform (first time). */
export const BOUNCE_UP_POINTS_PER_PLATFORM = 10
/** Regular (non-star) platform rows in every round. */
export const BOUNCE_UP_PLATFORMS_PER_ROUND = 6
/** Platforms in each row: one right answer, one wrong one. */
export const BOUNCE_UP_PLATFORMS_PER_ROW = 2
/** Correct regular platforms per round (one in every row). */
export const BOUNCE_UP_CORRECT_PER_ROUND = 6
/** Max points in one round: 2 correct platforms + the star. */
export const BOUNCE_UP_MAX_PER_ROUND =
  (BOUNCE_UP_CORRECT_PER_ROUND + 1) * BOUNCE_UP_POINTS_PER_PLATFORM
/** Field width, in field units (x wraps around the edges). */
export const BOUNCE_UP_FIELD_WIDTH = 100
/** Height of the camera window the kid sees. */
export const BOUNCE_UP_VIEW_HEIGHT = 60
/** Gravity, field units per second squared (pulls y down). */
export const BOUNCE_UP_GRAVITY = 70
/** Upward speed given by every bounce. Rises about 16 units —
 *  enough to reach the next row (12 apart) with room to spare. */
export const BOUNCE_UP_BOUNCE_VELOCITY = 48
/** Horizontal steering speed, field units per second. */
export const BOUNCE_UP_STEER_SPEED = 48
/** Vertical gap between platform rows. */
export const BOUNCE_UP_ROW_GAP = 12
/** Height of the first platform row. */
export const BOUNCE_UP_FIRST_ROW_Y = 14
/** Height of the star platform that wins the round. */
export const BOUNCE_UP_GOAL_Y =
  BOUNCE_UP_FIRST_ROW_Y +
  BOUNCE_UP_ROW_GAP * BOUNCE_UP_PLATFORMS_PER_ROUND
/** Half-width of a regular platform (plus the bouncer's radius
 *  is allowed when landing). */
export const BOUNCE_UP_PLATFORM_HALF_WIDTH = 9
/** Half-width of the star platform — wider, easier to land on. */
export const BOUNCE_UP_GOAL_HALF_WIDTH = 13
/** Half-width of the start pad at the bottom — wide enough to
 *  span every lane, so an early fall always lands back on it
 *  and only the scrolled-up camera can end a round. */
export const BOUNCE_UP_START_HALF_WIDTH = 35
/** The bouncer's radius, in field units. */
export const BOUNCE_UP_KID_RADIUS = 3
/** How far the camera sits below the highest point reached. */
export const BOUNCE_UP_CAMERA_LAG = 34
/** How far below the camera bottom the bouncer may fall before
 *  the round ends. */
export const BOUNCE_UP_FALL_MARGIN = 4
/** Wrong answers borrowed per round (re-used across wrong
 *  platforms). */
export const BOUNCE_UP_MAX_WRONGS = 2
/** Lanes a platform can sit in. A row holds two platforms in
 *  two different lanes, and a bounce crosses the whole width,
 *  so every next row is always reachable in one bounce. */
export const BOUNCE_UP_LANES = [20, 50, 80]
/** Max sub-step, so a fast bouncer can never tunnel through a
 *  platform row. */
const MAX_SUBSTEP = 1 / 60

export interface BounceUpPoint {
  x: number
  y: number
}

/** One platform: the answer it carries and whether it is the
 *  star platform at the top. */
export interface BounceUpPlatform {
  id: string
  x: number
  y: number
  answer: string
  correct: boolean
  goal: boolean
  /** True once a wrong platform has been landed on and broken. */
  broken: boolean
  /** True once a correct platform has paid its 10 points. */
  scored: boolean
}

export interface BounceUpRound {
  prompt: string
  platforms: BounceUpPlatform[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type BounceUpStatus = 'playing' | 'won' | 'out'

/** What the last step resolved to — the component turns it
 *  into feedback and sounds. */
export type BounceUpEvent =
  | { kind: 'landed-correct'; answer: string }
  | { kind: 'broke-wrong'; answer: string }
  | { kind: 'reached-top'; answer: string }
  | { kind: 'fell' }
  | null

/** The live state of one round. */
export interface BounceUpState {
  round: BounceUpRound
  /** The bouncer's position (y grows upwards). */
  x: number
  y: number
  /** The bouncer's velocity. */
  vx: number
  vy: number
  /** Highest y the bouncer has reached — drives the camera. */
  highestY: number
  status: BounceUpStatus
  lastEvent: BounceUpEvent
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
 * BOUNCE_UP_MAX_WRONGS, shuffled, without mutating the
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
  return shuffled(wrongs).slice(0, BOUNCE_UP_MAX_WRONGS)
}

/** Where the camera bottom sits for a highest point reached. */
export function bounceUpCameraY(highestY: number): number {
  return Math.max(0, highestY - BOUNCE_UP_CAMERA_LAG)
}

/** How high one bounce rises from a standstill launch. */
export function bounceUpBounceHeight(): number {
  return (
    (BOUNCE_UP_BOUNCE_VELOCITY * BOUNCE_UP_BOUNCE_VELOCITY) /
    (2 * BOUNCE_UP_GRAVITY)
  )
}

/** A fresh round: the bouncer on the start pad, bouncing. */
export function newBounceUpGame(round: BounceUpRound): BounceUpState {
  return {
    round: {
      ...round,
      platforms: round.platforms.map((p) => ({
        ...p,
        broken: false,
        scored: false,
      })),
    },
    x: 50,
    y: 0,
    vx: 0,
    vy: BOUNCE_UP_BOUNCE_VELOCITY,
    highestY: 0,
    status: 'playing',
    lastEvent: null,
  }
}

/**
 * One clock step, split into small sub-steps so the bouncer can
 * never tunnel through a platform row. Pure.
 *
 * Per sub-step: steer, apply gravity, move (x wraps around the
 * edges), then resolve: while falling, crossing a solid
 * platform's height with the bouncer over it is a landing —
 * the star platform wins the round, a correct platform pays
 * 10 points the first time and bounces, a wrong platform
 * breaks under the bouncer and the fall goes on. Falling below
 * the camera bottom ends the round at once.
 *
 * `steer` is -1 (left), 0 (none) or 1 (right).
 */
export function stepBounceUp(
  state: BounceUpState,
  dt: number,
  steer: number,
): BounceUpState {
  if (state.status !== 'playing') return state
  let current: BounceUpState = { ...state, lastEvent: null }
  const steps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP))
  const sub = dt / steps
  for (let i = 0; i < steps; i++) {
    if (current.status !== 'playing') return current
    current = stepBounceUpOnce(current, sub, steer)
  }
  return current
}

function stepBounceUpOnce(
  state: BounceUpState,
  dt: number,
  steer: number,
): BounceUpState {
  const clampedSteer = steer < 0 ? -1 : steer > 0 ? 1 : 0
  // Steering sets the horizontal speed at once (arcade feel);
  // with no steering the bouncer drifts to a stop.
  let vx = state.vx
  if (clampedSteer !== 0) {
    vx = clampedSteer * BOUNCE_UP_STEER_SPEED
  } else {
    vx = vx * Math.pow(0.05, dt)
    if (Math.abs(vx) < 0.1) vx = 0
  }
  const vy = state.vy - BOUNCE_UP_GRAVITY * dt
  let x = state.x + vx * dt
  // Wrap around the edges, like the classic jumper.
  if (x < 0) x += BOUNCE_UP_FIELD_WIDTH
  if (x >= BOUNCE_UP_FIELD_WIDTH) x -= BOUNCE_UP_FIELD_WIDTH
  const prevY = state.y
  const y = state.y + vy * dt
  let highestY = Math.max(state.highestY, y)
  const camY = bounceUpCameraY(highestY)

  // Falling below the camera bottom ends the round at once.
  if (y < camY - BOUNCE_UP_FALL_MARGIN) {
    return {
      ...state,
      x,
      y,
      vx,
      vy,
      highestY,
      status: 'out',
      lastEvent: { kind: 'fell' },
    }
  }

  // Landings only count while falling.
  if (vy < 0) {
    // The start pad at the bottom always bounces, never breaks.
    if (
      prevY >= 0 &&
      y <= 0 &&
      Math.abs(x - 50) <= BOUNCE_UP_START_HALF_WIDTH + BOUNCE_UP_KID_RADIUS
    ) {
      return {
        ...state,
        x,
        y: 0,
        vx,
        vy: BOUNCE_UP_BOUNCE_VELOCITY,
        highestY,
        lastEvent: null,
      }
    }
    for (const p of state.round.platforms) {
      if (p.broken) continue
      const half =
        (p.goal ? BOUNCE_UP_GOAL_HALF_WIDTH : BOUNCE_UP_PLATFORM_HALF_WIDTH) +
        BOUNCE_UP_KID_RADIUS
      if (prevY >= p.y && y <= p.y && Math.abs(x - p.x) <= half) {
        if (p.goal) {
          const platforms = state.round.platforms.map((q) =>
            q.id === p.id ? { ...q, scored: true } : q,
          )
          return {
            ...state,
            x,
            y: p.y,
            vx,
            vy: BOUNCE_UP_BOUNCE_VELOCITY,
            highestY,
            round: { ...state.round, platforms },
            status: 'won',
            lastEvent: { kind: 'reached-top', answer: p.answer },
          }
        }
        if (p.correct) {
          const alreadyScored = p.scored
          const platforms = state.round.platforms.map((q) =>
            q.id === p.id ? { ...q, scored: true } : q,
          )
          return {
            ...state,
            x,
            y: p.y,
            vx,
            vy: BOUNCE_UP_BOUNCE_VELOCITY,
            highestY,
            round: { ...state.round, platforms },
            lastEvent: alreadyScored
              ? null
              : { kind: 'landed-correct', answer: p.answer },
          }
        }
        // Wrong platform: it breaks and the fall goes on.
        const platforms = state.round.platforms.map((q) =>
          q.id === p.id ? { ...q, broken: true } : q,
        )
        return {
          ...state,
          x,
          y,
          vx,
          vy,
          highestY,
          round: { ...state.round, platforms },
          lastEvent: { kind: 'broke-wrong', answer: p.answer },
        }
      }
    }
  }

  return { ...state, x, y, vx, vy, highestY, lastEvent: null }
}

/**
 * Play a round until it settles (won, out, or the step budget
 * runs out) with a steering policy the caller supplies:
 * a function of the live state returning -1, 0 or 1. Pure and
 * deterministic — for tests: a policy that steers toward the
 * next correct platform above the bouncer wins the round, and
 * a policy that always steers away from every platform loses
 * it by falling.
 */
export function simulateBounceUp(
  state: BounceUpState,
  steerFn: (s: BounceUpState) => number,
  dt = 1 / 60,
  maxSteps = 36000,
): BounceUpState {
  let current = state
  for (let i = 0; i < maxSteps; i++) {
    if (current.status !== 'playing') return current
    current = stepBounceUp(current, dt, steerFn(current))
  }
  return current
}

/**
 * Build one round's climb: BOUNCE_UP_PLATFORMS_PER_ROUND rows
 * 12 apart, two platforms in each row — one with the correct
 * answer, one with a borrowed wrong answer — plus the star
 * platform at the top. The correct platform sits on a shuffled
 * side of each row, and each row uses two different lanes, so
 * the kid always has a real choice and a broken wrong platform
 * never blocks the climb. Returns null when the answers build
 * no round: fewer than two different answers to borrow as
 * wrong platforms.
 */
export function buildBounceUpRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): BounceUpRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowWrongAnswers(otherAnswers, clean)
  if (wrongs.length < BOUNCE_UP_MAX_WRONGS) return null
  const wrongCycle = shuffled(wrongs)
  const platforms: BounceUpPlatform[] = []
  for (let i = 0; i < BOUNCE_UP_PLATFORMS_PER_ROUND; i++) {
    // Two different lanes for this row, correct side shuffled.
    const lanes = shuffled(BOUNCE_UP_LANES).slice(0, BOUNCE_UP_PLATFORMS_PER_ROW)
    const correctSide = Math.floor(Math.random() * BOUNCE_UP_PLATFORMS_PER_ROW)
    for (let j = 0; j < BOUNCE_UP_PLATFORMS_PER_ROW; j++) {
      const correct = j === correctSide
      platforms.push({
        id: `plat-${i}-${j}`,
        x: lanes[j]!,
        y: BOUNCE_UP_FIRST_ROW_Y + BOUNCE_UP_ROW_GAP * i,
        answer: correct ? clean : wrongCycle[(i + j) % wrongCycle.length]!,
        correct,
        goal: false,
        broken: false,
        scored: false,
      })
    }
  }
  platforms.push({
    id: 'goal',
    x: BOUNCE_UP_LANES[Math.floor(Math.random() * BOUNCE_UP_LANES.length)]!,
    y: BOUNCE_UP_GOAL_Y,
    answer: clean,
    correct: true,
    goal: true,
    broken: false,
    scored: false,
  })
  return {
    prompt,
    platforms,
    imageUrl,
    imageCredit,
  }
}
