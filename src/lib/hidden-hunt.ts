/**
 * Hidden Hunt — pure seek-and-find logic (no React, no sound,
 * no storage).
 *
 * EduPlay's own seek-and-find game (type 62): a sunny park
 * clearing hides the answers behind six hiding places, and
 * the kid peeks behind them to find the one holding the right
 * answer. Own name, own art (emoji hiding places drawn here),
 * own words — nothing copied from any other seek-and-find
 * game, and no trademarked game name is used. Nothing here
 * invents content: the hiding places carry the game's real
 * answers — the round's correct answer behind one, wrong
 * answers borrowed from the game's other items behind the
 * rest.
 *
 * The clearing holds 6 hiding places. The question is shown
 * (e.g. "Find the 8" or "2+6 = ?"); the kid taps a hiding
 * place to peek behind it. A peek lifts the hiding place for
 * a moment and shows what is behind it.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per hidden thing FOUND. One find per
 *   round, 10 rounds — score out of 10 x rounds.
 * - Peek behind the RIGHT hiding place and the hidden thing
 *   is found: it pops out with a sparkle, +10 points, and
 *   the round is won.
 * - Peek behind a WRONG hiding place and it is a gentle
 *   miss: the wrong answer shows, no points — and the peek
 *   costs 1 life, but the round goes ON, so the kid keeps
 *   hunting (a wrong peek is never a harsh fail state, and
 *   never ends the round on its own). A place already peeked
 *   stays open, so the kid remembers where they looked.
 * - After 2 wrong peeks in a round the game gives a gentle
 *   hint: which side of the clearing to look on.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win.
 * - A round needs at least five different answers to borrow
 *   as wrong hiding places, or there is nothing to hunt
 *   among.
 */

export const HIDDEN_HUNT_LIVES = 3
export const HIDDEN_HUNT_MAX_ROUNDS = 10
/** Points for finding the one hidden thing in a round. */
export const HIDDEN_HUNT_POINTS_PER_FIND = 10
/** Hiding places in the clearing in every round: one right
 *  answer, five borrowed wrong ones. */
export const HIDDEN_HUNT_SPOTS_PER_ROUND = 6
/** Max points in one round: one correct find. */
export const HIDDEN_HUNT_MAX_PER_ROUND = HIDDEN_HUNT_POINTS_PER_FIND
/** Wrong peeks in a round before the gentle side hint appears. */
export const HIDDEN_HUNT_HINT_AFTER_WRONGS = 2

/** One hiding place in the park clearing — invented here,
 *  nothing copied. */
export interface HiddenHuntSpot {
  id: string
  name: string
  emoji: string
  color: string
  /** Clearing position, percent across / down the scene. */
  x: number
  y: number
}

/** The six hiding places a kid can peek behind. */
export const HIDDEN_HUNT_SPOTS: HiddenHuntSpot[] = [
  { id: 'big-tree', name: 'the big tree', emoji: '🌳', color: '#16a34a', x: 14, y: 30 },
  { id: 'grey-rock', name: 'the grey rock', emoji: '🪨', color: '#78716c', x: 50, y: 22 },
  { id: 'green-bush', name: 'the green bush', emoji: '🌿', color: '#22c55e', x: 86, y: 34 },
  { id: 'red-mushroom', name: 'the red mushroom', emoji: '🍄', color: '#dc2626', x: 26, y: 68 },
  { id: 'sunny-flower', name: 'the sunny flower', emoji: '🌻', color: '#ca8a04', x: 62, y: 62 },
  { id: 'picnic-basket', name: 'the picnic basket', emoji: '🧺', color: '#b45309', x: 88, y: 70 },
]

/** One hiding place in the clearing, hiding an answer. */
export interface HiddenHuntPlace {
  id: string
  spotId: string
  name: string
  emoji: string
  color: string
  answer: string
  correct: boolean
  /** Clearing position, percent across / down the scene. */
  x: number
  y: number
}

