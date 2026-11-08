/**
 * Bomb Maze — pure bomb-maze logic (no React, no sound, no storage).
 *
 * EduPlay's own maze game (type 64): the kid steers our own
 * explorer through a maze to reach the golden goal gate. Answer
 * stars wait in the maze — collecting the star with the correct
 * answer unlocks the goal, and reaching the goal wins the round.
 * Sleepy bombs are gentle obstacles: touching one never costs a
 * life and never fails the round — it just bounces the explorer
 * back to the start with a soft "boop" and a kind "oops, try
 * another way". No scary imagery anywhere: the bombs are round,
 * sleepy, and smiling, and every message is kind.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, 10 points per correct round, score out of 10 x rounds.
 * - One round per question. A round ends when the explorer reaches
 *   the goal after unlocking it with the correct star (+10), or
 *   when its 45-second timer runs out (-1 life, round skipped).
 * - Collecting a WRONG star pops it with a gentle "oops" — it
 *   costs no life and the round goes on, but that star is gone
 *   so it can never be collected twice. The correct star is the
 *   only one that unlocks the goal; the goal stays locked until
 *   it is collected, and stepping onto a locked goal does
 *   nothing (no penalty).
 * - Touching a sleepy bomb bounces the explorer back to the
 *   round's start (the last safe spot) — no life lost, no
 *   points lost, the round goes on. Bombs never move and never
 *   chase.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win. The maze layout is fixed, so every open cell is
 *   reachable: star, bomb, and goal placement runs a BFS from
 *   the start and only places things on reachable cells, with
 *   the goal always on the farthest reachable cell and the
 *   correct star always placed (a mid-distance cell), so a
 *   round can never be unwinnable because of the layout.
 */

export const BOMB_MAZE_LIVES = 3
export const BOMB_MAZE_ROUND_SECONDS = 45
export const BOMB_MAZE_WARNING_SECONDS = 5
export const BOMB_MAZE_COLS = 9
export const BOMB_MAZE_ROWS = 9
export const BOMB_MAZE_BOMBS = 3
export const BOMB_MAZE_MAX_ROUNDS = 10

/** '.' = open floor, '#' = wall. Own layout, different from Maze
 *  Chase's and Maze Run's: open lanes with wall blocks, so the
 *  walk to the goal can flow around the sleepy bombs. */
export const BOMB_MAZE_LAYOUT: string[] = [
  '....#....',
  '.##.#.##.',
  '.#.....#.',
  '.#.###.#.',
  '...#...#.',
  '##.#.##..',
  '....#....',
  '.####.##.',
  '.........',
]

export interface BombMazePos {
  row: number
  col: number
}

export interface BombMazeStar {
  answer: string
  isCorrect: boolean
  row: number
  col: number
}

export interface BombMazeRound {
  prompt: string
  correctAnswer: string
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
  /** walls[row][col] === true means the cell blocks movement. */
  walls: boolean[][]
  start: BombMazePos
  /** The golden goal gate — farthest reachable cell from start. */
  goal: BombMazePos
  stars: BombMazeStar[]
  /** Sleepy bombs — gentle obstacles, never on the start, the
   *  goal, or a star. */
  bombs: BombMazePos[]
}

export type BombMazeDir = 'up' | 'down' | 'left' | 'right'

const DIR_DELTA: Record<BombMazeDir, BombMazePos> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
}

export function bombMazeWalls(): boolean[][] {
  return BOMB_MAZE_LAYOUT.map((row) => row.split('').map((c) => c === '#'))
}

/** All open cells reachable from `start`, with BFS distance, sorted
 *  by distance ascending (ties: row, then col, so placement is
 *  deterministic for a fixed layout). */
export function bombMazeReachable(
  walls: boolean[][],
  start: BombMazePos,
): { pos: BombMazePos; distance: number }[] {
  const rows = walls.length
  const cols = walls[0]?.length ?? 0
  const seen = new Set<string>([`${start.row},${start.col}`])
  const queue: { pos: BombMazePos; distance: number }[] = [{ pos: start, distance: 0 }]
  const out: { pos: BombMazePos; distance: number }[] = []
  while (queue.length > 0) {
    const cur = queue.shift()!
    out.push(cur)
    for (const dir of ['up', 'down', 'left', 'right'] as BombMazeDir[]) {
      const d = DIR_DELTA[dir]
      const next = { row: cur.pos.row + d.row, col: cur.pos.col + d.col }
      if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols) continue
      if (walls[next.row][next.col]) continue
      const key = `${next.row},${next.col}`
      if (seen.has(key)) continue
      seen.add(key)
      queue.push({ pos: next, distance: cur.distance + 1 })
    }
  }
  out.sort((a, b) => a.distance - b.distance || a.pos.row - b.pos.row || a.pos.col - b.pos.col)
  return out
}

/**
 * Build one round. `answers` carries the full star list already
 * shuffled; this function guarantees the CORRECT star is placed
 * (a mid-distance reachable cell) and every other star lands on
 * a distinct reachable cell. The goal sits on the farthest
 * reachable cell. Sleepy bombs spread across the remaining
 * reachable cells — never on the start, the goal, or a star.
 * If the maze ever offered fewer reachable cells than stars and
 * bombs, extra wrong stars and bombs are dropped — but the
 * correct star and the goal are never the dropped ones.
 * Returns null when there is no correct answer to place.
 */
