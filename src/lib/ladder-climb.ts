/**
 * Ladder Climb — pure climber / ladder / rolling-barrel physics +
 * round logic (no React, no sound, no storage).
 *
 * EduPlay's own Donkey Kong-STYLE climber (type 54): the kid
 * climbs ladders between platforms to the top while barrels
 * roll down. Donkey Kong-STYLE mechanic only: the name is
 * EduPlay's own, the climber is a plain figure, the barrels
 * plain brown circles with no character on them, the ladders
 * plain rails and rungs — no Donkey Kong name, no ape or
 * barrel-throwing character, no Nintendo art copied. Nothing
 * here invents content: the ladders carry the game's real
 * answers — the round's correct answer at the top of one
 * ladder, wrong answers borrowed from the game's other items
 * at the tops of the rest.
 *
 * The field is 100 wide x 60 high, y grows downwards. Five
 * platforms run the full width at y = 54 (ground), 42, 30,
 * 18 and 6 (top). Three ladders at x = 20, 50 and 80 join
 * them all, ground to top. The kid starts on the ground in
 * the middle, walks left and right, climbs a ladder up or
 * down, and jumps to hop over a rolling barrel. Barrels spawn
 * at the top, roll along a platform, and when one reaches an
 * edge it drops down to the next platform and rolls back the
 * other way; a barrel that rolls off the ground is gone.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per CORRECT ladder climbed (one
 *   correct ladder per round, one round per question, up to
 *   10 rounds). Score out of 10 x rounds.
 * - Reaching the top of the CORRECT ladder: +10, the round
 *   is won.
 * - Reaching the top of a WRONG ladder: no points, no life
 *   lost — the kid has to climb back down and try another
 *   ladder. A wrong ladder is marked tried, so climbing it
 *   again says nothing new.
 * - Hit by a barrel: 1 life lost and the round ends at once.
 *   Jumping over a barrel dodges it — a barrel can only hit
 *   a kid on the ground or on a ladder, never one in the air.
 *   A climbing kid times the climb between barrels.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win.
 * - A round needs at least two different answers to borrow as
 *   wrong ladders, or there is no choice in it. Wrong ladders
 *   re-use the borrowed wrong answers.
 */

export const LADDER_CLIMB_LIVES = 3
export const LADDER_CLIMB_MAX_ROUNDS = 10
/** Points for climbing the correct ladder. */
export const LADDER_CLIMB_POINTS_PER_LADDER = 10
/** Ladders in every round (1 correct + 2 wrong). */
export const LADDER_CLIMB_LADDERS = 3
/** Field size, in field units (y grows downwards). */
export const LADDER_CLIMB_FIELD_WIDTH = 100
export const LADDER_CLIMB_FIELD_HEIGHT = 60
/** Platform heights, ground first, top last (y grows down). */
export const LADDER_CLIMB_PLATFORM_Y = [54, 42, 30, 18, 6]
/** Ladder columns, left to right. */
export const LADDER_CLIMB_LADDER_X = [20, 50, 80]
/** Walking speed, field units per second. */
export const LADDER_CLIMB_WALK_SPEED = 26
/** Climbing speed, field units per second. */
export const LADDER_CLIMB_CLIMB_SPEED = 15
/** Jump launch speed, field units per second (up is negative). */
export const LADDER_CLIMB_JUMP_SPEED = 27
/** Gravity pulling a jumping kid back down. */
export const LADDER_CLIMB_GRAVITY = 64
/** Kid radius, for barrel-hit checks. */
export const LADDER_CLIMB_KID_RADIUS = 2.5
/** Barrel radius, for barrel-hit checks. */
export const LADDER_CLIMB_BARREL_RADIUS = 2.5
/** How close (in x) the kid must be to grab a ladder. */
export const LADDER_CLIMB_LADDER_GRAB = 3
/** Seconds between barrel spawns. */
export const LADDER_CLIMB_SPAWN_INTERVAL = 2.0
/** Seconds before the first barrel of a round rolls in. */
export const LADDER_CLIMB_FIRST_SPAWN = 1.2
/** Most barrels rolling at once. */
export const LADDER_CLIMB_MAX_BARRELS = 5
/** Barrel rolling speed range, field units per second. */
export const LADDER_CLIMB_BARREL_MIN_SPEED = 9
export const LADDER_CLIMB_BARREL_MAX_SPEED = 13
/** Wrong answers borrowed per round (re-used across wrong ladders). */
export const LADDER_CLIMB_MAX_WRONGS = 2
/** Max sub-step, so a fast barrel can never tunnel through the kid. */
const MAX_SUBSTEP = 1 / 60
/** Ground level (index into LADDER_CLIMB_PLATFORM_Y). */
const GROUND_LEVEL = 0
/** Top level (index into LADDER_CLIMB_PLATFORM_Y). */
const TOP_LEVEL = LADDER_CLIMB_PLATFORM_Y.length - 1

