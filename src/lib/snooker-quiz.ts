/**
 * Snooker Quiz — pure pot-the-ball quiz logic (no React, no
 * sound, no storage).
 *
 * EduPlay's own snooker-THEMED quiz (type 65): a quiz game with
 * a snooker theme, NOT a snooker simulation and NOT a copy of
 * any snooker game. The name "Snooker Quiz" is the plain
 * English name of the sport + the game type; every ball, colour,
 * and word below is drawn here from the public rules of snooker
 * itself (red ball, then a colour ball — yellow 2, green 3,
 * brown 4, blue 5, pink 6, black 7), nothing copied from a
 * rival's art, name, wording, or audio. Nothing here invents
 * content: the balls carry the game's real answers — the round's
 * correct answer on one ball, wrong answers borrowed from the
 * game's other items on the rest.
 *
 * The green table holds 4 balls. The question is shown (e.g.
 * "2+6 = ?"); the kid pots the ball holding 8. Potting the
 * right ball is a RED: +10 points. Then a colour ball is
 * offered for bonus points — pick any colour (yellow 2, green
 * 3, brown 4, blue 5, pink 6, black 7), just like potting a
 * colour after a red in real snooker. The colour is a free
 * pick, a reward, never a second test — a kid always keeps the
 * red's points, and the colour only adds.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per RED potted (one red per round),
 *   +2 to +7 bonus per COLOUR potted after a red — 17 points
 *   a round at most, score out of 17 x rounds.
 * - Pot the WRONG ball and it is a MISS: no points, the round
 *   ends at once and costs 1 life. One pot per round, so a
 *   miss is the round lost, not a retry.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win.
 * - A round needs at least three different answers to borrow
 *   as wrong balls, or there is no choice in it.
 */

export const SNOOKER_QUIZ_LIVES = 3
export const SNOOKER_QUIZ_MAX_ROUNDS = 10
/** Points for potting the red (the ball with the right answer). */
export const SNOOKER_QUIZ_RED_POINTS = 10
/** Balls on the table in every round: one right answer, three
 *  borrowed wrong ones. */
export const SNOOKER_QUIZ_BALLS_PER_ROUND = 4
/** Max points in one round: red 10 + black 7. */
export const SNOOKER_QUIZ_MAX_PER_ROUND =
  SNOOKER_QUIZ_RED_POINTS + 7

/** One snooker ball colour — the public colours of the game,
 *  with the real snooker value of each colour ball. */
export interface SnookerQuizColour {
  id: string
  name: string
  hex: string
  /** Bonus points for potting this colour after a red. The red
   *  itself has no bonus value — it is the question ball. */
  points: number | null
}

/** All seven snooker balls, in the order they sit on the table. */
export const SNOOKER_QUIZ_COLOURS: SnookerQuizColour[] = [
  { id: 'red', name: 'Red', hex: '#dc2626', points: null },
  { id: 'yellow', name: 'Yellow', hex: '#eab308', points: 2 },
  { id: 'green', name: 'Green', hex: '#16a34a', points: 3 },
  { id: 'brown', name: 'Brown', hex: '#92400e', points: 4 },
  { id: 'blue', name: 'Blue', hex: '#2563eb', points: 5 },
  { id: 'pink', name: 'Pink', hex: '#ec4899', points: 6 },
  { id: 'black', name: 'Black', hex: '#1f2937', points: 7 },
]

/** The six colour balls offered for bonus after a red. */
export const SNOOKER_QUIZ_COLOUR_BALLS: SnookerQuizColour[] =
  SNOOKER_QUIZ_COLOURS.filter((c) => c.points !== null)

/** One ball on the table, holding an answer. */
export interface SnookerQuizBall {
  id: string
  colourId: string
  colourName: string
  hex: string
  answer: string
  correct: boolean
  /** Table position, percent across / down the scene. */
  x: number
  y: number
}

