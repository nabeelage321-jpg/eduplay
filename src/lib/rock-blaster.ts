/**
 * Rock Blaster — pure ship / bullet / asteroid drift physics +
 * round logic (no React, no sound, no storage).
 *
 * EduPlay's own Asteroids-STYLE space game (type 53): the kid
 * flies a little ship through space, where asteroids carrying
 * answers drift across the screen. Asteroids-STYLE mechanic
 * only: the name is EduPlay's own, the ship is a plain triangle,
 * the asteroids plain grey rocks with an answer written on
 * each — no Asteroids name, no Atari ship or rock art copied.
 * Nothing here invents content: the asteroids carry the game's
 * real answers — the round's correct answer on one rock, wrong
 * answers borrowed from the game's other items on the rest.
 *
 * The field is 100 wide x 60 high, y grows downwards. The ship
 * starts in the middle, pointing up (angle 0). Turning changes
 * the angle; thrust accelerates along the facing direction and
 * the ship keeps drifting (with a gentle drag), wrapping around
 * the edges of space. Asteroids drift in straight lines and
 * also wrap. A bullet flies straight from the ship's nose and
 * fades after a short flight.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per CORRECT asteroid blasted (one
 *   correct asteroid per round, one round per question, up to
 *   10 rounds). Score out of 10 x rounds.
 * - 6 bullets per round. Every shot spends one bullet, hit or
 *   miss. A bullet that hits nothing fades away — wasted.
 * - Blasting the CORRECT asteroid: +10, the round is won.
 * - Blasting a WRONG asteroid breaks it apart but earns no
 *   points — the bullet is wasted, and the round goes on with
 *   the bullets left. (A wrong rock is a trap: read the answers
 *   before you shoot.)
 * - Spending all 6 bullets without blasting the correct
 *   asteroid ends the round and costs 1 life.
 * - Crashing into ANY asteroid costs 1 life and ends the round
 *   at once — dodge the rocks you are not shooting.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win.
 * - A round needs at least two different answers to borrow as
 *   wrong asteroids, or the sky has no choice in it. Wrong
 *   asteroids re-use the borrowed wrong answers.
 */

export const ROCK_BLASTER_LIVES = 3
export const ROCK_BLASTER_MAX_ROUNDS = 10
/** Points for blasting one correct asteroid. */
export const ROCK_BLASTER_POINTS_PER_ASTEROID = 10
/** Bullets per round. */
export const ROCK_BLASTER_BULLETS_PER_ROUND = 6
/** Asteroids drifting in every round (1 correct + 3 wrong). */
export const ROCK_BLASTER_ASTEROIDS = 4
/** Field size, in field units (y grows downwards). */
export const ROCK_BLASTER_FIELD_WIDTH = 100
export const ROCK_BLASTER_FIELD_HEIGHT = 60
/** Ship radius, for collision checks. */
export const ROCK_BLASTER_SHIP_RADIUS = 3
/** Turning speed, radians per second. */
export const ROCK_BLASTER_TURN_SPEED = 3.6
/** Thrust acceleration, field units per second squared. */
export const ROCK_BLASTER_THRUST = 32
/** Top ship speed, field units per second. */
export const ROCK_BLASTER_MAX_SPEED = 26
/** How fast drift fades: velocity *= exp(-DRAG * dt). */
export const ROCK_BLASTER_DRAG = 0.35
/** Bullet speed, field units per second. */
export const ROCK_BLASTER_BULLET_SPEED = 60
/** Bullet radius, for hit checks. */
export const ROCK_BLASTER_BULLET_RADIUS = 1
/** Bullet lifetime, seconds — then it fades, wasted. */
export const ROCK_BLASTER_BULLET_LIFETIME = 1.2
/** Asteroid radius, for hit checks. */
export const ROCK_BLASTER_ASTEROID_RADIUS = 6.5
/** Asteroid drift speed range, field units per second. */
export const ROCK_BLASTER_ASTEROID_MIN_SPEED = 4
export const ROCK_BLASTER_ASTEROID_MAX_SPEED = 9
/** Wrong answers borrowed per round (re-used across wrong rocks). */
export const ROCK_BLASTER_MAX_WRONGS = 2
/** Max sub-step, so a fast bullet can never tunnel through a rock. */
const MAX_SUBSTEP = 1 / 60

export interface RockBlasterPoint {
  x: number
  y: number
}

