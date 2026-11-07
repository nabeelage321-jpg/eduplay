/**
 * Number Merge — pure sliding-merge logic (no React, no sound,
 * no storage).
 *
 * EduPlay's own 2048-STYLE sliding-merge game (type 57):
 * slide numbered tiles on a 4x4 board and two equal tiles merge
 * into their sum. 2048-STYLE mechanic only: the name is
 * EduPlay's own, the tiles are plain rounded squares with
 * numbers drawn here in our own colours — no 2048 name, no
 * 2048 tiles, and no Gabriele Cirulli art copied. Nothing here
 * invents content: every tile value is a real sum of two equal
 * tiles actually merged on the board, and every merge shows
 * its own equation (4 + 4 = 8).
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per TARGET REACHED (one target per
 *   round, up to 10 rounds). Score out of 10 x rounds.
 * - The board is 4 x 4 = 16 squares. Each round has a target
 *   number, doubling every round: 8, 16, 32, 64, 128, 256,
 *   512, 1024, 2048, 4096. Reaching the target tile clears
 *   the board and the round is won.
 * - ADAPTATION, STATED PLAINLY: a classic board starts with
 *   two 2s, so a late target like 2048 would take hundreds of
 *   slides and a kid would never finish 10 rounds. Each round
 *   here therefore starts with six tiles whose values add up
 *   to exactly the target — two of target/4 and four of
 *   target/8 (round 1, target 8: four 2s) — placed on random
 *   squares. The round is still won only by sliding and
 *   merging, and every slide still spawns a new 2 (usually)
 *   or 4, which can help or clog the board. A round takes
 *   minutes at any target, never hundreds of slides.
 * - A slide moves every tile as far as it goes in that
 *   direction; two equal tiles that meet merge into their sum
 *   (4 + 4 = 8). A tile merged in a slide cannot merge again
 *   in the same slide: [4, 4, 4, 4] slides to [8, 8], never
 *   [16]. A slide that moves nothing spawns nothing.
 * - After a slide that moved, one new tile spawns on a random
 *   empty square: a 2 nine times in ten, a 4 one time in ten.
 * - The round is won the moment a tile equal to the target
 *   appears. It cannot be overshot: making a bigger tile
 *   needs two target tiles first, and the first one already
 *   wins the round. The seed never contains the target or
 *   anything bigger, and spawns are only 2 or 4.
 * - The board is STUCK when it is full and no two neighbours
 *   are equal in any direction — no slide can change it. A
 *   stuck board ends the round at once and costs 1 life (the
 *   component applies the life), and the round restarts with
 *   a fresh seeded board and the same target.
 * - A slide in a direction where nothing moves is a no-op:
 *   nothing spawns, nothing is lost, the kid just slides
 *   another way.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win.
 * - The board IS the question: no text question is asked and
 *   no game item is needed to play — the numbers on the tiles
 *   are the maths, and every merge confirms its sum. A game
 *   with no items still plays.
 */

export const NUMBER_MERGE_LIVES = 3
export const NUMBER_MERGE_MAX_ROUNDS = 10
/** Points for reaching one round's target number. */
export const NUMBER_MERGE_POINTS_PER_TARGET = 10
export const NUMBER_MERGE_ROWS = 4
export const NUMBER_MERGE_COLS = 4
export const NUMBER_MERGE_CELLS =
  NUMBER_MERGE_ROWS * NUMBER_MERGE_COLS
/** The target number of each round, doubling every round. */
export const NUMBER_MERGE_TARGETS = [
  8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096,
] as const
/** A new tile is a 4 this often, a 2 the rest of the time. */
export const NUMBER_MERGE_SPAWN_FOUR_CHANCE = 0.1
/** Tiles the board starts with in every round. */
export const NUMBER_MERGE_SEED_COUNT = 6

export type NumberMergeDirection = 'up' | 'down' | 'left' | 'right'

/** The board: one entry per square, null for an empty square. */
export type NumberMergeBoard = (number | null)[]

/** One merge from a slide: two `from` tiles became `to`. */
export interface NumberMergeMerge {
  /** The value of each of the two tiles that merged. */
  from: number
  /** Their sum — the tile that now sits on the board. */
  to: number
}

export type NumberMergeStatus = 'playing' | 'won' | 'out'