export interface SnookerQuizRound {
  prompt: string
  balls: SnookerQuizBall[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type SnookerQuizPhase =
  | 'aim'
  | 'rolling'
  | 'colour'
  | 'potted'
  | 'missed'

export type SnookerQuizStatus = 'playing' | 'won' | 'out'

/** What the last pot resolved to — the component turns it into
 *  feedback and sounds. */
export type SnookerQuizEvent =
  | { kind: 'potted-red'; answer: string }
  | { kind: 'colour-potted'; colourName: string; bonus: number }
  | { kind: 'missed'; answer: string }
  | null

/** The live state of one round. */
export interface SnookerQuizState {
  round: SnookerQuizRound
  phase: SnookerQuizPhase
  /** The ball the cue ball is rolling at (or rolled at). */
  targetId: string | null
  status: SnookerQuizStatus
  lastEvent: SnookerQuizEvent
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
 * SNOOKER_QUIZ_BALLS_PER_ROUND - 1, shuffled, without
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
    SNOOKER_QUIZ_BALLS_PER_ROUND - 1,
  )
}

/** Table spots the four balls sit on (percent). */
export const SNOOKER_QUIZ_SPOTS = [
  { x: 20, y: 42 },
  { x: 40, y: 58 },
  { x: 60, y: 42 },
  { x: 80, y: 58 },
]

/** A fresh round: four balls on the table, cue ball ready. */
export function newSnookerQuizGame(
  round: SnookerQuizRound,
): SnookerQuizState {
  return {
    round,
    phase: 'aim',
    targetId: null,
    status: 'playing',
    lastEvent: null,
  }
}

/**
 * Pot a ball. Pure: only works while aiming in a live round,
 * and only at a ball that is actually on the table. Returns
 * the state unchanged when the pot is not allowed (already
 * potted, round over, unknown ball) — the component treats an
 * unchanged state as "no pot happened".
 */
export function potBall(
  state: SnookerQuizState,
  ballId: string,
): SnookerQuizState {
  if (state.status !== 'playing' || state.phase !== 'aim') return state
  if (!state.round.balls.some((b) => b.id === ballId)) return state
  return { ...state, phase: 'rolling', targetId: ballId }
}

/**
 * Settle a rolling cue ball once it reaches the ball. Pure:
 * only works while the ball is rolling. The right ball is a
 * RED potted (round continues to the colour pick); a wrong
 * ball is a MISS (round lost). Returns the state unchanged
 * when there is no ball rolling to settle.
 */
export function resolvePot(state: SnookerQuizState): SnookerQuizState {
  if (state.status !== 'playing' || state.phase !== 'rolling') return state
  const target = state.round.balls.find((b) => b.id === state.targetId)
  if (!target) return state
  if (target.correct) {
    return {
      ...state,
      phase: 'colour',
      lastEvent: { kind: 'potted-red', answer: target.answer },
    }
  }
  return {
    ...state,
    phase: 'missed',
    status: 'out',
    lastEvent: { kind: 'missed', answer: target.answer },
  }
}

/**
 * Pick a colour ball after potting a red. Pure: only works in
 * the colour phase, and only for a real colour ball (yellow
 * to black — never the red). The colour's snooker value is
 * the bonus. Returns the state unchanged when the pick is
 * not allowed (wrong phase, round over, unknown colour, or
 * the red) — the component treats an unchanged state as
 * "no pick happened".
 */
export function pickColour(
  state: SnookerQuizState,
  colourId: string,
): SnookerQuizState {
  if (state.status !== 'playing' || state.phase !== 'colour') return state
  const colour = SNOOKER_QUIZ_COLOUR_BALLS.find((c) => c.id === colourId)
  if (!colour || colour.points === null) return state
  return {
    ...state,
    phase: 'potted',
    status: 'won',
    lastEvent: {
      kind: 'colour-potted',
      colourName: colour.name,
      bonus: colour.points,
    },
  }
}

/**
 * Build one round's table: 4 different snooker ball colours,
 * one holding the correct answer and the other three holding
 * borrowed wrong answers, sitting on the four table spots in
 * shuffled order. Returns null when the answers build no
 * round: fewer than three different answers to borrow as
 * wrong balls.
 */
export function buildSnookerQuizRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): SnookerQuizRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowWrongAnswers(otherAnswers, clean)
  if (wrongs.length < SNOOKER_QUIZ_BALLS_PER_ROUND - 1) return null
  const colours = shuffled(SNOOKER_QUIZ_COLOURS).slice(
    0,
    SNOOKER_QUIZ_BALLS_PER_ROUND,
  )
  const correctSpot = Math.floor(
    Math.random() * SNOOKER_QUIZ_BALLS_PER_ROUND,
  )
  const spots = shuffled(SNOOKER_QUIZ_SPOTS)
  const built: SnookerQuizBall[] = colours.map((colour, i) => {
    const correct = i === correctSpot
    return {
      id: `ball-${i}`,
      colourId: colour.id,
      colourName: colour.name,
      hex: colour.hex,
      answer: correct ? clean : wrongs[i < correctSpot ? i : i - 1]!,
      correct,
      x: spots[i]!.x,
      y: spots[i]!.y,
    }
  })
  return {
    prompt,
    balls: built,
    imageUrl,
    imageCredit,
  }
}
