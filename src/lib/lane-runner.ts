/**
 * Lane Runner — pure endless-runner logic (no React, no sound, no storage).
 *
 * EduPlay's own Subway Surfers-STYLE 3-lane endless runner (type 49):
 * the kid runs forward down a 3-lane track, switches lanes, jumps
 * barriers, collects coins, and runs through answer gates. Subway
 * Surfers-STYLE mechanic only: the name is EduPlay's own, the
 * runner is a plain kid emoji, the gates are plain boxes with a
 * number written on them, the barriers are plain construction
 * barriers, the coins are plain coin emojis — no Subway Surfers
 * name, no character, no SYBO art copied. Nothing here invents
 * content: the gates carry the game's real answers — the round's
 * correct answer plus wrong answers borrowed from the game's other
 * items.
 *
 * The track is 3 lanes wide. The runner stays at the near end of
 * the track (distance 0) and the world runs towards them: every
 * tick, every gate, coin, and barrier moves one step closer. The
 * question is shown above the track; the correct answer is shown
 * on one of the three gates (the kid has to run through the gate
 * that says it — e.g. "2+6 = ?" and the gate that says 8).
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per correct gate (one round per question,
 *   up to 10 rounds). Score out of 10 x rounds.
 * - One gate row per round: three gates, one per lane, carrying
 *   the correct answer plus two wrong answers borrowed from the
 *   game's other items. The correct gate sits in a different lane
 *   every round. A round with no wrong answer to borrow has no
 *   choice in it and cannot be played.
 * - The gate row spawns 8 steps away and takes 8 ticks to reach
 *   the runner — that is the time the kid has to read the question
 *   and pick a lane. Running through the CORRECT gate: +10, round
 *   done. Running through a WRONG gate: crash, -1 life, round
 *   over with no points.
 * - Coins: a trail of 3 coins runs down the CORRECT gate's lane
 *   ahead of the gate (distances 7, 6, 5), so following the coins
 *   leads to the right gate. A coin in the runner's lane is
 *   collected as it reaches them — coins are a collected count
 *   (shown as 🪙 n), worth no points; the +10 is for the gate.
 * - Barriers: one barrier per round sits 4 steps away in a random
 *   lane. A barrier that reaches the runner's lane is a crash
 *   (-1 life, round over) UNLESS the runner is jumping: a jump
 *   lasts 2 ticks, and a barrier takes 1 tick to pass, so jumping
 *   while the barrier is 1 or 2 steps away clears it. Jumping one
 *   tick too early leaves the runner on the ground when the
 *   barrier arrives. No double jump — jumping while already
 *   airborne does nothing.
 * - Lane switches are instant, one lane per press (left/right).
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win.
 */

export const LANE_RUNNER_LIVES = 3
export const LANE_RUNNER_MAX_ROUNDS = 10
/** Points for running through the correct gate — coins earn none. */
export const LANE_RUNNER_POINTS_PER_ROUND = 10
/** The track is three lanes wide (lanes 0, 1, 2). */
export const LANE_RUNNER_LANES = 3
/** The middle lane, where every round starts. */
export const LANE_RUNNER_START_LANE = 1
/** Game tick: the world moves one step closer every tick. */
export const LANE_RUNNER_TICK_MS = 350
/** Steps away the gate row spawns — 8 ticks to read and pick a lane. */
export const LANE_RUNNER_GATE_SPAWN_DIST = 8
/** Coins in the trail that leads down the correct gate's lane. */
export const LANE_RUNNER_COINS_PER_ROUND = 3
/** Distances of the coin trail, farthest first. */
export const LANE_RUNNER_COIN_DISTS = [7, 6, 5] as const
/** Steps away the round's barrier sits. */
export const LANE_RUNNER_BARRIER_DIST = 4
/** Ticks a jump keeps the runner airborne. */
export const LANE_RUNNER_JUMP_TICKS = 2
/** Wrong gates per round (correct + 2 wrongs = 3 gates, one per lane). */
export const LANE_RUNNER_MAX_WRONGS = 2
/** Metres the runner covers per tick — the distance counter only. */
export const LANE_RUNNER_METRES_PER_TICK = 2

export type LaneRunnerLane = 0 | 1 | 2

export interface LaneRunnerGate {
  lane: LaneRunnerLane
  label: string
  /** True only for the gate carrying the round's correct answer. */
  correct: boolean
}

export interface LaneRunnerItem {
  id: number
  kind: 'coin' | 'barrier'
  lane: LaneRunnerLane
  /** Steps ahead of the runner; 0 is the runner's own spot. */
  dist: number
}