export function buildBombMazeRound(
  prompt: string,
  answers: { answer: string; isCorrect: boolean }[],
  imageUrl?: string,
  imageCredit?: string,
): BombMazeRound | null {
  const correct = answers.find((a) => a.isCorrect)
  if (!prompt || !correct || !correct.answer) return null
  const walls = bombMazeWalls()
  const start: BombMazePos = { row: 0, col: 0 }
  const reachable = bombMazeReachable(walls, start).filter(
    (r) => !(r.pos.row === start.row && r.pos.col === start.col),
  )
  if (reachable.length === 0) return null
  // Goal: farthest reachable cell — the walk has a destination.
  const goalCell = reachable[reachable.length - 1]
  const goal: BombMazePos = { row: goalCell.pos.row, col: goalCell.pos.col }
  const used = new Set<string>([`${goal.row},${goal.col}`])
  const stars: BombMazeStar[] = []
  // Correct star first, at a mid-distance cell: the kid must walk
  // to find it, then walk on to the goal — never next to the start.
  const mid = reachable[Math.floor(reachable.length / 2)]
  stars.push({ answer: correct.answer, isCorrect: true, row: mid.pos.row, col: mid.pos.col })
  used.add(`${mid.pos.row},${mid.pos.col}`)
  // Wrong stars spread across the remaining reachable cells.
  const rest = reachable.filter((r) => !used.has(`${r.pos.row},${r.pos.col}`))
  const distractors = answers.filter((a) => !a.isCorrect && a.answer)
  for (let i = 0; i < distractors.length && rest.length > 0; i++) {
    const idx = Math.floor(((i + 0.5) * rest.length) / distractors.length)
    const cell = rest.splice(Math.min(idx, rest.length - 1), 1)[0]
    stars.push({ answer: distractors[i].answer, isCorrect: false, row: cell.pos.row, col: cell.pos.col })
    used.add(`${cell.pos.row},${cell.pos.col}`)
  }
  // Sleepy bombs on the cells still free — gentle obstacles on the
  // way to the goal, never blocking the start, the goal, or a star.
  const bombs: BombMazePos[] = []
  const free = reachable.filter((r) => !used.has(`${r.pos.row},${r.pos.col}`))
  for (let i = 0; i < BOMB_MAZE_BOMBS && free.length > 0; i++) {
    const idx = Math.floor(((i + 0.5) * free.length) / BOMB_MAZE_BOMBS)
    const cell = free.splice(Math.min(idx, free.length - 1), 1)[0]
    bombs.push({ row: cell.pos.row, col: cell.pos.col })
  }
  return { prompt, correctAnswer: correct.answer, imageUrl, imageCredit, walls, start, goal, stars, bombs }
}

/**
 * Borrow distinct wrong answers from the game's other items —
 * trimmed, never the correct answer, never duplicated, never
 * mutating the caller's array. At most 3 (one per wrong star).
 */
export function borrowBombMazeWrongAnswers(
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
  return wrongs.slice(0, 3)
}

/**
 * Convert-friendly round builder: the (prompt, correct answer,
 * other answers) shape convert.ts uses for every type. Returns
 * null when the game cannot lend at least two different wrong
 * answers — the convert gate for this type.
 */
export function buildBombMazeRoundForConvert(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): BombMazeRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  const wrongs = borrowBombMazeWrongAnswers(otherAnswers, clean)
  if (wrongs.length < 2) return null
  return buildBombMazeRound(
    prompt,
    [
      { answer: clean, isCorrect: true },
      ...wrongs.map((a) => ({ answer: a, isCorrect: false })),
    ],
    imageUrl,
    imageCredit,
  )
}

/**
 * One step for the explorer. Walls and the board edge block
 * movement: the explorer stays put (no penalty for bumping a
 * wall). Pure, so the rule is testable without rendering.
 */
export function moveExplorer(walls: boolean[][], pos: BombMazePos, dir: BombMazeDir): BombMazePos {
  const d = DIR_DELTA[dir]
  const next = { row: pos.row + d.row, col: pos.col + d.col }
  if (next.row < 0 || next.row >= walls.length) return pos
  if (next.col < 0 || next.col >= (walls[0]?.length ?? 0)) return pos
  if (walls[next.row][next.col]) return pos
  return next
}

/** True when `pos` holds a sleepy bomb in this round. */
export function isBombCell(round: BombMazeRound, pos: BombMazePos): boolean {
  return round.bombs.some((b) => b.row === pos.row && b.col === pos.col)
}

/** The star on `pos`, if any (popped stars are the caller's job —
 *  this only looks the round up). */
export function starAtCell(round: BombMazeRound, pos: BombMazePos): BombMazeStar | undefined {
  return round.stars.find((s) => s.row === pos.row && s.col === pos.col)
}

/** Manhattan distance between two cells. */
export function bombMazeDistance(a: BombMazePos, b: BombMazePos): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}