export interface LadderClimbPoint {
  x: number
  y: number
}

/** One ladder: its column, the answer at its top, tried or not. */
export interface LadderClimbLadder {
  id: string
  x: number
  answer: string
  correct: boolean
  tried: boolean
}

/** One rolling barrel. */
export interface LadderClimbBarrel {
  id: string
  x: number
  /** Index into LADDER_CLIMB_PLATFORM_Y — the platform it rolls on. */
  level: number
  /** Rolling speed, signed: positive rolls right. */
  vx: number
}

/** The kid: position, ladder, and jump state. */
export interface LadderClimbKid {
  x: number
  y: number
  /** Index of the ladder being climbed, or null when walking. */
  climbing: number | null
  /** Vertical speed while jumping (0 when standing or climbing). */
  vy: number
  /** True while the kid is in the air after a jump. */
  airborne: boolean
}

export interface LadderClimbRound {
  prompt: string
  ladders: LadderClimbLadder[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type LadderClimbStatus = 'playing' | 'won' | 'out'

/** What the last step resolved to — the component turns it into feedback. */
export type LadderClimbEvent =
  | { kind: 'reached-correct'; answer: string }
  | { kind: 'reached-wrong'; answer: string }
  | { kind: 'barrel-hit' }
  | null

/** The live state of one round. */
export interface LadderClimbState {
  round: LadderClimbRound
  kid: LadderClimbKid
  barrels: LadderClimbBarrel[]
  /** Seconds until the next barrel spawns. */
  spawnIn: number
  status: LadderClimbStatus
  lastEvent: LadderClimbEvent
}

/** Held controls for one physics step. */
export interface LadderClimbInput {
  /** -1 = walk left, 0 = still, 1 = walk right. */
  move: -1 | 0 | 1
  /** -1 = climb up, 0 = hold, 1 = climb down. */
  climb: -1 | 0 | 1
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
 * LADDER_CLIMB_MAX_WRONGS, shuffled, without mutating the
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
  return shuffled(wrongs).slice(0, LADDER_CLIMB_MAX_WRONGS)
}

/** The platform height a y sits on (nearest level, for landing). */
export function platformYFor(y: number): number {
  let best = LADDER_CLIMB_PLATFORM_Y[0]!
  for (const level of LADDER_CLIMB_PLATFORM_Y) {
    if (Math.abs(level - y) < Math.abs(best - y)) best = level
  }
  return best
}

/** Where the kid starts: the middle of the ground, on foot. */
export function newLadderClimbKid(): LadderClimbKid {
  return {
    x: LADDER_CLIMB_FIELD_WIDTH / 2,
    y: LADDER_CLIMB_PLATFORM_Y[GROUND_LEVEL]!,
    climbing: null,
    vy: 0,
    airborne: false,
  }
}

/** A fresh round: kid on the ground, no barrels yet, first one soon. */
export function newLadderClimbGame(round: LadderClimbRound): LadderClimbState {
  return {
    round: {
      ...round,
      ladders: round.ladders.map((l) => ({ ...l, tried: false })),
    },
    kid: newLadderClimbKid(),
    barrels: [],
    spawnIn: LADDER_CLIMB_FIRST_SPAWN,
    status: 'playing',
    lastEvent: null,
  }
}

let barrelCounter = 0

/** Spawn one barrel at the top platform, rolling in from a side. */
function spawnBarrel(state: LadderClimbState): LadderClimbBarrel {
  barrelCounter += 1
  const fromLeft = Math.random() < 0.5
  const speed =
    LADDER_CLIMB_BARREL_MIN_SPEED +
    Math.random() *
      (LADDER_CLIMB_BARREL_MAX_SPEED - LADDER_CLIMB_BARREL_MIN_SPEED)
  return {
    id: `barrel-${barrelCounter}`,
    x: fromLeft ? 4 : LADDER_CLIMB_FIELD_WIDTH - 4,
    level: TOP_LEVEL,
    vx: fromLeft ? speed : -speed,
  }
}

/**
 * Jump: the kid leaves the platform and comes back down on it.
 * Only on foot, on a platform — never while climbing a ladder
 * or already in the air, and never when the round is over.
 */
export function jumpKid(state: LadderClimbState): LadderClimbState {
  if (state.status !== 'playing') return state
  const kid = state.kid
  if (kid.climbing !== null || kid.airborne) return state
  return {
    ...state,
    kid: { ...kid, vy: -LADDER_CLIMB_JUMP_SPEED, airborne: true },
    lastEvent: null,
  }
}

/**
 * One physics step, split into small sub-steps so a fast barrel
 * can never tunnel through the kid. Pure.
 *
 * Order per sub-step: move/climb the kid, jump physics, spawn
 * and roll the barrels (dropping a level at each edge), then
 * resolve: ladder-top arrival, then barrel hits. A barrel can
 * only hit a kid on the ground or on a ladder — one in the air
 * after a jump is safe, which is how the kid dodges.
 */
export function stepLadderClimb(
  state: LadderClimbState,
  dt: number,
  input: LadderClimbInput,
): LadderClimbState {
  if (state.status !== 'playing') return state
  let current: LadderClimbState = { ...state, lastEvent: null }
  const steps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP))
  const sub = dt / steps
  for (let i = 0; i < steps; i++) {
    if (current.status !== 'playing') return current
    current = stepLadderClimbOnce(current, sub, input)
  }
  return current
}

