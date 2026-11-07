/**
 * Flutter Flight — pure flight logic (no React, no sound, no storage).
 *
 * EduPlay's own flap-and-fly game (type 43): the kid taps to flap
 * our own little bird through the sky, aiming for the gate whose
 * answer is correct. Flappy-STYLE mechanic only: the name, the bird,
 * and the gates are all EduPlay's own — no Flappy Bird name, no
 * copied bird, no copied pipes. Our bird is a friendly round bird
 * drawn in SVG by the component (teal body, white belly, orange
 * beak); our gates are plain green columns drawn here in CSS, each
 * carrying one answer on a badge in its gap.
 * Nothing here invents content: prompts, correct answers, and
 * distractors all come from the game's real items; this module
 * only lays them out and flies the bird.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, 10 points per correct round, score out of 10 x rounds.
 * - One round per question, up to 10 rounds. A round is a queue of
 *   gates (the correct answer plus up to 3 wrong answers borrowed
 *   from the other items, shuffled). One gate flies in at a time
 *   from the right; the bird stays at a fixed spot on the left and
 *   the kid flaps to hold it in the air.
 * - Tap / click the sky, or press Space, to flap: one flap gives
 *   the bird one upward push; gravity pulls it down between flaps.
 *   The ceiling is safe (the bird just slides along it); the
 *   ground is not — touching it is a crash, like hitting a pipe.
 * - When a gate reaches the bird: if the bird is inside the gap,
 *   the gate is passed. A CORRECT gate ends the round (+10). A
 *   WRONG gate costs 1 life and is consumed — the next gate flies
 *   in, so one wrong gate can never cost two lives. If the bird is
 *   NOT inside the gap, it hit the gate: -1 life, the bird resets
 *   to mid-sky, and the SAME gate flies in again to retry.
 * - 45 seconds per round. Time up: -1 life, round skipped.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win. The correct gate is always in the queue, so a round can
 *   never be unwinnable because of the layout.
 */

export const FLUTTER_FLIGHT_LIVES = 3
export const FLUTTER_FLIGHT_ROUND_SECONDS = 45
export const FLUTTER_FLIGHT_WARNING_SECONDS = 5
export const FLUTTER_FLIGHT_TICK_MS = 50
export const FLUTTER_FLIGHT_MAX_ROUNDS = 10

/** The bird's fixed horizontal spot, as a fraction of the sky width. */
export const FLUTTER_FLIGHT_BIRD_X = 0.22
/** The ground line, as a fraction of the sky height (0 = top). */
export const FLUTTER_FLIGHT_GROUND_Y = 0.94
/** The bird's start height: mid-sky. */
export const FLUTTER_FLIGHT_START_Y = 0.5

/** Sky coordinates are 0..1 in both directions (y = 0 is the top). */
const GRAVITY = 2.6
const FLAP_VY = -0.95
const MAX_FALL_VY = 1.3
const GATE_SPEED = 0.3
const GATE_START_X = 1.05
/** Half the height of a gate's gap (gap = 0.34 of the sky). */
export const FLUTTER_FLIGHT_GAP_HALF = 0.17
/** The width of a gate column, as a fraction of the sky width. */
export const FLUTTER_FLIGHT_GATE_WIDTH = 0.1

/** The three heights a gap can sit at: high, middle, low. */
export const FLUTTER_FLIGHT_GAP_CENTERS = [0.26, 0.5, 0.74]

export interface FlutterFlightGate {
  answer: string
  isCorrect: boolean
  /** The centre of this gate's gap, as a fraction of the sky height. */
  gapCenter: number
}

export interface FlutterFlightRound {
  prompt: string
  correctAnswer: string
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
  /** Gates in the order they fly in. The correct gate is always here. */
  gates: FlutterFlightGate[]
}

/** Where a gate starts: just off the right edge of the sky. */
export function flutterFlightGateStartX(): number {
  return GATE_START_X
}

/**
 * One physics step (dt seconds): a flap gives one upward push,
 * otherwise gravity pulls the bird down and its fall speeds up to
 * a cap. The ceiling is safe — the bird slides along it. The
 * ground is a crash. Pure, so the rule is testable without rendering.
 */
export function stepBird(
  y: number,
  vy: number,
  dtSeconds: number,
  flapped: boolean,
): { y: number; vy: number; hitGround: boolean } {
  let nextVy = flapped ? FLAP_VY : Math.min(MAX_FALL_VY, vy + GRAVITY * dtSeconds)
  let nextY = y + nextVy * dtSeconds
  if (nextY <= 0) {
    nextY = 0
    nextVy = Math.max(0, nextVy)
  }
  if (nextY >= FLUTTER_FLIGHT_GROUND_Y) {
    return { y: FLUTTER_FLIGHT_GROUND_Y, vy: 0, hitGround: true }
  }
  return { y: nextY, vy: nextVy, hitGround: false }
}

/** One gate step: the gate drifts left at a steady speed. */
export function moveGate(x: number, dtSeconds: number): number {
  return x - GATE_SPEED * dtSeconds
}

/**
 * True when the gate's centre crossed the bird's spot on this step —
 * the moment the pass is judged. (The gate moves left, so its x
 * falls past the bird's x.)
 */
export function gateCrossedBird(prevX: number, x: number): boolean {
  return prevX >= FLUTTER_FLIGHT_BIRD_X && x < FLUTTER_FLIGHT_BIRD_X
}

/** True when the bird's height sits inside the gate's gap. */
export function birdInGap(birdY: number, gapCenter: number): boolean {
  return Math.abs(birdY - gapCenter) <= FLUTTER_FLIGHT_GAP_HALF
}

/**
 * Build one round. `answers` carries the full gate list already
 * shuffled; this function guarantees the CORRECT gate is in the
 * queue and every gate gets one of the three gap heights, so the
 * gaps vary round to round. Returns null when there is no correct
 * answer to place.
 */
export function buildFlutterFlightRound(
  prompt: string,
  answers: { answer: string; isCorrect: boolean }[],
  imageUrl?: string,
  imageCredit?: string,
): FlutterFlightRound | null {
  const correct = answers.find((a) => a.isCorrect)
  if (!correct || !correct.answer) return null
  const gates: FlutterFlightGate[] = answers
    .filter((a) => a.answer)
    .map((a) => ({
      answer: a.answer,
      isCorrect: a.isCorrect,
      gapCenter:
        FLUTTER_FLIGHT_GAP_CENTERS[
          Math.floor(Math.random() * FLUTTER_FLIGHT_GAP_CENTERS.length)
        ],
    }))
  if (!gates.some((g) => g.isCorrect)) return null
  return { prompt, correctAnswer: correct.answer, imageUrl, imageCredit, gates }
}
