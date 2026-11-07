/**
 * Jump Blocks — pure platformer logic (no React, no sound, no storage).
 *
 * EduPlay's own Mario-STYLE platformer game (type 46): the kid runs
 * along the ground and jumps to hit the question block hanging in
 * the air that carries the correct answer. Mario-STYLE mechanic
 * only: the name is EduPlay's own, the runner is a generic emoji
 * kid, the blocks are plain amber boxes with a "?" and the answer
 * written on them — no Mario name, no Mario character, no
 * Nintendo art, no copied sprites. Nothing here invents content:
 * the blocks carry the game's real answers — the correct answer
 * plus wrong answers borrowed from the game's other items. This
 * module only lays the blocks out, runs the jump physics, and
 * judges block hits.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, 10 points per correct block hit, score out of
 *   10 x rounds. Every correct block hit also collects one coin.
 * - One round (one level) per question, up to 10 rounds. The
 *   question is shown above the level; the correct answer is NEVER
 *   shown — the kid has to know it and jump to hit the block
 *   that says it.
 * - The kid runs left and right along the ground (arrow keys /
 *   A,D, or hold the on-screen ◀ ▶ buttons) and jumps with
 *   Space / Arrow Up / W or the JUMP button. A jump only works
 *   from the ground — no double jump.
 * - A block is hit when the kid's head reaches its underside
 *   while rising under it. Hitting the CORRECT block: +10, one
 *   coin, round done. Hitting a WRONG block: -1 life, the block
 *   cracks and can never be hit again, and the kid drops back to
 *   the ground. (Plainly: a wrong block costs a life — the
 *   blocks are all visible before the kid jumps, so a wrong hit
 *   is a genuine wrong answer.)
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win.
 */

export const JUMP_BLOCKS_LIVES = 3
export const JUMP_BLOCKS_MAX_ROUNDS = 10
/** Answer blocks across the level — one per column. */
export const JUMP_BLOCKS_COLS = 4
/** How many wrong blocks at most share a level with the correct one. */
export const JUMP_BLOCKS_MAX_WRONGS = 3
/** Playfield geometry (px) — shared by the player and the hit test. */
export const JUMP_BLOCKS_FIELD_HEIGHT = 360
/** Height of the ground strip at the bottom of the field. */
export const JUMP_BLOCKS_GROUND_HEIGHT = 46
/** Top edge of the ground strip — the kid stands on this line. */
export const JUMP_BLOCKS_GROUND_TOP =
  JUMP_BLOCKS_FIELD_HEIGHT - JUMP_BLOCKS_GROUND_HEIGHT
/** The kid's drawn height (px). */
export const JUMP_BLOCKS_KID_HEIGHT = 48
/** The kid's width as a percentage of the field width. */
export const JUMP_BLOCKS_KID_WIDTH_PCT = 9
/** Top edge (px) of the hanging question blocks. */
export const JUMP_BLOCKS_BLOCK_TOP = 118
/** Height (px) of a question block. */
export const JUMP_BLOCKS_BLOCK_HEIGHT = 44
/** Bottom edge (px) of a question block — the kid's head must reach it. */
export const JUMP_BLOCKS_BLOCK_BOTTOM =
  JUMP_BLOCKS_BLOCK_TOP + JUMP_BLOCKS_BLOCK_HEIGHT
/** A few forgiving pixels: a head this close under a block still counts. */
export const JUMP_BLOCKS_HIT_SLACK_PX = 4
/** Game tick: the player advances physics every JUMP_BLOCKS_TICK_MS. */
export const JUMP_BLOCKS_TICK_MS = 50
/** How far (percent of field width) the kid runs per tick while a key is held. */
export const JUMP_BLOCKS_MOVE_PCT_PER_TICK = 1.6
/** Upward speed (px per tick) at the moment of a jump. */
export const JUMP_BLOCKS_JUMP_VELOCITY = 14
/** Gravity (px per tick squared) pulling the kid back down. */
export const JUMP_BLOCKS_GRAVITY = 0.8

export interface JumpBlocksBlock {
  id: number
  label: string
  correct: boolean
  col: number
  /** False once the kid hit this wrong block — it is cracked and done. */
  alive: boolean
}