function stepLadderClimbOnce(
  state: LadderClimbState,
  dt: number,
  input: LadderClimbInput,
): LadderClimbState {
  const kid = { ...state.kid }
  const ladders = state.round.ladders

  // Grab a ladder: climbing up or down while standing close to
  // one snaps the kid onto it.
  if (kid.climbing === null && !kid.airborne && input.climb !== 0) {
    const near = ladders.findIndex(
      (l) => Math.abs(kid.x - l.x) <= LADDER_CLIMB_LADDER_GRAB,
    )
    if (near >= 0) {
      kid.climbing = near
      kid.x = ladders[near]!.x
    }
  }

  if (kid.climbing !== null) {
    // On a ladder: up/down moves along it. Walking off is only
    // allowed standing on a platform, never mid-climb.
    const ladder = ladders[kid.climbing]!
    kid.x = ladder.x
    kid.y += input.climb * LADDER_CLIMB_CLIMB_SPEED * dt
    const topY = LADDER_CLIMB_PLATFORM_Y[TOP_LEVEL]!
    const groundY = LADDER_CLIMB_PLATFORM_Y[GROUND_LEVEL]!
    if (kid.y <= topY) kid.y = topY
    if (kid.y >= groundY) {
      kid.y = groundY
      kid.climbing = null
    } else if (
      input.move !== 0 &&
      LADDER_CLIMB_PLATFORM_Y.some((p) => Math.abs(kid.y - p) < 0.6)
    ) {
      kid.climbing = null
    }
  } else if (kid.airborne) {
    // In the air: gravity pulls the kid back onto the platform.
    kid.vy += LADDER_CLIMB_GRAVITY * dt
    kid.y += kid.vy * dt
    const floorY = platformYFor(kid.y)
    if (kid.y >= floorY) {
      kid.y = floorY
      kid.vy = 0
      kid.airborne = false
    }
    // Walking in the air carries the kid sideways a little.
    kid.x += input.move * LADDER_CLIMB_WALK_SPEED * 0.6 * dt
  } else {
    // On foot: walk left or right along the platform.
    kid.x += input.move * LADDER_CLIMB_WALK_SPEED * dt
  }
  kid.x = Math.max(2, Math.min(LADDER_CLIMB_FIELD_WIDTH - 2, kid.x))

  // Barrels: spawn on schedule, then roll. One that reaches an
  // edge drops to the platform below and rolls back; one that
  // rolls off the ground is gone.
  let spawnIn = state.spawnIn - dt
  let barrels = state.barrels
  if (spawnIn <= 0 && barrels.length < LADDER_CLIMB_MAX_BARRELS) {
    barrels = [...barrels, spawnBarrel(state)]
    spawnIn = LADDER_CLIMB_SPAWN_INTERVAL
  }
  const moved: LadderClimbBarrel[] = []
  for (const b of barrels) {
    let x = b.x + b.vx * dt
    let level = b.level
    let vx = b.vx
    if (x <= 3 || x >= LADDER_CLIMB_FIELD_WIDTH - 3) {
      if (level > GROUND_LEVEL) {
        level = level - 1
        vx = -vx
        x = Math.max(3, Math.min(LADDER_CLIMB_FIELD_WIDTH - 3, x))
      } else {
        continue
      }
    }
    moved.push({ ...b, x, level, vx })
  }
  barrels = moved

  let next: LadderClimbState = {
    ...state,
    kid,
    barrels,
    spawnIn,
    lastEvent: null,
  }

  // Ladder-top arrival: the kid reached the top on a ladder.
  if (kid.climbing !== null) {
    const topY = LADDER_CLIMB_PLATFORM_Y[TOP_LEVEL]!
    if (kid.y <= topY + 0.01) {
      const ladder = ladders[kid.climbing]!
      if (ladder.correct) {
        return {
          ...next,
          status: 'won',
          lastEvent: { kind: 'reached-correct', answer: ladder.answer },
        }
      }
      if (!ladder.tried) {
        const marked = ladders.map((l) =>
          l.id === ladder.id ? { ...l, tried: true } : l,
        )
        return {
          ...next,
          round: { ...next.round, ladders: marked },
          lastEvent: { kind: 'reached-wrong', answer: ladder.answer },
        }
      }
    }
  }

  // Barrel hit: only a kid standing on a platform — or holding
  // still on a ladder at a platform's height — can be hit. A
  // jumping kid is safe, which is how the kid dodges, and a
  // climbing kid times the climb between barrels.
  if (!kid.airborne) {
    for (const b of barrels) {
      const by = LADDER_CLIMB_PLATFORM_Y[b.level]!
      if (
        Math.abs(b.x - kid.x) <
          LADDER_CLIMB_BARREL_RADIUS + LADDER_CLIMB_KID_RADIUS &&
        Math.abs(by - kid.y) <
          LADDER_CLIMB_BARREL_RADIUS + LADDER_CLIMB_KID_RADIUS
      ) {
        return { ...next, status: 'out', lastEvent: { kind: 'barrel-hit' } }
      }
    }
  }

  return next
}