/** What the last slide resolved to — the component turns
 *  it into feedback and sounds. */
export type NumberMergeEvent =
  | { kind: 'slid'; merges: NumberMergeMerge[] }
  | { kind: 'no-move' }
  | { kind: 'target-reached'; merges: NumberMergeMerge[] }
  | { kind: 'board-full' }
  | null

/** The live state of one round. */
export interface NumberMergeState {
  target: number
  board: NumberMergeBoard
  /** Slides made in this round. */
  moves: number
  status: NumberMergeStatus
  lastEvent: NumberMergeEvent
  /** The merges of the last slide — the merge feed shows them. */
  lastMerges: NumberMergeMerge[]
}

function shuffled<T>(arr: T[], random: () => number = Math.random): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

/** The target number of a round (0-based; past the ladder it
 *  stays at the last target, 4096). */
export function numberMergeTargetForRound(roundIndex: number): number {
  const at = NUMBER_MERGE_TARGETS[Math.min(Math.max(0, roundIndex), NUMBER_MERGE_TARGETS.length - 1)]
  return at ?? 4096
}

/**
 * The tiles a round starts with: six values that add up to
 * exactly the target — two of target/4 and four of target/8
 * (round 1, target 8: four 2s — the formula would give 1s
 * for the eighths, and 1-tiles are not used, so the four 2s
 * stand in their place and still add to 8).
 * Never the target itself, never anything bigger.
 */
export function numberMergeSeedTiles(target: number): number[] {
  if (target <= 8) return [2, 2, 2, 2]
  const quarter = target / 4
  const eighth = target / 8
  return [quarter, quarter, eighth, eighth, eighth, eighth]
}

/** The biggest tile on the board (0 when the board is empty). */
export function numberMergeMaxTile(board: NumberMergeBoard): number {
  let max = 0
  for (const v of board) {
    if (v !== null && v > max) max = v
  }
  return max
}

/**
 * Is there any slide that can change this board — an empty
 * square, or two equal neighbours in a row or a column?
 * A full board with no equal neighbours is stuck.
 */
export function numberMergeHasMoves(board: NumberMergeBoard): boolean {
  for (let i = 0; i < NUMBER_MERGE_CELLS; i++) {
    if (board[i] === null) return true
    const row = Math.floor(i / NUMBER_MERGE_COLS)
    const col = i % NUMBER_MERGE_COLS
    if (col + 1 < NUMBER_MERGE_COLS && board[i + 1] === board[i]) return true
    if (row + 1 < NUMBER_MERGE_ROWS && board[i + NUMBER_MERGE_COLS] === board[i]) return true
  }
  return false
}

/**
 * Slide one row or column leftwards: tiles pack to the left,
 * equal neighbours merge into their sum, and a tile merged
 * in this slide cannot merge again in it. Pure — tests slide
 * known lines with it.
 */
export function slideNumberMergeLine(
  line: (number | null)[],
): { line: (number | null)[]; merges: NumberMergeMerge[] } {
  const tiles = line.filter((v): v is number => v !== null)
  const out: (number | null)[] = []
  const merges: NumberMergeMerge[] = []
  let i = 0
  while (i < tiles.length) {
    const current = tiles[i]!
    if (i + 1 < tiles.length && tiles[i + 1] === current) {
      // Two equal tiles meet: one tile of their sum, and the
      // next tile is skipped — it cannot merge again.
      out.push(current * 2)
      merges.push({ from: current, to: current * 2 })
      i += 2
    } else {
      out.push(current)
      i += 1
    }
  }
  while (out.length < line.length) out.push(null)
  return { line: out, merges }
}

/**
 * Slide the whole board in a direction, without spawning.
 * Returns the new board, the merges that happened, and
 * whether anything moved at all. Pure.
 */
