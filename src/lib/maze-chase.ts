/**
 * Maze Chase — pure maze-chase logic (no React, no sound, no storage).
 *
 * EduPlay's own maze-chase game (type 41): the kid steers our own
 * chaser through a maze to EAT the pellet with the correct answer,
 * while a ghost hunts the chaser down. Pac-Man-STYLE mechanic only:
 * the name, the chaser, the ghost, and the maze are all EduPlay's
 * own — no Pac-Man name, no Pac-Man art, no yellow wedge character.
 * Our chaser is a full teal circle with eyes and a smile; our
 * ghost is a lilac sheet ghost drawn in SVG by the component.
 * Nothing here invents content: prompts, correct answers, and
 * distractors all come from the game's real items; this module
 * only lays them out and moves the pieces.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, 10 points per correct round, score out of 10 x rounds.
 * - One round per question. A round ends when the chaser eats the
 *   correct pellet (+10), or when its 45-second timer runs out
 *   (-1 life, round skipped). Eating a wrong pellet costs 1 life
 *   and consumes that pellet, so one wrong pellet can never cost
 *   two lives; the round continues until the correct pellet is
 *   eaten. The ghost steps toward the chaser every 800 ms; if it
 *   catches the chaser (either piece moves onto the other's cell),
 *   that costs 1 life and both pieces respawn at their starts.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win. The maze layout is fixed, so every open cell is
 *   reachable: pellet placement runs a BFS from the start and only
 *   places pellets on reachable cells, with the correct pellet
 *   always placed first (farthest reachable cell), so a round can
 *   never be unwinnable because of the layout. The ghost also
 *   moves by BFS, so it can always reach the chaser — it never
 *   gets stuck behind a wall.
 */

export const MAZE_CHASE_LIVES = 3
export const MAZE_CHASE_ROUND_SECONDS = 45
export const MAZE_CHASE_WARNING_SECONDS = 5
export const MAZE_CHASE_COLS = 9
export const MAZE_CHASE_ROWS = 9
export const MAZE_CHASE_GHOST_STEP_MS = 800

/** '.' = open floor, '#' = wall. Own layout, different from Maze
 *  Run's: open lanes with wall blocks, so the chase can flow. */
export const MAZE_CHASE_LAYOUT: string[] = [
  '........#',
  '.##.###.#',
  '.#.....#.',
  '.#.###.#.',
  '...#.....',
  '##.#.##.#',
  '....#....',
  '.####.##.',
  '.........',
]

export interface MazeChasePos {
  row: number
  col: number
}

export interface MazeChasePellet {
  answer: string
  isCorrect: boolean
  row: number
  col: number
}

export interface MazeChaseRound {
  prompt: string
  correctAnswer: string
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
  /** walls[row][col] === true means the cell blocks movement. */
  walls: boolean[][]
  start: MazeChasePos
  ghostStart: MazeChasePos
  pellets: MazeChasePellet[]
}

export type MazeChaseDir = 'up' | 'down' | 'left' | 'right'

const DIR_DELTA: Record<MazeChaseDir, MazeChasePos> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
}

export function mazeChaseWalls(): boolean[][] {
  return MAZE_CHASE_LAYOUT.map((row) => row.split('').map((c) => c === '#'))
}

/** All open cells reachable from `start`, with BFS distance, sorted
 *  by distance ascending (ties: row, then col, so placement is
 *  deterministic for a fixed layout). */
