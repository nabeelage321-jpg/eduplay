/**
 * Slingshot Aim — pure slingshot physics + tower logic (no React,
 * no sound, no storage).
 *
 * EduPlay's own Angry Birds-STYLE slingshot game (type 51): the
 * kid drags back on a slingshot and releases to launch a plain
 * stone at towers. Angry Birds-STYLE mechanic only: the name is
 * EduPlay's own, the projectile is a plain stone, the towers are
 * plain coloured blocks with an answer written on them — no Angry
 * Birds name, no bird or pig characters, no Rovio art copied.
 * Nothing here invents content: the towers carry the game's real
 * answers — the round's correct answer plus wrong answers borrowed
 * from the game's other items.
 *
 * The field is 100 wide x 60 high, y grows downwards, the ground
 * sits at y = 54. The slingshot anchor is at (10, 46), the three
 * towers stand on the ground to the right (x = 60, 74, 88, each
 * 8 wide and 12 high, so their tops are at y = 42). The kid drags
 * back from the anchor — the launch velocity points the opposite
 * way from the drag, harder the further back the drag goes. A
 * trajectory preview shows where the stone will fly, so aiming is
 * a skill the kid can learn, not a guess.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per correct tower knocked down (one round
 *   per question, up to 10 rounds). Score out of 10 x rounds.
 * - 3 projectiles (stones) per round. Launching one spends it.
 * - Hitting the CORRECT tower knocks it down: +10, round won.
 * - Hitting a WRONG tower knocks that tower down but wastes the
 *   stone: no points, no life lost, the round goes on with the
 *   stones that are left. A knocked-down tower stays down — a
 *   later stone flies straight through where it stood.
 * - A stone that lands on the ground or flies off the field is a
 *   miss: the stone is wasted, no life lost.
 * - Spending all 3 stones without knocking down the correct
 *   tower ends the round with no points and costs 1 life.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win.
 * - A round needs at least two different answers to borrow as
 *   wrong towers, or the towers have no choice in them.
 */

export const SLINGSHOT_AIM_LIVES = 3
export const SLINGSHOT_AIM_MAX_ROUNDS = 10
/** Points for knocking down the correct tower. */
export const SLINGSHOT_AIM_POINTS_PER_ROUND = 10
/** Stones per round. */
export const SLINGSHOT_AIM_PROJECTILES_PER_ROUND = 3
/** Field size, in field units (y grows downwards). */
export const SLINGSHOT_AIM_FIELD_WIDTH = 100
export const SLINGSHOT_AIM_FIELD_HEIGHT = 60
/** The ground line — towers stand on it, stones land on it. */
export const SLINGSHOT_AIM_GROUND_Y = 54
/** Slingshot anchor: where every stone starts. */
export const SLINGSHOT_AIM_ANCHOR = { x: 10, y: 46 } as const
/** Gravity, field units per second squared (pulls +y). */
export const SLINGSHOT_AIM_GRAVITY = 30
/** Launch speed at a full drag-back. */
export const SLINGSHOT_AIM_MAX_SPEED = 50
/** Drag length (field units) that gives full power. */
export const SLINGSHOT_AIM_MAX_DRAG = 20
/** A drag shorter than this is a wobble, not a launch. */
export const SLINGSHOT_AIM_MIN_DRAG = 2
/** Wrong towers per round (correct + 2 wrongs = 3 towers). */
export const SLINGSHOT_AIM_MAX_WRONGS = 2
/** Blocks stacked in each tower (visual — the tower is one target). */
export const SLINGSHOT_AIM_TOWER_BLOCKS = 3
/** Tower width, in field units. */
export const SLINGSHOT_AIM_TOWER_WIDTH = 8
/** Tower height, in field units (3 blocks of 4). */
export const SLINGSHOT_AIM_TOWER_HEIGHT = 12
/** Stone radius, for the hit check. */
export const SLINGSHOT_AIM_STONE_RADIUS = 1
/** Left edges of the three tower slots, left to right. */
export const SLINGSHOT_AIM_TOWER_XS = [60, 74, 88] as const

export interface SlingshotAimPoint {
  x: number
  y: number
}

/** Launch velocity, plus the angle and power shown to the kid. */
export interface SlingshotAimVelocity {
  vx: number
  vy: number
  /** Launch angle above the horizontal, in degrees. */
  angleDeg: number
  /** 0–1, how far back the slingshot was dragged. */
  power: number
}