export function slideNumberMergeBoard(
  board: NumberMergeBoard,
  direction: NumberMergeDirection,
): { board: NumberMergeBoard; merges: NumberMergeMerge[]; moved: boolean } {
  const next: NumberMergeBoard = [...board]
  const merges: NumberMergeMerge[] = []
  // Read each line in the direction of travel, slide it
  // leftwards, then write it back the same way round.
  const lines: number[][] = []
  if (direction === 'left' || direction === 'right') {
    for (let r = 0; r < NUMBER_MERGE_ROWS; r++) {
      const cells: number[] = []
      for (let c = 0; c < NUMBER_MERGE_COLS; c++) cells.push(r * NUMBER_MERGE_COLS + c)
      lines.push(direction === 'left' ? cells : [...cells].reverse())
    }
  } else {
    for (let c = 0; c < NUMBER_MERGE_COLS; c++) {
      const cells: number[] = []
      for (let r = 0; r < NUMBER_MERGE_ROWS; r++) cells.push(r * NUMBER_MERGE_COLS + c)
      lines.push(direction === 'up' ? cells : [...cells].reverse())
    }
  }
  for (const cells of lines) {
    const line = cells.map((i) => board[i]!)
    const slid = slideNumberMergeLine(line)
    merges.push(...slid.merges)
    cells.forEach((cell, at) => {
      next[cell] = slid.line[at]!
    })
  }
  const moved = next.some((v, i) => v !== board[i])
  return { board: next, merges, moved }
}

/**
 * Spawn one new tile on a random empty square: a 2 nine times
 * in ten, a 4 one time in ten. Returns null when the board is
 * full. `random` is injectable so tests can pass a seeded
 * source; it defaults to Math.random.
 */
export function spawnNumberMergeTile(
  board: NumberMergeBoard,
  random: () => number = Math.random,
): { board: NumberMergeBoard; cell: number; value: number } | null {
  const empty: number[] = []
  for (let i = 0; i < NUMBER_MERGE_CELLS; i++) {
    if (board[i] === null) empty.push(i)
  }
  if (empty.length === 0) return null
  const cell = empty[Math.floor(random() * empty.length)]!
  const value = random() < NUMBER_MERGE_SPAWN_FOUR_CHANCE ? 4 : 2
  const next = [...board]
  next[cell] = value
  return { board: next, cell, value }
}

/** A fresh round: the seeded board for its target, no moves yet. */
export function newNumberMergeRound(
  target: number,
  random: () => number = Math.random,
): NumberMergeState {
  const board: NumberMergeBoard = Array<null>(NUMBER_MERGE_CELLS).fill(null)
  const cells = shuffled(
    Array.from({ length: NUMBER_MERGE_CELLS }, (_, i) => i),
    random,
  )
  const seed = numberMergeSeedTiles(target)
  seed.forEach((value, at) => {
    board[cells[at]!] = value
  })
  return {
    target,
    board,
    moves: 0,
    status: 'playing',
    lastEvent: null,
    lastMerges: [],
  }
}

/** One round of the ladder, by round number (0-based). */
export function buildNumberMergeRound(roundIndex: number): { target: number } {
  return { target: numberMergeTargetForRound(roundIndex) }
}

/**
 * Slide the board in a direction. Pure.
 *
 * A slide that moves nothing changes nothing: no spawn, no
 * life lost, the kid just slides another way. Otherwise one
 * new tile spawns, then the round is judged: a tile equal to
 * the target wins the round at once (no spawn is needed after
 * a winning slide, so none is placed); a board with no moves
 * left ends the round at once and costs a life (the component
 * applies the life).
 */
export function slideNumberMerge(
  state: NumberMergeState,
  direction: NumberMergeDirection,
  random: () => number = Math.random,
): NumberMergeState {
  if (state.status !== 'playing') return state
  const slid = slideNumberMergeBoard(state.board, direction)
  if (!slid.moved) {
    return { ...state, lastEvent: { kind: 'no-move' }, lastMerges: [] }
  }
  const won = slid.board.some((v) => v === state.target)
  if (won) {
    return {
      ...state,
      board: slid.board,
      moves: state.moves + 1,
      status: 'won',
      lastEvent: { kind: 'target-reached', merges: slid.merges },
      lastMerges: slid.merges,
    }
  }
  const spawned = spawnNumberMergeTile(slid.board, random)
  const board = spawned ? spawned.board : slid.board
  const stuck = !numberMergeHasMoves(board)
  return {
    ...state,
    board,
    moves: state.moves + 1,
    status: stuck ? 'out' : 'playing',
    lastEvent: stuck
      ? { kind: 'board-full' }
      : { kind: 'slid', merges: slid.merges },
    lastMerges: slid.merges,
  }
}
