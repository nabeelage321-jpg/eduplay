/**
 * Fruit Slice — pure slicing logic (no React, no sound, no storage).
 *
 * EduPlay's own Fruit Ninja-STYLE slicing game (type 47): fruits
 * carrying answers fly up in arcs, and the kid slices the fruit
 * that says the correct answer with a swipe (mouse or touch) or a
 * tap. Fruit Ninja-STYLE mechanic only: the name is EduPlay's own,
 * the fruits are plain emoji circles with the answer written on
 * them — no Fruit Ninja name, no Halfbrick art, no copied sprites.
 * Nothing here invents content: the fruits carry the game's real
 * answers — the correct answer plus wrong answers borrowed from
 * the game's other items, plus one bomb fruit.
 *
 * Balloon Pop covers "pick the right one among moving items", so
 * only the NEW part is built here: the slice gesture (a swipe
 * segment cutting a flying fruit) and the flying-arc play. The
 * pop/escape rules are Balloon Pop's, reused, not rebuilt: a
 * sliced fruit is gone (marked sliced, like a popped balloon),
 * and a correct fruit that escapes the field unsliced ends the
 * round with 0 points and no life lost.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, 10 points per correct slice, score out of
 *   10 x rounds. One round per question, up to 10 rounds. The
 *   question is shown above the field; the correct answer is NEVER
 *   shown — the kid has to know it and slice the fruit that says it.
 * - Each round launches the correct fruit plus up to 3 wrong
 *   fruits (borrowed wrong answers) plus exactly one bomb fruit,
 *   staggered so they do not all arrive at once. Every fruit flies
 *   up in an arc (up fast, gravity pulls it back down) and drifts
 *   sideways, bouncing off the field walls.
 * - Slice by swiping across a fruit (mouse drag or touch swipe)
 *   or by tapping it. A swipe slices every fruit its line crosses.
 * - Slicing the CORRECT fruit: +10, round done. Slicing a WRONG
 *   fruit: -1 life, the fruit is gone, the round goes on. Slicing
 *   the BOMB fruit: -1 life, the fruit is gone, the round goes on.
 * - A fruit that flies off the bottom unsliced is gone. If the
 *   CORRECT fruit escapes unsliced, the round ends with 0 points
 *   and no life lost (Balloon Pop's escape rule). Wrong fruits and
 *   the bomb escaping cost nothing.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win.
 */

export const FRUIT_SLICE_LIVES = 3
export const FRUIT_SLICE_MAX_ROUNDS = 10
/** How many wrong fruits at most share a round with the correct one. */
export const FRUIT_SLICE_MAX_WRONGS = 3
/** Playfield geometry (px) — shared by the player and the physics. */
export const FRUIT_SLICE_FIELD_HEIGHT = 360
/** Radius (px) of a fruit circle. */
export const FRUIT_SLICE_RADIUS_PX = 30
/** Width of a fruit as a percentage of the field width. */
export const FRUIT_SLICE_WIDTH_PCT = 11
/** Game tick: the player advances physics every FRUIT_SLICE_TICK_MS. */
export const FRUIT_SLICE_TICK_MS = 50
/** Upward speed (px per tick) of a fruit at launch. */
export const FRUIT_SLICE_LAUNCH_VY = 18
/** Gravity (px per tick squared) pulling a fruit back down. */
export const FRUIT_SLICE_GRAVITY = 0.55
/** Slowest and fastest sideways drift (percent of field width per tick). */
export const FRUIT_SLICE_DRIFT_MIN_PCT = 0.3
export const FRUIT_SLICE_DRIFT_MAX_PCT = 0.9

/** Fruit emojis, one per answer fruit in a round — plain emoji, own art. */
export const FRUIT_SLICE_EMOJIS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍉', '🍑', '🥭', '🍍', '🥝'] as const
/** Juice-splash colour per fruit emoji, for the slice burst. */
export const FRUIT_SLICE_JUICE: Record<string, string> = {
  '🍎': '#ef4444',
  '🍊': '#f97316',
  '🍋': '#eab308',
  '🍇': '#8b5cf6',
  '🍓': '#f43f5e',
  '🍉': '#22c55e',
  '🍑': '#fb923c',
  '🥭': '#f59e0b',
  '🍍': '#facc15',
  '🥝': '#84cc16',
}