export interface JumpBlocksRound {
  prompt: string
  correctAnswer: string
  blocks: JumpBlocksBlock[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

/** Left edge (percent of field width) of a block column. */
export function blockColLeftPct(col: number): number {
  return (col * 100) / JUMP_BLOCKS_COLS
}

/** Keep the kid inside the level: 0 .. 100 - kid width. */
export function clampKidXPct(xPct: number): number {
  return Math.max(0, Math.min(100 - JUMP_BLOCKS_KID_WIDTH_PCT, xPct))
}

/** Centre of the kid (percent) from its left edge. */
export function kidCenterPct(xPct: number): number {
  return xPct + JUMP_BLOCKS_KID_WIDTH_PCT / 2
}

/** Top edge (px) of the kid's head at this jump height above the ground. */
export function kidHeadTopPx(jumpHeightPx: number): number {
  return JUMP_BLOCKS_GROUND_TOP - jumpHeightPx - JUMP_BLOCKS_KID_HEIGHT
}

/**
 * One physics step of a jump. `y` is the height above the ground,
 * `vy` the upward speed. Returns the next state; `landed` is true
 * on the step the kid touches the ground again.
 */
export function nextJumpState(
  y: number,
  vy: number,
): { y: number; vy: number; landed: boolean } {
  const nextVy = vy - JUMP_BLOCKS_GRAVITY
  const nextY = y + nextVy
  if (nextY <= 0) return { y: 0, vy: 0, landed: true }
  return { y: nextY, vy: nextVy, landed: false }
}

/** Highest point (px) a jump from the ground reaches. */
export function jumpApexPx(): number {
  let y = 0
  let vy = JUMP_BLOCKS_JUMP_VELOCITY
  let apex = 0
  while (true) {
    const next = nextJumpState(y, vy)
    apex = Math.max(apex, next.y)
    if (next.landed) return apex
    y = next.y
    vy = next.vy
  }
}

/**
 * Wrong answers borrowed from the game's other items: distinct
 * answers that differ from this round's correct answer, shuffled,
 * at most JUMP_BLOCKS_MAX_WRONGS. Empty when the game has no
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
  return wrongs.slice(0, JUMP_BLOCKS_MAX_WRONGS)
}

/**
 * Build one round. Returns null when there is no wrong answer to
 * borrow — a level with only the correct block has no choice in
 * it. The blocks (correct + wrongs) are shuffled and laid out one
 * per column, so the correct block sits in a different place
 * every round.
 */
export function buildJumpBlocksRound(
  prompt: string,
  answer: string,
  wrongAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): JumpBlocksRound | null {
  const correctAnswer = (answer ?? '').trim()
  if (!prompt || !correctAnswer || wrongAnswers.length === 0) return null
  const labels = [correctAnswer, ...wrongAnswers]
  for (let i = labels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = labels[i]
    labels[i] = labels[j]
    labels[j] = tmp
  }
  const blocks: JumpBlocksBlock[] = labels.map((label, i) => ({
    id: i,
    label,
    correct: label === correctAnswer,
    col: i,
    alive: true,
  }))
  return { prompt, correctAnswer, blocks, imageUrl, imageCredit }
}

/**
 * Which block the kid hits, if any. The kid's head must have
 * reached the block's underside (within the hit slack) while the
 * kid's centre is under that block's column. Cracked blocks
 * (alive false) can never be hit again. Null when the kid is not
 * high enough yet or is not under a live block.
 */
export function blockHitAt(
  blocks: JumpBlocksBlock[],
  kidXPct: number,
  jumpHeightPx: number,
): JumpBlocksBlock | null {
  const headTop = kidHeadTopPx(jumpHeightPx)
  if (headTop > JUMP_BLOCKS_BLOCK_BOTTOM + JUMP_BLOCKS_HIT_SLACK_PX) return null
  const center = kidCenterPct(kidXPct)
  for (const block of blocks) {
    if (!block.alive) continue
    const left = blockColLeftPct(block.col)
    const right = blockColLeftPct(block.col + 1)
    if (center >= left && center < right) return block
  }
  return null
}

/** A copy of the blocks with this one cracked (alive false). */
export function crackBlock(
  blocks: JumpBlocksBlock[],
  id: number,
): JumpBlocksBlock[] {
  return blocks.map((b) => (b.id === id ? { ...b, alive: false } : b))
}

/** True when the hit block carries the correct answer. */
export function isCorrectBlock(block: JumpBlocksBlock): boolean {
  return block.correct
}