/** One drifting asteroid. */
export interface RockBlasterAsteroid {
  id: string
  x: number
  y: number
  /** Drift velocity, field units per second. */
  vx: number
  vy: number
  answer: string
  correct: boolean
  blasted: boolean
}

/** The ship: position, facing angle (0 = up), drift velocity. */
export interface RockBlasterShip {
  x: number
  y: number
  /** Radians, 0 = pointing up, growing clockwise. */
  angle: number
  vx: number
  vy: number
}

export interface RockBlasterBullet {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  age: number
}

export interface RockBlasterRound {
  prompt: string
  asteroids: RockBlasterAsteroid[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type RockBlasterStatus = 'playing' | 'won' | 'out'

/** What the last step resolved to — the component turns it into feedback. */
export type RockBlasterEvent =
  | { kind: 'hit-correct'; answer: string }
  | { kind: 'hit-wrong'; answer: string; bulletsLeft: number }
  | { kind: 'bullet-missed'; bulletsLeft: number }
  | { kind: 'collision' }
  | null

/** The live state of one round. */
export interface RockBlasterState {
  round: RockBlasterRound
  ship: RockBlasterShip
  bullets: RockBlasterBullet[]
  bulletsLeft: number
  status: RockBlasterStatus
  lastEvent: RockBlasterEvent
}

/** Held controls for one physics step. */
export interface RockBlasterInput {
  /** -1 = turn left, 0 = straight, 1 = turn right. */
  rotate: -1 | 0 | 1
  /** True while the thrust key or button is held. */
  thrust: boolean
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

/** Unit vector the ship faces at an angle (0 = up, y grows down). */
export function shipDirection(angle: number): RockBlasterPoint {
  return { x: Math.sin(angle), y: -Math.cos(angle) }
}

/** Angle that faces from `from` towards `to` (0 = up). */
export function angleTo(from: RockBlasterPoint, to: RockBlasterPoint): number {
  return Math.atan2(to.x - from.x, -(to.y - from.y))
}

/** Wrap a coordinate around the field (space has no walls). */
export function wrapCoordinate(value: number, size: number): number {
  const wrapped = value % size
  return wrapped < 0 ? wrapped + size : wrapped
}

/**
 * Wrong answers borrowed from the game's other items: distinct
 * answers that are not the correct one, at most
 * ROCK_BLASTER_MAX_WRONGS, shuffled, without mutating the
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
  return shuffled(wrongs).slice(0, ROCK_BLASTER_MAX_WRONGS)
}

/** Where the ship starts: the middle of space, pointing up, still. */
export function newRockBlasterShip(): RockBlasterShip {
  return {
    x: ROCK_BLASTER_FIELD_WIDTH / 2,
    y: ROCK_BLASTER_FIELD_HEIGHT / 2,
    angle: 0,
    vx: 0,
    vy: 0,
  }
}

/** A fresh round: ship in the middle, a full set of bullets, rocks drifting. */
export function newRockBlasterGame(round: RockBlasterRound): RockBlasterState {
  return {
    round: {
      ...round,
      asteroids: round.asteroids.map((a) => ({ ...a, blasted: false })),
    },
    ship: newRockBlasterShip(),
    bullets: [],
    bulletsLeft: ROCK_BLASTER_BULLETS_PER_ROUND,
    status: 'playing',
    lastEvent: null,
  }
}

/** Is the correct asteroid still drifting? */
export function correctAsteroidLeft(state: RockBlasterState): boolean {
  return state.round.asteroids.some((a) => a.correct && !a.blasted)
}

let bulletCounter = 0

/**
 * Fire one bullet from the ship's nose, along the facing
 * direction. Costs one bullet; with none left, or when the
 * round is over, nothing happens.
 */
export function fireBullet(state: RockBlasterState): RockBlasterState {
  if (state.status !== 'playing' || state.bulletsLeft <= 0) return state
  const dir = shipDirection(state.ship.angle)
  const nose = ROCK_BLASTER_SHIP_RADIUS + ROCK_BLASTER_BULLET_RADIUS + 0.5
  bulletCounter += 1
  const bullet: RockBlasterBullet = {
    id: `bullet-${bulletCounter}`,
    x: state.ship.x + dir.x * nose,
    y: state.ship.y + dir.y * nose,
    vx: dir.x * ROCK_BLASTER_BULLET_SPEED,
    vy: dir.y * ROCK_BLASTER_BULLET_SPEED,
    age: 0,
  }
  return {
    ...state,
    bullets: [...state.bullets, bullet],
    bulletsLeft: state.bulletsLeft - 1,
    lastEvent: null,
  }
}

/**
 * Aim the ship at a point (an asteroid the kid tapped) and fire
 * at it. The turn is instant — the skill is picking the right
 * rock, not steering to it. Refuses with no bullets left, like
 * fireBullet.
 */
export function fireBulletAimed(
  state: RockBlasterState,
  x: number,
  y: number,
): RockBlasterState {
  if (state.status !== 'playing' || state.bulletsLeft <= 0) return state
  const aimed: RockBlasterState = {
    ...state,
    ship: { ...state.ship, angle: angleTo(state.ship, { x, y }) },
    lastEvent: null,
  }
  return fireBullet(aimed)
}

/**
 * One physics step, split into small sub-steps so a fast bullet
 * can never tunnel through a rock. Pure.
 *
 * Order per sub-step: turn + thrust the ship, drag, move the
 * ship (wrap), drift the asteroids (wrap), fly the bullets,
 * then resolve: bullet hits, then ship crashes. A bullet that
 * leaves the field or outlives its flight fades — wasted. When
 * the last bullet is gone with none left and the correct rock
 * still stands, the round is out.
 */
export function stepRockBlaster(
  state: RockBlasterState,
  dt: number,
  input: RockBlasterInput,
): RockBlasterState {
  if (state.status !== 'playing') return state
  let current: RockBlasterState = { ...state, lastEvent: null }
  const steps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP))
  const sub = dt / steps
  for (let i = 0; i < steps; i++) {
    if (current.status !== 'playing') return current
    current = stepRockBlasterOnce(current, sub, input)
  }
  return current
}

function stepRockBlasterOnce(
  state: RockBlasterState,
  dt: number,
  input: RockBlasterInput,
): RockBlasterState {
  const ship = { ...state.ship }
  // Turn, then thrust along the facing direction.
  ship.angle += input.rotate * ROCK_BLASTER_TURN_SPEED * dt
  if (input.thrust) {
    const dir = shipDirection(ship.angle)
    ship.vx += dir.x * ROCK_BLASTER_THRUST * dt
    ship.vy += dir.y * ROCK_BLASTER_THRUST * dt
    const speed = Math.hypot(ship.vx, ship.vy)
    if (speed > ROCK_BLASTER_MAX_SPEED) {
      ship.vx = (ship.vx / speed) * ROCK_BLASTER_MAX_SPEED
      ship.vy = (ship.vy / speed) * ROCK_BLASTER_MAX_SPEED
    }
  }
  // Drift fades gently — the ship never stops dead.
  const drag = Math.exp(-ROCK_BLASTER_DRAG * dt)
  ship.vx *= drag
  ship.vy *= drag
  ship.x = wrapCoordinate(
    ship.x + ship.vx * dt,
    ROCK_BLASTER_FIELD_WIDTH,
  )
  ship.y = wrapCoordinate(
    ship.y + ship.vy * dt,
    ROCK_BLASTER_FIELD_HEIGHT,
  )

  // Asteroids drift in straight lines and wrap too.
  const asteroids = state.round.asteroids.map((a) => ({
    ...a,
    x: wrapCoordinate(a.x + a.vx * dt, ROCK_BLASTER_FIELD_WIDTH),
    y: wrapCoordinate(a.y + a.vy * dt, ROCK_BLASTER_FIELD_HEIGHT),
  }))

  // Bullets fly; one that leaves the field or outlives its
  // flight fades — wasted.
  let missed = false
  const bullets: RockBlasterBullet[] = []
  for (const b of state.bullets) {
    const x = b.x + b.vx * dt
    const y = b.y + b.vy * dt
    const age = b.age + dt
    if (
      age > ROCK_BLASTER_BULLET_LIFETIME ||
      x < 0 ||
      x > ROCK_BLASTER_FIELD_WIDTH ||
      y < 0 ||
      y > ROCK_BLASTER_FIELD_HEIGHT
    ) {
      missed = true
      continue
    }
    bullets.push({ ...b, x, y, age })
  }

  let next: RockBlasterState = {
    ...state,
    round: { ...state.round, asteroids },
    ship,
    bullets,
    lastEvent: missed
      ? { kind: 'bullet-missed', bulletsLeft: state.bulletsLeft }
      : null,
  }

  // Bullet hits: first standing rock each bullet overlaps.
  // Every rock hit in this sub-step breaks, not just the first.
  const remainingBullets: RockBlasterBullet[] = []
  const hitRocks: RockBlasterAsteroid[] = []
  for (const bullet of next.bullets) {
    let spent = false
    for (const rock of next.round.asteroids) {
      if (rock.blasted || hitRocks.some((h) => h.id === rock.id)) continue
      const dist = Math.hypot(bullet.x - rock.x, bullet.y - rock.y)
      if (dist > ROCK_BLASTER_ASTEROID_RADIUS + ROCK_BLASTER_BULLET_RADIUS) {
        continue
      }
      spent = true
      hitRocks.push(rock)
      break
    }
    if (!spent) remainingBullets.push(bullet)
  }
  if (hitRocks.length > 0) {
    const hitIds = new Set(hitRocks.map((h) => h.id))
    const smashed = next.round.asteroids.map((a) =>
      hitIds.has(a.id) ? { ...a, blasted: true } : a,
    )
    next = {
      ...next,
      round: { ...next.round, asteroids: smashed },
      bullets: remainingBullets,
    }
    const hitCorrect = hitRocks.find((h) => h.correct)
    if (hitCorrect) {
      return {
        ...next,
        bullets: remainingBullets,
        status: 'won',
        lastEvent: { kind: 'hit-correct', answer: hitCorrect.answer },
      }
    }
    const hitWrong = hitRocks[0]!
    next = {
      ...next,
      lastEvent: {
        kind: 'hit-wrong',
        answer: hitWrong.answer,
        bulletsLeft: next.bulletsLeft,
      },
    }
  } else {
    next = { ...next, bullets: remainingBullets }
  }

  // Out of bullets: no shots left and none still flying, with
  // the correct rock still standing — the round is out.
  if (
    next.status === 'playing' &&
    next.bulletsLeft <= 0 &&
    next.bullets.length === 0 &&
    correctAsteroidLeft(next)
  ) {
    return { ...next, status: 'out', lastEvent: next.lastEvent }
  }

  // Ship crash: touching any standing rock ends the round.
  if (next.status === 'playing') {
    for (const rock of next.round.asteroids) {
      if (rock.blasted) continue
      const dist = Math.hypot(ship.x - rock.x, ship.y - rock.y)
      if (dist < ROCK_BLASTER_ASTEROID_RADIUS + ROCK_BLASTER_SHIP_RADIUS) {
        return { ...next, status: 'out', lastEvent: { kind: 'collision' } }
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
  state: RockBlasterState,
  input: RockBlasterInput = { rotate: 0, thrust: false },
  dt = 1 / 60,
  maxSteps = 3600,
): RockBlasterState {
  let current = state
  for (let i = 0; i < maxSteps; i++) {
    if (current.status !== 'playing') return current
    current = stepRockBlaster(current, dt, input)
  }
  return current
}

/**
 * Build one round's sky: ROCK_BLASTER_ASTEROIDS rocks — the
 * correct answer on one, the borrowed wrong answers re-used
 * across the rest. The rocks start near the corners, well away
 * from the ship in the middle, and drift off in random
 * directions. Returns null when the answers build no round:
 * fewer than two different answers to borrow as wrong rocks.
 */
export function buildRockBlasterRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): RockBlasterRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowWrongAnswers(otherAnswers, clean)
  if (wrongs.length < ROCK_BLASTER_MAX_WRONGS) return null
  // Start spots near the corners, far from the ship in the middle.
  const spots = shuffled([
    { x: 12, y: 10 },
    { x: 88, y: 12 },
    { x: 14, y: 50 },
    { x: 86, y: 48 },
  ])
  const wrongCycle = shuffled(wrongs)
  const asteroids: RockBlasterAsteroid[] = []
  for (let i = 0; i < ROCK_BLASTER_ASTEROIDS; i++) {
    const correct = i === 0
    const spot = spots[i]!
    const angle = Math.random() * Math.PI * 2
    const speed =
      ROCK_BLASTER_ASTEROID_MIN_SPEED +
      Math.random() *
        (ROCK_BLASTER_ASTEROID_MAX_SPEED - ROCK_BLASTER_ASTEROID_MIN_SPEED)
    asteroids.push({
      id: `rock-${i}`,
      x: spot.x,
      y: spot.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      answer: correct ? clean : wrongCycle[i % wrongCycle.length]!,
      correct,
      blasted: false,
    })
  }
  // The correct rock drifts from a shuffled corner, not a fixed one.
  return {
    prompt,
    asteroids: shuffled(asteroids),
    imageUrl,
    imageCredit,
  }
}