export function mazeChaseReachable(
  walls: boolean[][],
  start: MazeChasePos,
): { pos: MazeChasePos; distance: number }[] {
  const rows = walls.length
  const cols = walls[0]?.length ?? 0
  const seen = new Set<string>([`${start.row},${start.col}`])
  const queue: { pos: MazeChasePos; distance: number }[] = [{ pos: start, distance: 0 }]
  const out: { pos: MazeChasePos; distance: number }[] = []
  while (queue.length > 0) {
    const cur = queue.shift()!
    out.push(cur)
    for (const dir of ['up', 'down', 'left', 'right'] as MazeChaseDir[]) {
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
 * Build one round. `answers` carries the full pellet list already
 * shuffled; this function guarantees the CORRECT pellet is placed
 * (farthest reachable cell) and every other pellet lands on a
 * distinct reachable cell. The ghost starts on the second-farthest
 * reachable cell — far from the chaser, close to the goal, so the
 * hunt is real but the kid has room to move. If the maze ever
 * offered fewer reachable cells than pellets, extra pellets are
 * dropped — but the correct pellet is never the dropped one.
 * Returns null when there is no correct answer to place.
 */
export function buildMazeChaseRound(
  prompt: string,
  answers: { answer: string; isCorrect: boolean }[],
  imageUrl?: string,
  imageCredit?: string,
): MazeChaseRound | null {
  const correct = answers.find((a) => a.isCorrect)
  if (!correct || !correct.answer) return null
  const walls = mazeChaseWalls()
  const start: MazeChasePos = { row: 0, col: 0 }
  const reachable = mazeChaseReachable(walls, start).filter(
    (r) => !(r.pos.row === start.row && r.pos.col === start.col),
  )
  if (reachable.length === 0) return null
  const pellets: MazeChasePellet[] = []
  const used = new Set<string>()
  // Correct pellet first, farthest reachable cell: the hunt has a goal.
  const farthest = reachable[reachable.length - 1]
  pellets.push({ answer: correct.answer, isCorrect: true, row: farthest.pos.row, col: farthest.pos.col })
  used.add(`${farthest.pos.row},${farthest.pos.col}`)
  // Ghost start: second-farthest reachable cell, never on a pellet.
  const ghostCell = reachable[reachable.length - 2] ?? farthest
  const ghostStart: MazeChasePos = { row: ghostCell.pos.row, col: ghostCell.pos.col }
  used.add(`${ghostStart.row},${ghostStart.col}`)
  // Distractors spread across the remaining reachable cells.
  const rest = reachable.filter((r) => !used.has(`${r.pos.row},${r.pos.col}`))
  const distractors = answers.filter((a) => !a.isCorrect && a.answer)
  for (let i = 0; i < distractors.length && rest.length > 0; i++) {
    const idx = Math.floor(((i + 0.5) * rest.length) / distractors.length)
    const cell = rest.splice(Math.min(idx, rest.length - 1), 1)[0]
    pellets.push({ answer: distractors[i].answer, isCorrect: false, row: cell.pos.row, col: cell.pos.col })
  }
  return { prompt, correctAnswer: correct.answer, imageUrl, imageCredit, walls, start, ghostStart, pellets }
}

/**
 * One step for the chaser. Walls and the board edge block movement:
 * the chaser stays put (no penalty for bumping a wall). Pure, so
 * the rule is testable without rendering.
 */
export function moveChaser(walls: boolean[][], pos: MazeChasePos, dir: MazeChaseDir): MazeChasePos {
  const d = DIR_DELTA[dir]
  const next = { row: pos.row + d.row, col: pos.col + d.col }
  if (next.row < 0 || next.row >= walls.length) return pos
  if (next.col < 0 || next.col >= (walls[0]?.length ?? 0)) return pos
  if (walls[next.row][next.col]) return pos
  return next
}

/**
 * One ghost step toward the chaser: BFS from the ghost to the
 * target, return the first cell on the shortest path. If no path
 * exists (or the ghost is already on the target), the ghost stays
 * put. Pure, so the hunt is testable without rendering.
 */
export function ghostNextStep(walls: boolean[][], ghost: MazeChasePos, target: MazeChasePos): MazeChasePos {
  if (ghost.row === target.row && ghost.col === target.col) return ghost
  const rows = walls.length
  const cols = walls[0]?.length ?? 0
  const key = (p: MazeChasePos) => `${p.row},${p.col}`
  const prev = new Map<string, MazeChasePos>()
  const seen = new Set<string>([key(ghost)])
  const queue: MazeChasePos[] = [ghost]
  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur.row === target.row && cur.col === target.col) {
      // Walk back from the target to the ghost's next step.
      let step = cur
      while (prev.get(key(step)) && !(prev.get(key(step))!.row === ghost.row && prev.get(key(step))!.col === ghost.col)) {
        step = prev.get(key(step))!
      }
      return step
    }
    for (const dir of ['up', 'down', 'left', 'right'] as MazeChaseDir[]) {
      const d = DIR_DELTA[dir]
      const next = { row: cur.row + d.row, col: cur.col + d.col }
      if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols) continue
      if (walls[next.row][next.col]) continue
      if (seen.has(key(next))) continue
      seen.add(key(next))
      prev.set(key(next), cur)
      queue.push(next)
    }
  }
  return ghost
}

/** Manhattan distance between two cells — the ghost's hunt, in one number. */
export function mazeChaseDistance(a: MazeChasePos, b: MazeChasePos): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}
