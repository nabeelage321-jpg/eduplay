/**
 * Beat Tap — pure rhythm-tap / falling-note logic (no React,
 * no sound, no storage).
 *
 * EduPlay's own Guitar Hero-STYLE rhythm tapper (type 55):
 * notes fall down a track and the kid taps the drum when a
 * note crosses the line — in time with the beat. Guitar
 * Hero-STYLE mechanic only: the name is EduPlay's own, the
 * notes are plain circles with an answer written on each, the
 * drum is a plain drum circle — no Guitar Hero name, no
 * Activision notes or art copied. Nothing here invents
 * content: the notes carry the game's real answers — the
 * round's correct answer on one note, wrong answers borrowed
 * from the game's other items on the rest.
 *
 * The track is 100 wide x 60 high, y grows downwards. A hit
 * line sits at y = 48 with a drum below it. Notes fall one
 * per beat (a beat is 0.6s), each crossing the line exactly
 * on a beat, so the kid can feel the rhythm: the drum thumps
 * every beat and the line flashes with it. The first note
 * crosses 2.4s after the round starts (4 beats of travel),
 * so the kid sees it coming down the track first.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per CORRECT on-beat tap (one correct
 *   note per round, one round per question, up to 10 rounds).
 *   Score out of 10 x rounds.
 * - Tapping while the CORRECT note is inside the hit window
 *   (+/-0.22s around its crossing): +10, the round is won.
 *   Inside +/-0.10s it is a PERFECT tap; a wider on-beat tap
 *   is GOOD — both earn the same 10 points, the word is the
 *   only difference.
 * - Tapping while a WRONG note is inside the window: the note
 *   bursts, no points, and the streak breaks — but no life is
 *   lost and the round goes on, so the kid can still wait for
 *   the right note. A burst note cannot be tapped again.
 * - Tapping with no note inside the window (off-beat): no
 *   points, the streak breaks, no life lost — the drum just
 *   thuds. Notes are a beat apart and the window is narrower
 *   than half a beat, so a tap can only ever be judged against
 *   one note.
 * - Letting the CORRECT note pass the line untapped: 1 life
 *   lost and the round ends at once — that was the round's one
 *   chance. Wrong notes passing the line cost nothing.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win.
 * - A round needs at least two different answers to borrow as
 *   wrong notes, or there is no choice in it. Wrong notes
 *   re-use the borrowed wrong answers.
 */

export const BEAT_TAP_LIVES = 3
export const BEAT_TAP_MAX_ROUNDS = 10
/** Points for tapping the correct note on the beat. */
export const BEAT_TAP_POINTS_PER_TAP = 10
/** Notes falling in every round (1 correct + 3 wrong slots). */
export const BEAT_TAP_NOTES_PER_ROUND = 4
/** Field size, in field units (y grows downwards). */
export const BEAT_TAP_FIELD_WIDTH = 100
export const BEAT_TAP_FIELD_HEIGHT = 60
/** The line a note must be tapped on. */
export const BEAT_TAP_LINE_Y = 48
/** Seconds between beats — and between falling notes. */
export const BEAT_TAP_BEAT = 0.6
/** Seconds a note spends falling from the top to the line. */
export const BEAT_TAP_TRAVEL = 2.4
/** Falling speed, field units per second. */
export const BEAT_TAP_FALL_SPEED =
  BEAT_TAP_LINE_Y / BEAT_TAP_TRAVEL
/** Seconds either side of a crossing that still count as a hit. */
export const BEAT_TAP_HIT_WINDOW = 0.22
/** Seconds either side of a crossing that count as PERFECT. */
export const BEAT_TAP_PERFECT_WINDOW = 0.1
/** Wrong answers borrowed per round (re-used across wrong notes). */
export const BEAT_TAP_MAX_WRONGS = 2
/** Max sub-step, so a fast note can never tunnel past the line. */
const MAX_SUBSTEP = 1 / 60

export interface BeatTapPoint {
  x: number
  y: number
}

/** One falling note: the answer it carries and when it crosses. */
export interface BeatTapNote {
  id: string
  answer: string
  correct: boolean
  /** Seconds since the round started when it crosses the line. */
  crossAt: number
  /** True once a wrong note was tapped (burst) or passed the line. */
  spent: boolean
}

export interface BeatTapRound {
  prompt: string
  notes: BeatTapNote[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type BeatTapStatus = 'playing' | 'won' | 'out'

/** What the last step or tap resolved to — the component turns
 *  it into feedback. */
export type BeatTapEvent =
  | { kind: 'hit-correct'; answer: string; perfect: boolean }
  | { kind: 'hit-wrong'; answer: string }
  | { kind: 'missed-correct'; answer: string }
  | { kind: 'off-beat' }
  | null

/** The live state of one round. */
export interface BeatTapState {
  round: BeatTapRound
  /** Seconds since the round started. */
  t: number
  status: BeatTapStatus
  lastEvent: BeatTapEvent
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
 * BEAT_TAP_MAX_WRONGS, shuffled, without mutating the
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
  return shuffled(wrongs).slice(0, BEAT_TAP_MAX_WRONGS)
}

/** Which beat the clock is on — the component thumps the drum
 *  each time this changes. */
export function beatTapBeatIndex(t: number): number {
  return Math.floor(t / BEAT_TAP_BEAT)
}

/** Where a note sits on the track at time t (y grows down;
 *  above the top means it has not fallen in yet). */
export function beatTapNoteY(note: BeatTapNote, t: number): number {
  return BEAT_TAP_LINE_Y - BEAT_TAP_FALL_SPEED * (note.crossAt - t)
}

/** A fresh round: the clock at zero, no note spent yet. */
export function newBeatTapGame(round: BeatTapRound): BeatTapState {
  return {
    round: {
      ...round,
      notes: round.notes.map((n) => ({ ...n, spent: false })),
    },
    t: 0,
    status: 'playing',
    lastEvent: null,
  }
}

/**
 * One clock step, split into small sub-steps so a note can never
 * tunnel past the line. Pure.
 *
 * Per sub-step: advance the clock, then resolve: a note that
 * passed the line unspent is spent — and if it was the correct
 * note, the round ends at once with a life lost. Wrong notes
 * passing the line cost nothing.
 */
export function stepBeatTap(
  state: BeatTapState,
  dt: number,
): BeatTapState {
  if (state.status !== 'playing') return state
  let current: BeatTapState = { ...state, lastEvent: null }
  const steps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP))
  const sub = dt / steps
  for (let i = 0; i < steps; i++) {
    if (current.status !== 'playing') return current
    current = stepBeatTapOnce(current, sub)
  }
  return current
}

