/**
 * Pattern Echo — pure watch-the-pattern / repeat-it-back
 * logic (no React, no sound, no storage).
 *
 * EduPlay's own memory-sequence game (type 61): four coloured
 * pads light up in a pattern, each with its own tone, and the
 * kid taps the pads back in the same order. Each round the
 * pattern grows by one step. Nothing here copies a rival:
 * the name is EduPlay's own, the four pads are plain coloured
 * shapes drawn here (Ruby, Sunny, Leafy, Sky — own names, own
 * colours, own tones), and no trademarked game name is used.
 * Nothing here invents content: the pads carry the game's
 * real answers — the round's correct answer on one pad, wrong
 * answers borrowed from the game's other items on the rest.
 *
 * Rules (the component renders these, this module proves them):
 * - 10 rounds, +10 points per pattern repeated exactly.
 *   Score out of 10 x rounds.
 * - GATE: before the pattern shows, the kid taps the pad
 *   holding the right answer to the round's question. A wrong
 *   pad at the gate just wobbles — try again, no penalty.
 *   Answering correctly reveals the pattern.
 * - WATCH: the pads light up in order, each with its own
 *   tone. Then the kid repeats the pattern by tapping.
 * - A WRONG tap while repeating is never harsh: no life is
 *   lost, no points are lost — the pattern simply plays
 *   again from the start and the kid tries again.
 * - A pattern repeated exactly wins the round (+10). All
 *   rounds done = win. There are no lives to lose in this
 *   game, so it can never end early.
 * - The pattern starts at 3 steps and grows by one step
 *   every round, up to 8 steps.
 * - A round needs at least three different answers to borrow
 *   as wrong pads, or there is no choice at the gate.
 */

export const PATTERN_ECHO_MAX_ROUNDS = 10
/** Points for repeating one round's pattern exactly. */
export const PATTERN_ECHO_POINTS_PER_ROUND = 10
/** Max points in one round: one exact repeat. */
export const PATTERN_ECHO_MAX_PER_ROUND = PATTERN_ECHO_POINTS_PER_ROUND
/** Pads in every round: one right answer, three borrowed wrong ones. */
export const PATTERN_ECHO_PADS_PER_ROUND = 4
/** The first round's pattern is 3 steps long. */
export const PATTERN_ECHO_START_LENGTH = 3
/** The pattern never grows past 8 steps. */
export const PATTERN_ECHO_MAX_LENGTH = 8

/** How long the pattern is in a round (0-based round index):
 *  3 steps, then 4, 5, 6, 7, 8 — and 8 every round after. */
export function patternLengthForRound(roundIndex: number): number {
  return Math.min(
    PATTERN_ECHO_START_LENGTH + Math.max(0, roundIndex),
    PATTERN_ECHO_MAX_LENGTH,
  )
}

/** One of the four echo pads — invented here, nothing copied. */
export interface PatternEchoPad {
  id: string
  name: string
  emoji: string
  color: string
  /** The pad's own tone, so the pattern is hearable. */
  freq: number
}

/** The four pads: Ruby, Sunny, Leafy, Sky — own names, own
 *  colours, own tones (C, E, G, high C). */
export const PATTERN_ECHO_PADS: PatternEchoPad[] = [
  { id: 'ruby', name: 'Ruby', emoji: '🔴', color: '#ef4444', freq: 261.63 },
  { id: 'sunny', name: 'Sunny', emoji: '🟡', color: '#eab308', freq: 329.63 },
  { id: 'leafy', name: 'Leafy', emoji: '🟢', color: '#22c55e', freq: 392.0 },
  { id: 'sky', name: 'Sky', emoji: '🔵', color: '#3b82f6', freq: 523.25 },
]

/** One pad in a round, holding an answer. */
export interface PatternEchoPadSpot {
  padIndex: number
  pad: PatternEchoPad
  answer: string
  correct: boolean
}