/** One tower: an answer on a stack of blocks. */
export interface SlingshotAimTower {
  id: string
  /** Left edge, in field units. */
  x: number
  answer: string
  correct: boolean
  knockedDown: boolean
}

export interface SlingshotAimRound {
  prompt: string
  towers: SlingshotAimTower[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type SlingshotAimStatus = 'aiming' | 'flying' | 'won' | 'out'

/** How the last flight ended — the component turns it into feedback. */
export type SlingshotAimFlightResult =
  | { kind: 'hit-correct'; answer: string }
  | { kind: 'hit-wrong'; answer: string }
  | { kind: 'miss' }
  | null

/** The live state of one round. */
export interface SlingshotAimState {
  round: SlingshotAimRound
  projectile: { x: number; y: number; vx: number; vy: number } | null
  projectilesLeft: number
  status: SlingshotAimStatus
  lastFlightResult: SlingshotAimFlightResult
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

/** Top edge of a tower (its blocks sit on the ground). */
export function towerTopY(): number {
  return SLINGSHOT_AIM_GROUND_Y - SLINGSHOT_AIM_TOWER_HEIGHT
}

/** True when the point (with stone radius) overlaps the tower. */
export function pointHitsTower(
  x: number,
  y: number,
  tower: SlingshotAimTower,
): boolean {
  if (tower.knockedDown) return false
  const r = SLINGSHOT_AIM_STONE_RADIUS
  return (
    x + r >= tower.x &&
    x - r <= tower.x + SLINGSHOT_AIM_TOWER_WIDTH &&
    y + r >= towerTopY() &&
    y - r <= SLINGSHOT_AIM_GROUND_Y
  )
}

/**
 * Aim from a drag: the launch velocity points the opposite way
 * from the drag (drag back, stone flies forward), harder the
 * further back the drag goes. Returns null when the drag is too
 * short to count as a launch. Pure.
 */
export function aimFromDrag(
  anchor: SlingshotAimPoint,
  pointer: SlingshotAimPoint,
): SlingshotAimVelocity | null {
  const dx = anchor.x - pointer.x
  const dy = anchor.y - pointer.y
  const len = Math.hypot(dx, dy)
  if (len < SLINGSHOT_AIM_MIN_DRAG) return null
  const power = Math.min(1, len / SLINGSHOT_AIM_MAX_DRAG)
  const speed = power * SLINGSHOT_AIM_MAX_SPEED
  const vx = (dx / len) * speed
  const vy = (dy / len) * speed
  return {
    vx,
    vy,
    angleDeg: (Math.atan2(-vy, vx) * 180) / Math.PI,
    power,
  }
}

/**
 * Velocity for a keyboard aim: an angle above the horizontal and
 * a power from 0–1. Pure.
 */
export function velocityFromAnglePower(
  angleDeg: number,
  power: number,
): SlingshotAimVelocity {
  const clampedPower = Math.max(0, Math.min(1, power))
  const speed = clampedPower * SLINGSHOT_AIM_MAX_SPEED
  const rad = (angleDeg * Math.PI) / 180
  return {
    vx: speed * Math.cos(rad),
    vy: -speed * Math.sin(rad),
    angleDeg,
    power: clampedPower,
  }
}

/**
 * Wrong answers borrowed from the game's other items: distinct
 * answers that are not the correct one, at most
 * SLINGSHOT_AIM_MAX_WRONGS, shuffled, without mutating the
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
  return shuffled(wrongs).slice(0, SLINGSHOT_AIM_MAX_WRONGS)
}

/** A fresh round: three standing towers, a full pouch of stones. */
export function newSlingshotAimGame(round: SlingshotAimRound): SlingshotAimState {
  return {
    round: {
      ...round,
      towers: round.towers.map((t) => ({ ...t, knockedDown: false })),
    },
    projectile: null,
    projectilesLeft: SLINGSHOT_AIM_PROJECTILES_PER_ROUND,
    status: 'aiming',
    lastFlightResult: null,
  }
}

/** Launch a stone: spends one projectile, the stone starts flying. */
export function launchStone(
  state: SlingshotAimState,
  velocity: SlingshotAimVelocity,
): SlingshotAimState {
  if (state.status !== 'aiming' || state.projectilesLeft <= 0) return state
  return {
    ...state,
    projectile: {
      x: SLINGSHOT_AIM_ANCHOR.x,
      y: SLINGSHOT_AIM_ANCHOR.y,
      vx: velocity.vx,
      vy: velocity.vy,
    },
    projectilesLeft: state.projectilesLeft - 1,
    status: 'flying',
    lastFlightResult: null,
  }
}

/**
 * One physics step: gravity pulls the stone down, it moves, then
 * tower hits, the ground, and the field edges are checked — in
 * that order, so a stone that reaches a tower counts as a hit
 * even if it would land on the same step. Pure.
 */
export function stepProjectile(
  state: SlingshotAimState,
  dt: number,
): SlingshotAimState {
  if (state.status !== 'flying' || !state.projectile) return state
  const p = state.projectile
  const vy = p.vy + SLINGSHOT_AIM_GRAVITY * dt
  const x = p.x + p.vx * dt
  const y = p.y + vy * dt
  const endFlight = (result: SlingshotAimFlightResult, status: SlingshotAimStatus): SlingshotAimState => ({
    ...state,
    projectile: null,
    status,
    lastFlightResult: result,
  })
  const stillAiming = (): SlingshotAimStatus =>
    state.projectilesLeft > 0 ? 'aiming' : 'out'
  for (const tower of state.round.towers) {
    if (!pointHitsTower(x, y, tower)) continue
    if (tower.correct) {
      return {
        ...state,
        round: {
          ...state.round,
          towers: state.round.towers.map((t) =>
            t.id === tower.id ? { ...t, knockedDown: true } : t,
          ),
        },
        projectile: null,
        status: 'won',
        lastFlightResult: { kind: 'hit-correct', answer: tower.answer },
      }
    }
    return {
      ...state,
      round: {
        ...state.round,
        towers: state.round.towers.map((t) =>
          t.id === tower.id ? { ...t, knockedDown: true } : t,
        ),
      },
      projectile: null,
      status: stillAiming(),
      lastFlightResult: { kind: 'hit-wrong', answer: tower.answer },
    }
  }
  if (y >= SLINGSHOT_AIM_GROUND_Y) {
    return endFlight({ kind: 'miss' }, stillAiming())
  }
  if (x > SLINGSHOT_AIM_FIELD_WIDTH + 5 || x < -5) {
    return endFlight({ kind: 'miss' }, stillAiming())
  }
  return { ...state, projectile: { x, y, vx: p.vx, vy } }
}

/**
 * Fly a launched stone to rest: steps until the flight ends
 * (hit, landing, or off the field). Pure and deterministic.
 */
export function simulateFlight(
  state: SlingshotAimState,
  dt = 1 / 60,
  maxSteps = 600,
): SlingshotAimState {
  let current = state
  for (let i = 0; i < maxSteps; i++) {
    if (current.status !== 'flying') return current
    current = stepProjectile(current, dt)
  }
  return current
}

/**
 * Dots for the aim preview: where the stone will fly from the
 * anchor at this velocity, until it lands or leaves the field.
 * Pure — the preview and the real flight use the same physics.
 */
export function trajectoryPoints(
  velocity: SlingshotAimVelocity,
  dt = 1 / 60,
  maxSteps = 240,
): SlingshotAimPoint[] {
  const points: SlingshotAimPoint[] = []
  let x = SLINGSHOT_AIM_ANCHOR.x
  let y = SLINGSHOT_AIM_ANCHOR.y
  let vy = velocity.vy
  for (let i = 0; i < maxSteps; i++) {
    vy += SLINGSHOT_AIM_GRAVITY * dt
    x += velocity.vx * dt
    y += vy * dt
    if (y >= SLINGSHOT_AIM_GROUND_Y || x > SLINGSHOT_AIM_FIELD_WIDTH + 5 || x < -5) break
    if (i % 3 === 0) points.push({ x, y })
  }
  return points
}

/**
 * Build one round. Returns null when the answers build no round:
 * fewer than two different answers to borrow as wrong towers.
 * The correct tower stands in a different slot every round, and
 * the towers are shuffled so the right answer is never in the
 * same place twice in a row by construction.
 */
export function buildSlingshotAimRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): SlingshotAimRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowWrongAnswers(otherAnswers, clean)
  if (wrongs.length < SLINGSHOT_AIM_MAX_WRONGS) return null
  const placed: SlingshotAimTower[] = shuffled([
    { id: 'correct', answer: clean, correct: true },
    { id: 'wrong-0', answer: wrongs[0]!, correct: false },
    { id: 'wrong-1', answer: wrongs[1]!, correct: false },
  ]).map((t, i) => ({
    ...t,
    x: SLINGSHOT_AIM_TOWER_XS[i]!,
    knockedDown: false,
  }))
  return { prompt, towers: placed, imageUrl, imageCredit }
}