function stepBeatTapOnce(
  state: BeatTapState,
  dt: number,
): BeatTapState {
  const t = state.t + dt
  let notes = state.round.notes
  let spentAny = false
  let missed: BeatTapNote | null = null
  const nextNotes: BeatTapNote[] = []
  for (const n of notes) {
    if (!n.spent && t - n.crossAt > BEAT_TAP_HIT_WINDOW) {
      spentAny = true
      if (n.correct) missed = n
      nextNotes.push({ ...n, spent: true })
    } else {
      nextNotes.push(n)
    }
  }
  if (spentAny) notes = nextNotes
  if (missed) {
    return {
      ...state,
      t,
      round: { ...state.round, notes },
      status: 'out',
      lastEvent: { kind: 'missed-correct', answer: missed.answer },
    }
  }
  return { ...state, t, round: { ...state.round, notes }, lastEvent: null }
}

/**
 * Tap the drum (or a note, or Space) at the round's current
 * clock. Pure.
 *
 * The tap is judged against the live note nearest the line:
 * a correct note inside the hit window wins the round (+10 —
 * the component adds the points); a wrong note inside the
 * window bursts, breaks the streak, and the round goes on;
 * no note inside the window is an off-beat tap, which breaks
 * the streak and nothing else. A spent note is never judged
 * again.
 */
export function tapBeatTap(state: BeatTapState): BeatTapState {
  if (state.status !== 'playing') return state
  let best: BeatTapNote | null = null
  let bestOffset = Number.POSITIVE_INFINITY
  for (const n of state.round.notes) {
    if (n.spent) continue
    const offset = Math.abs(state.t - n.crossAt)
    if (offset < bestOffset) {
      bestOffset = offset
      best = n
    }
  }
  if (!best || bestOffset > BEAT_TAP_HIT_WINDOW) {
    return { ...state, lastEvent: { kind: 'off-beat' } }
  }
  if (best.correct) {
    return {
      ...state,
      status: 'won',
      lastEvent: {
        kind: 'hit-correct',
        answer: best.answer,
        perfect: bestOffset <= BEAT_TAP_PERFECT_WINDOW,
      },
    }
  }
  const notes = state.round.notes.map((n) =>
    n.id === best!.id ? { ...n, spent: true } : n,
  )
  return {
    ...state,
    round: { ...state.round, notes },
    lastEvent: { kind: 'hit-wrong', answer: best.answer },
  }
}

/**
 * Play a round until it settles (won, out, or the step budget
 * runs out) with no taps at all. Pure and deterministic — for
 * tests: with no tap, the correct note always passes and the
 * round is lost.
 */
export function simulateRound(
  state: BeatTapState,
  dt = 1 / 60,
  maxSteps = 3600,
): BeatTapState {
  let current = state
  for (let i = 0; i < maxSteps; i++) {
    if (current.status !== 'playing') return current
    current = stepBeatTap(current, dt)
  }
  return current
}

/**
 * Build one round's falling notes: BEAT_TAP_NOTES_PER_ROUND
 * notes — the correct answer on one, the borrowed wrong
 * answers re-used across the rest. The correct note falls in
 * a shuffled slot, not a fixed one, and every note crosses
 * the line exactly on a beat. Returns null when the answers
 * build no round: fewer than two different answers to borrow
 * as wrong notes.
 */
export function buildBeatTapRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): BeatTapRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowWrongAnswers(otherAnswers, clean)
  if (wrongs.length < BEAT_TAP_MAX_WRONGS) return null
  const wrongCycle = shuffled(wrongs)
  // Shuffle the slots first, so the correct note falls in a
  // shuffled slot, not a fixed one.
  const slots = shuffled(
    Array.from({ length: BEAT_TAP_NOTES_PER_ROUND }, (_, i) => i),
  )
  const correctSlot = slots[0]!
  const notes: BeatTapNote[] = []
  for (let i = 0; i < BEAT_TAP_NOTES_PER_ROUND; i++) {
    const correct = i === correctSlot
    notes.push({
      id: `note-${i}`,
      answer: correct ? clean : wrongCycle[i % wrongCycle.length]!,
      correct,
      crossAt: BEAT_TAP_TRAVEL + i * BEAT_TAP_BEAT,
      spent: false,
    })
  }
  return {
    prompt,
    notes,
    imageUrl,
    imageCredit,
  }
}
