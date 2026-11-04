/**
 * Maze Run — pure maze logic (no React, no sound, no storage).
 *
 * EduPlay's own maze game: the player moves a star through a maze
 * and steps on the CORRECT answer tile for the shown question.
 * Wrong-answer tiles cost a life each and are then consumed, so
 * one wrong tile can never cost two lives. Nothing here invents
 * content: prompts, correct answers, and distractors all come
 * from the game's real items; this module only lays them out.
 *
 * Rules (the component renders these, this module proves them):
 * - 5 lives, 10 points per correct round, score out of 10 x rounds.
 * - One round per question. A round ends when the player steps on
 *   the correct tile (+10), or when its 60-second timer runs out
 *   (-1 life, round skipped). Stepping on a wrong tile costs 1
 *   life and consumes that tile; the round continues.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win. The maze layout is fixed, so every open cell is
 *   reachable: tile placement runs a BFS from the start and only
 *   places tiles on reachable cells, with the correct tile always
 *   placed first (farthest reachable cell), so a round can never
 *   be unwinnable because of the layout.
 */

export const MAZE_RUN_LIVES = 5
export const MAZE_RUN_ROUND_SECONDS = 60
export const MAZE_RUN_WARNING_SECONDS = 5
export const MAZE_RUN_COLS = 9
export const MAZE_RUN_ROWS = 9

/** '.' = open floor, '#' = wall. Borders are open on purpose: the
 *  player enters at the top-left and the maze walls sit inside. */
export const MAZE_LAYOUT: string[] = [
  '...#.....',
  '.#.#.###.',
  '.#.....#.',
  '.####.#..',
  '....#.#..',
  '##.##.#.#',
  '...#.....',
  '.#.#.###.',
  '........#',
]

export interface MazePos {
  row: number
  col: number
}

export interface MazeTile {
  answer: string
  isCorrect: boolean
  row: number
  col: number
}

export interface MazeRound {
  prompt: string
  correctAnswer: string
  /** walls[row][col] === true means the cell blocks movement. */
  walls: boolean[][]
  start: MazePos
  tiles: MazeTile[]
}

export type MazeDir = 'up' | 'down' | 'left' | 'right'

const DIR_DELTA: Record<MazeDir, MazePos> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
}

export function mazeWalls(): boolean[][] {
  return MAZE_LAYOUT.map((row) => row.split('').map((c) => c === '#'))
}

/** All open cells reachable from `start`, with BFS distance, sorted
 *  by distance ascending (ties: row, then col, so placement is
 *  deterministic for a fixed layout). */
export function mazeReachable(
  walls: boolean[][],
  start: MazePos,
): { pos: MazePos; distance: number }[] {
  const rows = walls.length
  const cols = walls[0]?.length ?? 0
  const seen = new Set<string>([`${start.row},${start.col}`])
  const queue: { pos: MazePos; distance: number }[] = [{ pos: start, distance: 0 }]
  const out: { pos: MazePos; distance: number }[] = []
  while (queue.length > 0) {
    const cur = queue.shift()!
    out.push(cur)
    for (const dir of ['up', 'down', 'left', 'right'] as MazeDir[]) {
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
 * Build one round. `answers` carries the correct answer first? No:
 * callers pass the full tile list already shuffled; this function
 * guarantees the CORRECT tile is placed (farthest reachable cell)
 * and every other tile lands on a distinct reachable cell. If the
 * maze ever offered fewer reachable cells than tiles, extra tiles
 * are dropped — but the correct tile is never the dropped one.
 * Returns null when there is no correct answer to place.
 */
export function buildMazeRound(
  prompt: string,
  answers: { answer: string; isCorrect: boolean }[],
): MazeRound | null {
  const correct = answers.find((a) => a.isCorrect)
  if (!correct || !correct.answer) return null
  const walls = mazeWalls()
  const start: MazePos = { row: 0, col: 0 }
  const reachable = mazeReachable(walls, start).filter(
    (r) => !(r.pos.row === start.row && r.pos.col === start.col),
  )
  if (reachable.length === 0) return null
  const tiles: MazeTile[] = []
  const used = new Set<string>()
  // Correct tile first, farthest reachable cell: the hunt has a goal.
  const farthest = reachable[reachable.length - 1]
  tiles.push({ answer: correct.answer, isCorrect: true, row: farthest.pos.row, col: farthest.pos.col })
  used.add(`${farthest.pos.row},${farthest.pos.col}`)
  // Distractors spread across the remaining reachable cells.
  const rest = reachable.filter((r) => !used.has(`${r.pos.row},${r.pos.col}`))
  const distractors = answers.filter((a) => !a.isCorrect && a.answer)
  for (let i = 0; i < distractors.length && rest.length > 0; i++) {
    const idx = Math.floor(((i + 0.5) * rest.length) / distractors.length)
    const cell = rest.splice(Math.min(idx, rest.length - 1), 1)[0]
    tiles.push({ answer: distractors[i].answer, isCorrect: false, row: cell.pos.row, col: cell.pos.col })
  }
  return { prompt, correctAnswer: correct.answer, walls, start, tiles }
}

/**
 * One step. Walls and the board edge block movement: the player
 * stays put (no penalty for bumping a wall). Pure, so the rule is
 * testable without rendering.
 */
export function movePlayer(walls: boolean[][], pos: MazePos, dir: MazeDir): MazePos {
  const d = DIR_DELTA[dir]
  const next = { row: pos.row + d.row, col: pos.col + d.col }
  if (next.row < 0 || next.row >= walls.length) return pos
  if (next.col < 0 || next.col >= (walls[0]?.length ?? 0)) return pos
  if (walls[next.row][next.col]) return pos
  return next
}
