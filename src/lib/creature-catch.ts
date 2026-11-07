/**
 * Creature Catch — pure creature-collector / throw-the-ball
 * logic (no React, no sound, no storage).
 *
 * EduPlay's own Pokémon-STYLE creature collector (type 59):
 * wild creatures each hold an answer, and the kid throws a
 * catch ball at the creature holding the right one. Pokémon-
 * STYLE mechanic only: the name is EduPlay's own, every
 * creature below is an ORIGINAL creature invented here (own
 * names, own emoji faces, own colours — no Pokémon name, no
 * Pokémon creature, no Poké Ball, no Nintendo art copied),
 * and the ball is a plain catch ball drawn here (violet top,
 * cream bottom, gold band — not a red-and-white Poké Ball).
 * Nothing here invents content: the creatures carry the
 * game's real answers — the round's correct answer on one,
 * wrong answers borrowed from the game's other items on the
 * rest.
 *
 * The meadow holds 3 wild creatures. The question is shown
 * (e.g. "2+6 = ?"); the kid throws ONE ball per round at the
 * creature holding 8. The ball flies to the creature the kid
 * tapped — it homes in, so the skill is picking the right
 * creature and the throw is the fun (the creatures bob and
 * wander while the kid aims, but a tap always resolves on
 * the creature tapped).
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per CORRECT creature caught. One
 *   throw per round, 10 rounds — score out of 10 x rounds.
 * - Throw at the RIGHT creature and it is caught: it hops
 *   into the ball with a sparkle, +10 points, the round is
 *   won, and the creature joins the kid's collection (the
 *   collection is the reason to come back and play again —
 *   12 original creatures to find).
 * - Throw at a WRONG creature and it BREAKS FREE: the ball
 *   bounces off, the creature shakes itself loose and hops
 *   away, no points — and the round ends at once and costs
 *   1 life. There is only one ball per round, so a break-free
 *   is the round lost, not a retry.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win.
 * - A round needs at least two different answers to borrow
 *   as wrong creatures, or there is no choice in it.
 */

export const CREATURE_CATCH_LIVES = 3
export const CREATURE_CATCH_MAX_ROUNDS = 10
/** Points for catching the one correct creature in a round. */
export const CREATURE_CATCH_POINTS_PER_CATCH = 10
/** Wild creatures in the meadow in every round: one right
 *  answer, two borrowed wrong ones. */
export const CREATURE_CATCH_CREATURES_PER_ROUND = 3
/** Max points in one round: one correct catch. */
export const CREATURE_CATCH_MAX_PER_ROUND =
  CREATURE_CATCH_POINTS_PER_CATCH
/** How many original creatures there are to collect. */
export const CREATURE_CATCH_COLLECTION_SIZE = 12

/** One original creature — invented here, nothing copied. */
export interface CreatureCatchCreature {
  id: string
  name: string
  emoji: string
  color: string
}

/** The 12 original creatures a kid can collect. */
export const CREATURE_CATCH_ROSTER: CreatureCatchCreature[] = [
  { id: 'bubblip', name: 'Bubblip', emoji: '💧', color: '#38bdf8' },
  { id: 'flammit', name: 'Flammit', emoji: '🔥', color: '#f97316' },
  { id: 'leaflet', name: 'Leaflet', emoji: '🌱', color: '#22c55e' },
  { id: 'sparkpup', name: 'Sparkpup', emoji: '🐶', color: '#eab308' },
  { id: 'snowpuff', name: 'Snowpuff', emoji: '❄️', color: '#7dd3fc' },
  { id: 'rocklet', name: 'Rocklet', emoji: '🪨', color: '#a8a29e' },
  { id: 'breezy', name: 'Breezy', emoji: '💨', color: '#67e8f9' },
  { id: 'glimmer', name: 'Glimmer', emoji: '✨', color: '#c084fc' },
  { id: 'sunnip', name: 'Sunnip', emoji: '☀️', color: '#facc15' },
  { id: 'lunip', name: 'Lunip', emoji: '🌙', color: '#818cf8' },
  { id: 'nimbelle', name: 'Nimbelle', emoji: '🌧️', color: '#60a5fa' },
  { id: 'foxtail', name: 'Foxtail', emoji: '🦊', color: '#fb923c' },
]

/** One wild creature in the meadow, holding an answer. */
export interface CreatureCatchSpot {
  id: string
  creatureId: string
  name: string
  emoji: string
  color: string
  answer: string
  correct: boolean
  /** Meadow position, percent across / down the scene. */
  x: number
  y: number
}