export interface PatternEchoRound {
  prompt: string
  pads: PatternEchoPadSpot[]
  /** The pattern: pad indexes to repeat, in order. */
  pattern: number[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type PatternEchoPhase = 'gate' | 'watch' | 'repeat' | 'done'

export type PatternEchoStatus = 'playing' | 'won'

/** What the last tap did — the component turns it into
 *  feedback and sounds. */
export type PatternEchoEvent =
  | { kind: 'gate-correct'; padIndex: number; answer: string }
  | { kind: 'gate-wrong'; padIndex: number; answer: string }
  | { kind: 'echo-correct'; padIndex: number; step: number }
  | { kind: 'echo-wrong'; padIndex: number; expected: number }
  | { kind: 'round-won' }
  | null

/** The live state of one round. */
export interface PatternEchoState {
  round: PatternEchoRound
  phase: PatternEchoPhase
  /** Steps correctly repeated so far in this attempt. */
  progress: number
  /** Wrong taps this round (gate + echo), for a gentle count. */
  mistakes: number
  status: PatternEchoStatus
  lastEvent: PatternEchoEvent
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
 * PATTERN_ECHO_PADS_PER_ROUND - 1, shuffled, without
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
  return shuffled(wrongs).slice(0, PATTERN_ECHO_PADS_PER_ROUND - 1)
}

/**
 * A fresh pattern of the given length: random pad indexes,
 * never the same pad twice in a row, so every step is
 * hearable as its own tone.
 */
export function buildPattern(length: number): number[] {
  const pattern: number[] = []
  for (let i = 0; i < length; i++) {
    let next = Math.floor(Math.random() * PATTERN_ECHO_PADS_PER_ROUND)
    while (pattern.length > 0 && next === pattern[pattern.length - 1]) {
      next = Math.floor(Math.random() * PATTERN_ECHO_PADS_PER_ROUND)
    }
    pattern.push(next)
  }
  return pattern
}

/** A fresh round: at the gate, waiting for the right answer. */
export function newPatternEchoGame(
  round: PatternEchoRound,
): PatternEchoState {
  return {
    round,
    phase: 'gate',
    progress: 0,
    mistakes: 0,
    status: 'playing',
    lastEvent: null,
  }
}

/**
 * Tap a pad at the gate. Pure: only works while gating in a
 * live round, and only on a pad that is actually there. The
 * RIGHT pad reveals the pattern (phase 'watch'); a WRONG pad
 * just wobbles — the gate stays open and the mistake is
 * counted, nothing is lost. Returns the state unchanged when
 * the tap is not allowed.
 */
export function tapGate(
  state: PatternEchoState,
  padIndex: number,
): PatternEchoState {
  if (state.status !== 'playing' || state.phase !== 'gate') return state
  const pad = state.round.pads[padIndex]
  if (!pad) return state
  if (pad.correct) {
    return {
      ...state,
      phase: 'watch',
      lastEvent: { kind: 'gate-correct', padIndex, answer: pad.answer },
    }
  }
  return {
    ...state,
    mistakes: state.mistakes + 1,
    lastEvent: { kind: 'gate-wrong', padIndex, answer: pad.answer },
  }
}

/**
 * The pattern has finished playing — the kid's turn to repeat
 * it. Pure: only works from the watch phase.
 */
export function startRepeat(state: PatternEchoState): PatternEchoState {
  if (state.status !== 'playing' || state.phase !== 'watch') return state
  return { ...state, phase: 'repeat', progress: 0, lastEvent: null }
}

/**
 * Tap a pad while repeating the pattern. Pure: only works
 * while repeating in a live round, and only on a pad that is
 * actually there. The RIGHT next pad advances the repeat; the
 * LAST step wins the round. A WRONG pad is never harsh — no
 * life, no points lost — the pattern simply plays again
 * (phase 'watch', progress back to 0) and the mistake is
 * counted. Returns the state unchanged when the tap is not
 * allowed.
 */
export function tapPad(
  state: PatternEchoState,
  padIndex: number,
): PatternEchoState {
  if (state.status !== 'playing' || state.phase !== 'repeat') return state
  if (!state.round.pads[padIndex]) return state
  const expected = state.round.pattern[state.progress]
  if (padIndex === expected) {
    const step = state.progress + 1
    if (step >= state.round.pattern.length) {
      return {
        ...state,
        phase: 'done',
        progress: step,
        status: 'won',
        lastEvent: { kind: 'round-won' },
      }
    }
    return {
      ...state,
      progress: step,
      lastEvent: { kind: 'echo-correct', padIndex, step },
    }
  }
  return {
    ...state,
    phase: 'watch',
    progress: 0,
    mistakes: state.mistakes + 1,
    lastEvent: { kind: 'echo-wrong', padIndex, expected: expected! },
  }
}

/**
 * Build one round: the four pads (one holding the correct
 * answer, the other three holding borrowed wrong answers, the
 * correct pad shuffled), and a pattern of the length for this
 * round index. Returns null when the answers build no round:
 * fewer than three different answers to borrow as wrong pads,
 * or an empty prompt/answer.
 */
export function buildPatternEchoRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  roundIndex: number,
  imageUrl?: string,
  imageCredit?: string,
): PatternEchoRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowWrongAnswers(otherAnswers, clean)
  if (wrongs.length < PATTERN_ECHO_PADS_PER_ROUND - 1) return null
  const correctPad = Math.floor(Math.random() * PATTERN_ECHO_PADS_PER_ROUND)
  const pads: PatternEchoPadSpot[] = PATTERN_ECHO_PADS.map((pad, i) => {
    const correct = i === correctPad
    return {
      padIndex: i,
      pad,
      answer: correct ? clean : wrongs[i < correctPad ? i : i - 1]!,
      correct,
    }
  })
  return {
    prompt,
    pads,
    pattern: buildPattern(patternLengthForRound(roundIndex)),
    imageUrl,
    imageCredit,
  }
}