export interface HiddenHuntRound {
  prompt: string
  places: HiddenHuntPlace[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type HiddenHuntPhase = 'hiding' | 'peeking' | 'found'

export type HiddenHuntStatus = 'playing' | 'won'

/** What the last peek resolved to — the component turns it
 *  into feedback, sounds, and the life it costs. */
export type HiddenHuntEvent =
  | { kind: 'found'; spotId: string; name: string; answer: string }
  | { kind: 'not-here'; spotId: string; name: string; answer: string }
  | null

/** The live state of one round. */
export interface HiddenHuntState {
  round: HiddenHuntRound
  phase: HiddenHuntPhase
  /** The place the kid is peeking behind (or peeked behind). */
  targetId: string | null
  /** Places already peeked and shown wrong this round — they
   *  stay open so the kid remembers where they looked. */
  revealedIds: string[]
  status: HiddenHuntStatus
  lastEvent: HiddenHuntEvent
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
 * HIDDEN_HUNT_SPOTS_PER_ROUND - 1, shuffled, without mutating
 * the caller's array.
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
  return shuffled(wrongs).slice(0, HIDDEN_HUNT_SPOTS_PER_ROUND - 1)
}

/**
 * The gentle side hint: which side of the clearing the right
 * hiding place sits on — 'left', 'middle', or 'right'. The
 * hint names a side, never the hiding place itself, so the
 * kid still has to look.
 */
export function hiddenHuntHintSide(round: HiddenHuntRound): 'left' | 'middle' | 'right' {
  const correct = round.places.find((p) => p.correct)
  if (!correct) return 'middle'
  if (correct.x < 34) return 'left'
  if (correct.x > 66) return 'right'
  return 'middle'
}

/** A fresh round: everything hidden, nothing peeked yet. */
export function newHiddenHuntGame(
  round: HiddenHuntRound,
): HiddenHuntState {
  return {
    round,
    phase: 'hiding',
    targetId: null,
    revealedIds: [],
    status: 'playing',
    lastEvent: null,
  }
}

/**
 * Peek behind one hiding place. Pure: only works while hiding
 * in a live round, only at a place that is actually in the
 * clearing, and never at a place already peeked and shown
 * wrong. Returns the state unchanged when the peek is not
 * allowed (already peeking, round over, unknown place,
 * already revealed) — the component treats an unchanged
 * state as "no peek happened".
 */
export function peekAt(
  state: HiddenHuntState,
  placeId: string,
): HiddenHuntState {
  if (state.status !== 'playing' || state.phase !== 'hiding') return state
  if (!state.round.places.some((p) => p.id === placeId)) return state
  if (state.revealedIds.includes(placeId)) return state
  return { ...state, phase: 'peeking', targetId: placeId }
}

/**
 * Settle a peek once the hiding place has lifted. Pure: only
 * works while peeking. The right place is found (round won);
 * a wrong place is a gentle miss — it joins the revealed
 * places and the round goes on, so the kid keeps hunting.
 * Returns the state unchanged when there is no peek in
 * progress to settle.
 */
export function resolvePeek(
  state: HiddenHuntState,
): HiddenHuntState {
  if (state.status !== 'playing' || state.phase !== 'peeking') return state
  const target = state.round.places.find((p) => p.id === state.targetId)
  if (!target) return state
  if (target.correct) {
    return {
      ...state,
      phase: 'found',
      status: 'won',
      lastEvent: {
        kind: 'found',
        spotId: target.spotId,
        name: target.name,
        answer: target.answer,
      },
    }
  }
  return {
    ...state,
    phase: 'hiding',
    targetId: null,
    revealedIds: [...state.revealedIds, target.id],
    lastEvent: {
      kind: 'not-here',
      spotId: target.spotId,
      name: target.name,
      answer: target.answer,
    },
  }
}

/**
 * Build one round's clearing: 6 different hiding places, one
 * hiding the correct answer and the other five hiding
 * borrowed wrong answers, in shuffled order. Returns null
 * when the answers build no round: fewer than five different
 * answers to borrow as wrong hiding places.
 */
export function buildHiddenHuntRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): HiddenHuntRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowWrongAnswers(otherAnswers, clean)
  if (wrongs.length < HIDDEN_HUNT_SPOTS_PER_ROUND - 1) return null
  const places = shuffled(HIDDEN_HUNT_SPOTS)
  const correctSpot = Math.floor(
    Math.random() * HIDDEN_HUNT_SPOTS_PER_ROUND,
  )
  const built: HiddenHuntPlace[] = places.map((spot, i) => {
    const correct = i === correctSpot
    return {
      id: `place-${i}`,
      spotId: spot.id,
      name: spot.name,
      emoji: spot.emoji,
      color: spot.color,
      answer: correct ? clean : wrongs[i < correctSpot ? i : i - 1]!,
      correct,
      x: spot.x,
      y: spot.y,
    }
  })
  return {
    prompt,
    places: built,
    imageUrl,
    imageCredit,
  }
}
