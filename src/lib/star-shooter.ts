/**
 * Star Shooter — pure shooting logic (no React, no sound, no storage).
 *
 * EduPlay's own fixed-row shooter game (type 45): rows of invaders
 * descend over the sky, and the kid moves a ship along the bottom
 * and shoots the invader carrying the correct answer. Space
 * Invaders-STYLE mechanic only: the name is EduPlay's own, the
 * invaders are plain CSS boxes with a generic alien emoji — no
 * Space Invaders name, no copied invader sprites, no Taito art.
 * Nothing here invents content: the invaders carry the game's real
 * answers — the correct answer plus wrong answers borrowed from
 * the game's other items. This module only lays the invaders out
 * and judges shots and landings.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, 10 points per correct invader shot, score out of
 *   10 x rounds.
 * - One round (one sky) per question, up to 10 rounds. The
 *   question is shown above the sky; the correct answer is NEVER
 *   shown — the kid has to know it and shoot the invader that
 *   says it.
 * - The ship moves between 4 columns (arrow keys / A,D, on-screen
 *   arrows, or tap the sky to move there). A bullet flies straight
 *   up its column and hits the LOWEST living invader in that
 *   column — the first one it meets. The kid aims by standing
 *   under the invader they want.
 * - Shooting the correct invader: +10, round done. Shooting a
 *   wrong invader: the invader pops, the shot is wasted — NO life
 *   lost, no points. A miss (no invader in the column) is just a
 *   wasted shot too.
 * - The invaders descend one step every STAR_SHOOTER_DESCENT_MS.
 *   After STAR_SHOOTER_MAX_DESCENT_STEPS steps they reach the
 *   ground line: the invaders land, -1 life, round skipped.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win.
 */

export const STAR_SHOOTER_LIVES = 3
export const STAR_SHOOTER_MAX_ROUNDS = 10
/** Invader columns across the sky. */
export const STAR_SHOOTER_COLS = 4
/** How many wrong invaders at most share a sky with the correct one. */
export const STAR_SHOOTER_MAX_WRONGS = 11
/** Milliseconds between descent steps. */
export const STAR_SHOOTER_DESCENT_MS = 3500
/** Descent steps before the invaders reach the ground and land. */
export const STAR_SHOOTER_MAX_DESCENT_STEPS = 4
/** Playfield geometry (px) — shared by the player and the hit test. */
export const STAR_SHOOTER_FIELD_HEIGHT = 360
export const STAR_SHOOTER_INVADER_TOP_START = 8
export const STAR_SHOOTER_ROW_HEIGHT = 52
export const STAR_SHOOTER_INVADER_HEIGHT = 44
export const STAR_SHOOTER_DESCENT_STEP_PX = 36
/** Where bullets start: just above the ship at the bottom. */
export const STAR_SHOOTER_BULLET_START_Y = 310

export interface StarShooterInvader {
  id: number
  label: string
  correct: boolean
  row: number
  col: number
  alive: boolean
}

export interface StarShooterRound {
  prompt: string
  correctAnswer: string
  invaders: StarShooterInvader[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

/** Top edge (px) of an invader's row after this many descent steps. */
export function invaderTop(row: number, descentStep: number): number {
  return (
    STAR_SHOOTER_INVADER_TOP_START +
    row * STAR_SHOOTER_ROW_HEIGHT +
    descentStep * STAR_SHOOTER_DESCENT_STEP_PX
  )
}

/** Bottom edge (px) of an invader's row after this many descent steps. */
export function invaderBottom(row: number, descentStep: number): number {
  return invaderTop(row, descentStep) + STAR_SHOOTER_INVADER_HEIGHT
}

/** True once the invaders have descended onto the ground line. */
export function hasLanded(descentStep: number): boolean {
  return descentStep >= STAR_SHOOTER_MAX_DESCENT_STEPS
}

/** Keep the ship inside the sky: columns 0..COLS-1. */
export function clampShooterCol(col: number): number {
  return Math.max(0, Math.min(STAR_SHOOTER_COLS - 1, col))
}

/**
 * Wrong answers borrowed from the game's other items: distinct
 * answers that differ from this round's correct answer, shuffled,
 * at most STAR_SHOOTER_MAX_WRONGS. Empty when the game has no
 * other answer to borrow — such a round cannot be played.
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
  return wrongs.slice(0, STAR_SHOOTER_MAX_WRONGS)
}

/**
 * Build one round. Returns null when there is no wrong answer to
 * borrow — a sky with only the correct invader has no choice in
 * it. The invaders (correct + wrongs) are shuffled and laid out
 * row-major across STAR_SHOOTER_COLS columns, so the correct
 * invader sits in a different place every round.
 */
export function buildStarShooterRound(
  prompt: string,
  answer: string,
  wrongAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): StarShooterRound | null {
  const correctAnswer = (answer ?? '').trim()
  if (!prompt || !correctAnswer || wrongAnswers.length === 0) return null
  const labels = [correctAnswer, ...wrongAnswers]
  for (let i = labels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = labels[i]
    labels[i] = labels[j]
    labels[j] = tmp
  }
  const invaders: StarShooterInvader[] = labels.map((label, i) => ({
    id: i,
    label,
    correct: label === correctAnswer,
    row: Math.floor(i / STAR_SHOOTER_COLS),
    col: i % STAR_SHOOTER_COLS,
    alive: true,
  }))
  return { prompt, correctAnswer, invaders, imageUrl, imageCredit }
}

/** The lowest living invader in a column — the first a bullet meets. */
export function lowestAliveInColumn(
  invaders: StarShooterInvader[],
  col: number,
): StarShooterInvader | null {
  let lowest: StarShooterInvader | null = null
  for (const inv of invaders) {
    if (!inv.alive || inv.col !== col) continue
    if (!lowest || inv.row > lowest.row) lowest = inv
  }
  return lowest
}

/**
 * Which invader a bullet at this height hits, if any. A bullet
 * flies straight up its column and hits the lowest living invader
 * there once it reaches that invader's bottom edge. Null when the
 * column is empty or the bullet has not reached the invader yet.
 */
export function bulletHitsInvader(
  invaders: StarShooterInvader[],
  col: number,
  bulletY: number,
  descentStep: number,
): StarShooterInvader | null {
  const target = lowestAliveInColumn(invaders, col)
  if (!target) return null
  return bulletY <= invaderBottom(target.row, descentStep) ? target : null
}

/** A copy of the invaders with this one popped (alive false). */
export function removeInvader(
  invaders: StarShooterInvader[],
  id: number,
): StarShooterInvader[] {
  return invaders.map((inv) => (inv.id === id ? { ...inv, alive: false } : inv))
}

/** True when the correct invader has been shot. */
export function isCorrectShot(invader: StarShooterInvader): boolean {
  return invader.correct
}