export interface CreatureCatchRound {
  prompt: string
  creatures: CreatureCatchSpot[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type CreatureCatchPhase = 'aim' | 'flying' | 'caught' | 'broke-free'

export type CreatureCatchStatus = 'playing' | 'won' | 'out'

/** What the last throw resolved to — the component turns it
 *  into feedback and sounds. */
export type CreatureCatchEvent =
  | { kind: 'caught'; creatureId: string; name: string; answer: string }
  | { kind: 'broke-free'; creatureId: string; name: string; answer: string }
  | null

/** The live state of one round. */
export interface CreatureCatchState {
  round: CreatureCatchRound
  phase: CreatureCatchPhase
  /** The creature the ball is flying at (or flew at). */
  targetId: string | null
  status: CreatureCatchStatus
  lastEvent: CreatureCatchEvent
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
 * CREATURE_CATCH_CREATURES_PER_ROUND - 1, shuffled, without
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
    CREATURE_CATCH_CREATURES_PER_ROUND - 1,
  )
}

/** Meadow spots the three creatures stand on (percent). */
export const CREATURE_CATCH_SPOTS = [
  { x: 20, y: 34 },
  { x: 50, y: 58 },
  { x: 80, y: 30 },
]

/** A fresh round: three wild creatures, ball in hand, aiming. */
export function newCreatureCatchGame(
  round: CreatureCatchRound,
): CreatureCatchState {
  return {
    round,
    phase: 'aim',
    targetId: null,
    status: 'playing',
    lastEvent: null,
  }
}

/**
 * Throw the ball at one creature. Pure: only works while
 * aiming in a live round, and only at a creature that is
 * actually in the meadow. Returns the state unchanged when
 * the throw is not allowed (already thrown, round over,
 * unknown creature) — the component treats an unchanged
 * state as "no throw happened".
 */
export function throwAt(
  state: CreatureCatchState,
  creatureId: string,
): CreatureCatchState {
  if (state.status !== 'playing' || state.phase !== 'aim') return state
  if (!state.round.creatures.some((c) => c.id === creatureId)) return state
  return { ...state, phase: 'flying', targetId: creatureId }
}

/**
 * Settle a thrown ball once it reaches the creature. Pure:
 * only works while the ball is flying. The right creature is
 * caught (round won); a wrong creature breaks free (round
 * lost). Returns the state unchanged when there is no ball
 * in flight to settle.
 */
export function resolveThrow(
  state: CreatureCatchState,
): CreatureCatchState {
  if (state.status !== 'playing' || state.phase !== 'flying') return state
  const target = state.round.creatures.find((c) => c.id === state.targetId)
  if (!target) return state
  if (target.correct) {
    return {
      ...state,
      phase: 'caught',
      status: 'won',
      lastEvent: {
        kind: 'caught',
        creatureId: target.creatureId,
        name: target.name,
        answer: target.answer,
      },
    }
  }
  return {
    ...state,
    phase: 'broke-free',
    status: 'out',
    lastEvent: {
      kind: 'broke-free',
      creatureId: target.creatureId,
      name: target.name,
      answer: target.answer,
    },
  }
}

/**
 * Add a caught creature to the kid's collection. Pure: a
 * creature already in the collection is not added twice, and
 * the caller's array is never mutated. The collection is a
 * list of creature ids, newest catch first.
 */
export function addToCollection(
  collection: string[],
  creatureId: string,
): string[] {
  if (!creatureId) return [...collection]
  if (collection.includes(creatureId)) return [...collection]
  return [creatureId, ...collection]
}

/**
 * Build one round's meadow: 3 different original creatures
 * from the roster, one holding the correct answer and the
 * other two holding borrowed wrong answers, standing on the
 * three meadow spots in shuffled order. Returns null when
 * the answers build no round: fewer than two different
 * answers to borrow as wrong creatures.
 */
export function buildCreatureCatchRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): CreatureCatchRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowWrongAnswers(otherAnswers, clean)
  if (wrongs.length < CREATURE_CATCH_CREATURES_PER_ROUND - 1) return null
  const creatures = shuffled(CREATURE_CATCH_ROSTER).slice(
    0,
    CREATURE_CATCH_CREATURES_PER_ROUND,
  )
  const correctSpot = Math.floor(
    Math.random() * CREATURE_CATCH_CREATURES_PER_ROUND,
  )
  const spots = shuffled(CREATURE_CATCH_SPOTS)
  const built: CreatureCatchSpot[] = creatures.map((creature, i) => {
    const correct = i === correctSpot
    return {
      id: `creature-${i}`,
      creatureId: creature.id,
      name: creature.name,
      emoji: creature.emoji,
      color: creature.color,
      answer: correct ? clean : wrongs[i < correctSpot ? i : i - 1]!,
      correct,
      x: spots[i]!.x,
      y: spots[i]!.y,
    }
  })
  return {
    prompt,
    creatures: built,
    imageUrl,
    imageCredit,
  }
}