export interface LaneRunnerRound {
  prompt: string
  correctAnswer: string
  /** The lane the correct gate sits in — the coin trail's lane too. */
  correctLane: LaneRunnerLane
  gates: LaneRunnerGate[]
  /** The coin trail plus the round's barrier, farthest first. */
  items: LaneRunnerItem[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

/** The live, ticking state of one round: the world running at the kid. */
export interface LaneRunnerWorld {
  /** Steps away the gate row is; 0 means it reaches the runner. */
  gateDist: number
  items: LaneRunnerItem[]
  lane: LaneRunnerLane
  /** Ticks of jump left (0 = on the ground). */
  jumpTicksLeft: number
}

export type LaneSwitchDirection = 'left' | 'right'

/** One lane over, clamped to the track — switching off the edge stays put. */
export function switchLane(lane: LaneRunnerLane, dir: LaneSwitchDirection): LaneRunnerLane {
  const next = dir === 'left' ? lane - 1 : lane + 1
  if (next < 0) return 0
  if (next > LANE_RUNNER_LANES - 1) return (LANE_RUNNER_LANES - 1) as LaneRunnerLane
  return next as LaneRunnerLane
}

/**
 * Wrong answers borrowed from the game's other items: distinct
 * answers that differ from this round's correct answer, shuffled,
 * at most LANE_RUNNER_MAX_WRONGS. Empty when the game has no other
 * answer to borrow — such a round cannot be played.
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
  // Shuffle without mutating the caller's array.
  for (let i = wrongs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = wrongs[i]
    wrongs[i] = wrongs[j]
    wrongs[j] = tmp
  }
  return wrongs.slice(0, LANE_RUNNER_MAX_WRONGS)
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
 * Build one round. Returns null when there is no wrong answer to
 * borrow — a round with only the correct gate has no choice in
 * it. The three gates (correct + 2 wrongs) are shuffled across
 * the three lanes, so the right gate sits somewhere different
 * every round. The coin trail (3 coins) runs down the correct
 * gate's lane at distances 7, 6, 5, and one barrier sits at
 * distance 4 in a random lane — it may be the correct lane, in
 * which case the kid must jump it.
 */
export function buildLaneRunnerRound(
  prompt: string,
  answer: string,
  wrongAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): LaneRunnerRound | null {
  const correctAnswer = (answer ?? '').trim()
  if (!prompt || !correctAnswer || wrongAnswers.length < LANE_RUNNER_MAX_WRONGS) return null
  const labels = shuffled([correctAnswer, ...wrongAnswers.slice(0, LANE_RUNNER_MAX_WRONGS)])
  const gates: LaneRunnerGate[] = labels.map((label, lane) => ({
    lane: lane as LaneRunnerLane,
    label,
    correct: label === correctAnswer,
  }))
  const correctLane = gates.find((g) => g.correct)?.lane ?? (1 as LaneRunnerLane)
  const items: LaneRunnerItem[] = []
  let itemId = 0
  LANE_RUNNER_COIN_DISTS.forEach((dist) => {
    items.push({ id: itemId++, kind: 'coin', lane: correctLane, dist })
  })
  items.push({
    id: itemId++,
    kind: 'barrier',
    lane: Math.floor(Math.random() * LANE_RUNNER_LANES) as LaneRunnerLane,
    dist: LANE_RUNNER_BARRIER_DIST,
  })
  return { prompt, correctAnswer, correctLane, gates, items, imageUrl, imageCredit }
}

/** A fresh round: gate 8 steps away, runner in the middle lane, on the ground. */
export function newLaneRunnerWorld(round: LaneRunnerRound): LaneRunnerWorld {
  return {
    gateDist: LANE_RUNNER_GATE_SPAWN_DIST,
    items: round.items.map((item) => ({ ...item })),
    lane: LANE_RUNNER_START_LANE as LaneRunnerLane,
    jumpTicksLeft: 0,
  }
}

/** Start a jump: airborne for LANE_RUNNER_JUMP_TICKS ticks. Pure. */
export function startJump(world: LaneRunnerWorld): LaneRunnerWorld {
  if (world.jumpTicksLeft > 0) return world
  return { ...world, jumpTicksLeft: LANE_RUNNER_JUMP_TICKS }
}

export type GateResult = 'correct' | 'wrong' | null

export interface TickResult {
  world: LaneRunnerWorld
  /** Coins collected on this tick (0 or more). */
  coinsCollected: number
  /** True when a barrier reached the runner's lane while grounded. */
  barrierHit: boolean
  /** Set only on the tick the gate row reaches the runner. */
  gateResult: GateResult
}

/**
 * One tick: the whole world moves one step closer to the runner.
 * Pure: nothing is mutated, the result carries the new world plus
 * what happened on this tick. Coins in the runner's lane are
 * collected as they arrive; a barrier in the runner's lane is a
 * hit unless the runner is airborne that tick (the jump is spent
 * first — jumping while the barrier is 1 or 2 steps away clears
 * it, jumping a tick earlier does not). The gate row resolves the
 * tick it reaches the runner: the gate in the runner's lane
 * decides the round. Items that have passed the runner are gone.
 */
export function tickWorld(
  world: LaneRunnerWorld,
  gates: LaneRunnerGate[],
): TickResult {
  const jumping = world.jumpTicksLeft > 0
  let coinsCollected = 0
  let barrierHit = false
  const items: LaneRunnerItem[] = []
  for (const item of world.items) {
    const dist = item.dist - 1
    if (dist < 0) continue
    if (dist === 0 && item.lane === world.lane) {
      if (item.kind === 'coin') {
        coinsCollected += 1
        continue
      }
      if (!jumping) {
        barrierHit = true
        continue
      }
      // Jumped clean over it — the barrier passes under the runner.
      continue
    }
    items.push({ ...item, dist })
  }
  const gateDist = world.gateDist - 1
  let gateResult: GateResult = null
  if (gateDist === 0) {
    const gate = gates.find((g) => g.lane === world.lane)
    gateResult = gate && gate.correct ? 'correct' : 'wrong'
  }
  return {
    world: {
      gateDist,
      items,
      lane: world.lane,
      jumpTicksLeft: Math.max(0, world.jumpTicksLeft - 1),
    },
    coinsCollected,
    barrierHit,
    gateResult,
  }
}