/**
 * Play a round until it settles (won, out, or the step budget
 * runs out). Pure and deterministic — for tests.
 */
export function simulateRound(
  state: LadderClimbState,
  input: LadderClimbInput = { move: 0, climb: 0 },
  dt = 1 / 60,
  maxSteps = 3600,
): LadderClimbState {
  let current = state
  for (let i = 0; i < maxSteps; i++) {
    if (current.status !== 'playing') return current
    current = stepLadderClimb(current, dt, input)
  }
  return current
}

/**
 * Build one round's tower: LADDER_CLIMB_LADDERS ladders — the
 * correct answer at the top of one, the borrowed wrong answers
 * re-used across the rest. The correct ladder stands in a
 * shuffled column, not a fixed one. Returns null when the
 * answers build no round: fewer than two different answers to
 * borrow as wrong ladders.
 */
export function buildLadderClimbRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): LadderClimbRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowWrongAnswers(otherAnswers, clean)
  if (wrongs.length < LADDER_CLIMB_MAX_WRONGS) return null
  const wrongCycle = shuffled(wrongs)
  // Shuffle the columns first, so the correct ladder stands in
  // a shuffled column, not a fixed one.
  const columns = shuffled(LADDER_CLIMB_LADDER_X)
  const ladders: LadderClimbLadder[] = []
  for (let i = 0; i < LADDER_CLIMB_LADDERS; i++) {
    const correct = i === 0
    ladders.push({
      id: `ladder-${i}`,
      x: columns[i]!,
      answer: correct ? clean : wrongCycle[i % wrongCycle.length]!,
      correct,
      tried: false,
    })
  }
  return {
    prompt,
    ladders,
    imageUrl,
    imageCredit,
  }
}