export type FruitSliceKind = 'answer' | 'bomb'

export interface FruitSliceFruit {
  id: number
  label: string
  kind: FruitSliceKind
  /** True only for the fruit carrying the correct answer. */
  correct: boolean
  emoji: string
  /** Juice colour for the slice burst. */
  juice: string
  /** Left edge of the fruit, percent of field width. */
  xPct: number
  /** Height (px) of the fruit centre above the bottom of the field. */
  yPx: number
  vxPct: number
  vyPx: number
  /** Ticks to wait before this fruit launches. */
  delayTicks: number
  state: 'waiting' | 'flying' | 'sliced' | 'gone'
}

export interface FruitSliceRound {
  prompt: string
  correctAnswer: string
  fruits: FruitSliceFruit[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

/** Centre of a fruit (percent) from its left edge. */
export function fruitCenterPct(fruit: FruitSliceFruit): number {
  return fruit.xPct + FRUIT_SLICE_WIDTH_PCT / 2
}

/** Highest point (px) a fruit launched at FRUIT_SLICE_LAUNCH_VY reaches. */
export function fruitApexPx(vyPx: number = FRUIT_SLICE_LAUNCH_VY): number {
  return (vyPx * vyPx) / (2 * FRUIT_SLICE_GRAVITY)
}

/**
 * One physics step for a flying fruit. `yPx` is the centre height
 * above the field bottom, `vyPx` the upward speed. Returns the next
 * state; `gone` is true on the step the fruit falls back below the
 * field bottom. Sideways drift bounces off the field walls.
 */
export function nextFruitState(fruit: FruitSliceFruit): FruitSliceFruit {
  if (fruit.state === 'waiting') {
    if (fruit.delayTicks > 0) return { ...fruit, delayTicks: fruit.delayTicks - 1 }
    return { ...fruit, state: 'flying' }
  }
  if (fruit.state !== 'flying') return fruit
  const nextVy = fruit.vyPx - FRUIT_SLICE_GRAVITY
  const nextY = fruit.yPx + nextVy
  let nextX = fruit.xPct + fruit.vxPct
  let nextVx = fruit.vxPct
  const maxX = 100 - FRUIT_SLICE_WIDTH_PCT
  if (nextX < 0) {
    nextX = 0
    nextVx = Math.abs(nextVx)
  } else if (nextX > maxX) {
    nextX = maxX
    nextVx = -Math.abs(nextVx)
  }
  if (nextY < -FRUIT_SLICE_RADIUS_PX && nextVy < 0) {
    return { ...fruit, xPct: nextX, yPx: nextY, vxPct: nextVx, vyPx: nextVy, state: 'gone' }
  }
  return { ...fruit, xPct: nextX, yPx: nextY, vxPct: nextVx, vyPx: nextVy }
}

/**
 * Distance (px) from a point to a line segment, in field pixels.
 * The segment is given in field coordinates: x in percent of the
 * field width, y in px above the field bottom.
 */
export function pointToSegmentDistancePx(
  pxPct: number,
  pyPx: number,
  x1Pct: number,
  y1Px: number,
  x2Pct: number,
  y2Px: number,
  fieldWidthPx: number,
): number {
  const px = (pxPct / 100) * fieldWidthPx
  const x1 = (x1Pct / 100) * fieldWidthPx
  const x2 = (x2Pct / 100) * fieldWidthPx
  const dx = x2 - x1
  const dy = y2Px - y1Px
  const lenSq = dx * dx + dy * dy
  // A tap is a zero-length segment: plain point distance.
  if (lenSq === 0) return Math.hypot(px - x1, pyPx - y1Px)
  let t = ((px - x1) * dx + (pyPx - y1Px) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const closestX = x1 + t * dx
  const closestY = y1Px + t * dy
  return Math.hypot(px - closestX, pyPx - closestY)
}

/**
 * True when a swipe segment (or a tap, when both ends are the same
 * point) cuts this fruit: the segment passes within the fruit's
 * radius of its centre. Sliced and gone fruits can never be cut
 * again; waiting fruits have not launched yet and cannot be cut.
 */
export function sliceHitsFruit(
  fruit: FruitSliceFruit,
  x1Pct: number,
  y1Px: number,
  x2Pct: number,
  y2Px: number,
  fieldWidthPx: number,
): boolean {
  if (fruit.state !== 'flying') return false
  const distance = pointToSegmentDistancePx(
    fruitCenterPct(fruit),
    fruit.yPx,
    x1Pct,
    y1Px,
    x2Pct,
    y2Px,
    fieldWidthPx,
  )
  return distance <= FRUIT_SLICE_RADIUS_PX
}

/** A copy of the fruits with this one sliced (gone from play). */
export function sliceFruit(fruits: FruitSliceFruit[], id: number): FruitSliceFruit[] {
  return fruits.map((f) => (f.id === id ? { ...f, state: 'sliced' as const } : f))
}

/** True when the correct fruit escaped the field unsliced. */
export function correctFruitEscaped(fruits: FruitSliceFruit[]): boolean {
  return fruits.some((f) => f.correct && f.state === 'gone')
}

/** True when the round has no fruit left flying or waiting. */
export function noFruitsLeft(fruits: FruitSliceFruit[]): boolean {
  return fruits.every((f) => f.state === 'sliced' || f.state === 'gone')
}

/**
 * Wrong answers borrowed from the game's other items: distinct
 * answers that differ from this round's correct answer, shuffled,
 * at most FRUIT_SLICE_MAX_WRONGS. Empty when the game has no
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
  return wrongs.slice(0, FRUIT_SLICE_MAX_WRONGS)
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
 * borrow — a round with only the correct fruit has no choice in
 * it. The answer fruits (correct + wrongs) get distinct fruit
 * emojis and staggered launches from spread-out start columns, so
 * the correct fruit flies from a different place every round.
 * Exactly one bomb fruit launches with them.
 */
export function buildFruitSliceRound(
  prompt: string,
  answer: string,
  wrongAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): FruitSliceRound | null {
  const correctAnswer = (answer ?? '').trim()
  if (!prompt || !correctAnswer || wrongAnswers.length === 0) return null
  const labels = shuffled([correctAnswer, ...wrongAnswers])
  const emojis = shuffled([...FRUIT_SLICE_EMOJIS])
  // Spread-out launch columns, shuffled so no fruit owns a spot.
  const columns = shuffled([6, 28, 50, 72])
  const delays = [0, 8, 16, 24]
  const fruits: FruitSliceFruit[] = labels.map((label, i) => {
    const drift =
      FRUIT_SLICE_DRIFT_MIN_PCT +
      Math.random() * (FRUIT_SLICE_DRIFT_MAX_PCT - FRUIT_SLICE_DRIFT_MIN_PCT)
    return {
      id: i,
      label,
      kind: 'answer' as const,
      correct: label === correctAnswer,
      emoji: emojis[i % emojis.length],
      juice: FRUIT_SLICE_JUICE[emojis[i % emojis.length]] ?? '#ef4444',
      xPct: columns[i % columns.length],
      yPx: FRUIT_SLICE_RADIUS_PX,
      vxPct: (Math.random() < 0.5 ? -1 : 1) * drift,
      vyPx: FRUIT_SLICE_LAUNCH_VY + (Math.random() * 2 - 1),
      delayTicks: delays[i % delays.length],
      state: 'waiting' as const,
    }
  })
  // The bomb: one per round, its own launch slot after the fruits.
  const bombDrift =
    FRUIT_SLICE_DRIFT_MIN_PCT +
    Math.random() * (FRUIT_SLICE_DRIFT_MAX_PCT - FRUIT_SLICE_DRIFT_MIN_PCT)
  fruits.push({
    id: labels.length,
    label: '💣',
    kind: 'bomb',
    correct: false,
    emoji: '💣',
    juice: '#1f2937',
    xPct: shuffled([14, 40, 62, 82])[0],
    yPx: FRUIT_SLICE_RADIUS_PX,
    vxPct: (Math.random() < 0.5 ? -1 : 1) * bombDrift,
    vyPx: FRUIT_SLICE_LAUNCH_VY + (Math.random() * 2 - 1),
    delayTicks: delays[labels.length % delays.length] + 8,
    state: 'waiting',
  })
  return { prompt, correctAnswer, fruits, imageUrl, imageCredit }
}
