/**
 * Block Drop — pure falling-block logic (no React, no sound, no storage).
 *
 * EduPlay's own Tetris-STYLE falling-block game (type 50): letter
 * or number blocks fall into a well, and the kid moves, rotates,
 * and drops them to complete a row. Tetris-STYLE mechanic only:
 * the name is EduPlay's own, the blocks are plain coloured squares
 * with a letter or a digit written on them — no Tetris name, no
 * tetromino branding, no Tetris Company art copied. Nothing here
 * invents content: the falling blocks carry the game's real
 * answers — the round's target letters or digits, plus distractor
 * characters borrowed from the game's other items.
 *
 * The well is as wide as the target: in word mode the target word
 * (3–6 letters) sets the width, so a full row IS the word; in sum
 * mode the well is 3 wide and a full row is three digits. The
 * target is shown as the question for the round (e.g. "Spell CAT"
 * or "Make 8"), so the kid always knows what row to build.
 *
 * Rules (the component renders these, this module proves them):
 * - 3 lives, +10 points per completed row (one round per question,
 *   up to 10 rounds). Score out of 10 x rounds.
 * - Falling pieces are 1–3 blocks: a single block, a horizontal
 *   domino (2), a horizontal tromino (3), or an L-tromino (3
 *   blocks in a 2x2 corner). A piece falls one row per tick
 *   (700ms). Left/right moves it, up rotates it 90 degrees
 *   clockwise (with a one-column wall-kick), down soft-drops it
 *   one row, Space hard-drops it straight to the floor.
 * - When a piece can fall no further it locks into the well.
 *   Then every full row is checked: a full row that reads the
 *   target word left-to-right (word mode) or whose digits add up
 *   to the target sum (sum mode) clears — +10, round won. A full
 *   row that does NOT match stays exactly where it is and piles
 *   up — that is the risk of a careless drop.
 * - The falling queue ("bag") holds every target character twice
 *   — so one wrong row does not make the round unwinnable — plus
 *   up to 4 distractor characters borrowed from the game's other
 *   items. When the bag runs out without a cleared row, the round
 *   ends with no points and no life lost ("out of blocks").
 * - If the stack piles so high that the next piece cannot spawn,
 *   the well has topped out: -1 life, round lost, the board is
 *   cleared for the next round.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win.
 * - A round needs a word answer of 3–6 letters (word mode) or a
 *   whole-number answer of 0–27 (sum mode — three digits can add
 *   up to 27 at most). Any other answer builds no round.
 */

export const BLOCK_DROP_LIVES = 3
export const BLOCK_DROP_MAX_ROUNDS = 10
/** Points for completing the target row — one round, one row. */
export const BLOCK_DROP_POINTS_PER_ROUND = 10
/** A piece falls one row every tick. */
export const BLOCK_DROP_TICK_MS = 700
/** Rows in the well. */
export const BLOCK_DROP_BOARD_ROWS = 8
/** Columns in sum mode — three digits make the sum. */
export const BLOCK_DROP_SUM_WIDTH = 3
/** Word mode only accepts words this long. */
export const BLOCK_DROP_MIN_WORD_LEN = 3
export const BLOCK_DROP_MAX_WORD_LEN = 6
/** Sum mode only accepts targets up to three 9s. */
export const BLOCK_DROP_MAX_SUM = 27
/** Distractor characters borrowed per round, at most. */
export const BLOCK_DROP_MAX_DISTRACTORS = 4
/** Every target character appears this many times in the bag. */
export const BLOCK_DROP_TARGET_COPIES = 2

export type BlockDropMode = 'word' | 'sum'

/** One block of a piece, offset from the piece's top-left corner. */
export interface BlockDropCell {
  dx: number
  dy: number
  char: string
}

/** A piece shape before it is placed in the well. */
export interface BlockDropPieceTemplate {
  cells: BlockDropCell[]
  width: number
  height: number
}

/** A piece falling in the well: its shape plus its position. */
export interface BlockDropPiece extends BlockDropPieceTemplate {
  x: number
  y: number
}

/** The well: rows of settled characters, null = empty cell. */
export type BlockDropBoard = (string | null)[][]

export interface BlockDropRound {
  prompt: string
  mode: BlockDropMode
  /** Word mode: the word the row must spell, upper-cased. */
  targetWord?: string
  /** Sum mode: the number the row's digits must add up to. */
  targetSum?: number
  /** Columns in the well: the word length, or 3 in sum mode. */
  width: number
  /** The falling queue, in spawn order. */
  pieces: BlockDropPieceTemplate[]
  /** The question's own picture, when the maker added one — shown
   *  above the question, never invented. */
  imageUrl?: string
  imageCredit?: string
}

export type BlockDropStatus = 'playing' | 'won' | 'lost' | 'out-of-blocks'

/** The live state of one round: the well, the falling piece, the bag. */
export interface BlockDropState {
  round: BlockDropRound
  board: BlockDropBoard
  piece: BlockDropPiece | null
  /** Index of the next piece to spawn from the round's queue. */
  nextIndex: number
  status: BlockDropStatus
}

export type BlockDropMoveDirection = 'left' | 'right'

/** An empty well of the given width. */
export function emptyBoard(width: number): BlockDropBoard {
  return Array.from({ length: BLOCK_DROP_BOARD_ROWS }, () =>
    Array.from({ length: width }, () => null),
  )
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

/** Width and height of a cell list (its bounding box). */
export function cellsSize(cells: BlockDropCell[]): { width: number; height: number } {
  let width = 0
  let height = 0
  for (const c of cells) {
    width = Math.max(width, c.dx + 1)
    height = Math.max(height, c.dy + 1)
  }
  return { width, height }
}

/**
 * Rotate a shape 90 degrees clockwise: (x, y) -> (h - 1 - y, x),
 * then shift so the top-left corner is back at (0, 0). Pure.
 */
export function rotateCells(cells: BlockDropCell[]): BlockDropCell[] {
  const { height } = cellsSize(cells)
  const rotated = cells.map((c) => ({ dx: height - 1 - c.dy, dy: c.dx, char: c.char }))
  const minX = Math.min(...rotated.map((c) => c.dx))
  const minY = Math.min(...rotated.map((c) => c.dy))
  return rotated.map((c) => ({ dx: c.dx - minX, dy: c.dy - minY, char: c.char }))
}

/** True when every cell of the shape fits in the well on empty cells. */
export function pieceFits(
  board: BlockDropBoard,
  cells: BlockDropCell[],
  x: number,
  y: number,
): boolean {
  const width = board[0]?.length ?? 0
  for (const c of cells) {
    const cx = x + c.dx
    const cy = y + c.dy
    if (cx < 0 || cx >= width || cy < 0 || cy >= BLOCK_DROP_BOARD_ROWS) return false
    if (board[cy]?.[cx]) return false
  }
  return true
}

/** Spawn a piece at the top centre of the well, or null if blocked. */
export function spawnPiece(
  board: BlockDropBoard,
  template: BlockDropPieceTemplate,
): BlockDropPiece | null {
  const width = board[0]?.length ?? 0
  const x = Math.max(0, Math.floor((width - template.width) / 2))
  if (!pieceFits(board, template.cells, x, 0)) return null
  return { ...template, cells: template.cells.map((c) => ({ ...c })), x, y: 0 }
}

/** A fresh round: empty well, first piece falling. */
export function newBlockDropGame(round: BlockDropRound): BlockDropState {
  const board = emptyBoard(round.width)
  const first = round.pieces[0]
  const piece = first ? spawnPiece(board, first) : null
  return {
    round,
    board,
    piece,
    nextIndex: 1,
    status: piece ? 'playing' : 'lost',
  }
}

/** Slide the falling piece one column over, or leave it put. Pure. */
export function movePiece(state: BlockDropState, dir: BlockDropMoveDirection): BlockDropState {
  if (state.status !== 'playing' || !state.piece) return state
  const nextX = state.piece.x + (dir === 'left' ? -1 : 1)
  if (!pieceFits(state.board, state.piece.cells, nextX, state.piece.y)) return state
  return { ...state, piece: { ...state.piece, x: nextX } }
}

/**
 * Rotate the falling piece 90 degrees clockwise. A wall-kick tries
 * one column left, then one column right, when the rotated shape
 * does not fit where it is. Refuses the rotation when nothing fits.
 * Pure.
 */
export function rotatePiece(state: BlockDropState): BlockDropState {
  if (state.status !== 'playing' || !state.piece) return state
  const rotated = rotateCells(state.piece.cells)
  const { width, height } = cellsSize(rotated)
  for (const x of [state.piece.x, state.piece.x - 1, state.piece.x + 1]) {
    if (pieceFits(state.board, rotated, x, state.piece.y)) {
      return { ...state, piece: { ...state.piece, cells: rotated, width, height, x } }
    }
  }
  return state
}

/** True when every cell of the row is filled. */
export function rowIsFull(board: BlockDropBoard, row: number): boolean {
  return (board[row] ?? []).every((cell) => cell !== null && cell !== '')
}

/**
 * True when a full row completes the round's target: the letters
 * read left-to-right spell the target word, or the digits add up
 * to the target sum. A row that is not full never matches.
 */
export function rowMatchesTarget(round: BlockDropRound, board: BlockDropBoard, row: number): boolean {
  if (!rowIsFull(board, row)) return false
  const cells = (board[row] ?? []).map((c) => c ?? '')
  if (round.mode === 'word') {
    return cells.join('') === (round.targetWord ?? '')
  }
  const sum = cells.reduce((total, c) => total + (Number.parseInt(c, 10) || 0), 0)
  return sum === round.targetSum
}

/** Settle the falling piece into the well. Pure — returns a new board. */
export function lockPieceIntoBoard(board: BlockDropBoard, piece: BlockDropPiece): BlockDropBoard {
  const next = board.map((row) => [...row])
  for (const c of piece.cells) {
    const cy = piece.y + c.dy
    const cx = piece.x + c.dx
    if (cy >= 0 && cy < BLOCK_DROP_BOARD_ROWS && cx >= 0 && cx < (next[0]?.length ?? 0)) {
      next[cy]![cx] = c.char
    }
  }
  return next
}

export interface DropResult {
  state: BlockDropState
  /** True when the piece locked on this step. */
  locked: boolean
  /** True when a locked piece completed the target row. */
  rowCleared: boolean
}

/**
 * Lock the falling piece and settle the round: check every full
 * row for the target, spawn the next piece, or end the round.
 * Pure. A cleared target row wins the round; a blocked spawn
 * tops the well out (lost); an empty bag with no cleared row ends
 * the round out of blocks.
 */
export function lockPiece(state: BlockDropState): DropResult {
  if (state.status !== 'playing' || !state.piece) return { state, locked: false, rowCleared: false }
  const board = lockPieceIntoBoard(state.board, state.piece)
  let rowCleared = false
  for (let row = 0; row < BLOCK_DROP_BOARD_ROWS; row++) {
    if (rowMatchesTarget(state.round, board, row)) {
      rowCleared = true
      break
    }
  }
  if (rowCleared) {
    return { state: { ...state, board, piece: null, status: 'won' }, locked: true, rowCleared: true }
  }
  const template = state.round.pieces[state.nextIndex]
  if (!template) {
    return {
      state: { ...state, board, piece: null, status: 'out-of-blocks' },
      locked: true,
      rowCleared: false,
    }
  }
  const nextPiece = spawnPiece(board, template)
  if (!nextPiece) {
    return {
      state: { ...state, board, piece: null, nextIndex: state.nextIndex + 1, status: 'lost' },
      locked: true,
      rowCleared: false,
    }
  }
  return {
    state: { ...state, board, piece: nextPiece, nextIndex: state.nextIndex + 1, status: 'playing' },
    locked: true,
    rowCleared: false,
  }
}

/**
 * One fall step: the piece drops one row, or locks when it can
 * fall no further. This is the tick and the soft drop. Pure.
 */
export function dropOne(state: BlockDropState): DropResult {
  if (state.status !== 'playing' || !state.piece) return { state, locked: false, rowCleared: false }
  if (pieceFits(state.board, state.piece.cells, state.piece.x, state.piece.y + 1)) {
    return {
      state: { ...state, piece: { ...state.piece, y: state.piece.y + 1 } },
      locked: false,
      rowCleared: false,
    }
  }
  return lockPiece(state)
}

/** Hard drop: fall straight to the floor and lock there. Pure. */
export function hardDrop(state: BlockDropState): DropResult {
  if (state.status !== 'playing' || !state.piece) return { state, locked: false, rowCleared: false }
  let current: BlockDropState = state
  for (let guard = 0; guard < BLOCK_DROP_BOARD_ROWS + 1; guard++) {
    const res = dropOne(current)
    if (res.locked) return res
    current = res.state
  }
  return lockPiece(current)
}

/**
 * Distractor characters borrowed from the game's other answers:
 * distinct characters that are not part of this round's target,
 * at most BLOCK_DROP_MAX_DISTRACTORS. In word mode the letters of
 * the other answers; in sum mode the digits. Empty when the game
 * has no other character to borrow — such a round still plays,
 * with target characters only.
 */
export function borrowDistractorChars(
  otherAnswers: string[],
  mode: BlockDropMode,
  targetChars: string,
): string[] {
  const target = new Set(targetChars.split(''))
  const seen = new Set<string>()
  const distractors: string[] = []
  for (const answer of otherAnswers) {
    for (const raw of (answer ?? '').toUpperCase()) {
      const ch = raw
      const ok = mode === 'word' ? /[A-Z]/.test(ch) : /[0-9]/.test(ch)
      if (!ok || target.has(ch) || seen.has(ch)) continue
      seen.add(ch)
      distractors.push(ch)
    }
  }
  return shuffled(distractors).slice(0, BLOCK_DROP_MAX_DISTRACTORS)
}

/**
 * Split a shuffled character list into falling pieces: singles,
 * horizontal dominoes, horizontal trominoes, and L-trominoes —
 * each shape only when it fits the well's width. Pure except for
 * the shuffle.
 */
export function charsToPieces(chars: string[], width: number): BlockDropPieceTemplate[] {
  const pieces: BlockDropPieceTemplate[] = []
  let i = 0
  while (i < chars.length) {
    const remaining = chars.length - i
    const roll = Math.random()
    if (remaining >= 3 && roll < 0.3 && width >= 3) {
      // Horizontal tromino — three blocks in a row.
      pieces.push({
        cells: [
          { dx: 0, dy: 0, char: chars[i]! },
          { dx: 1, dy: 0, char: chars[i + 1]! },
          { dx: 2, dy: 0, char: chars[i + 2]! },
        ],
        width: 3,
        height: 1,
      })
      i += 3
    } else if (remaining >= 3 && roll < 0.55 && width >= 2) {
      // L-tromino — three blocks in a 2x2 corner.
      pieces.push({
        cells: [
          { dx: 0, dy: 0, char: chars[i]! },
          { dx: 1, dy: 0, char: chars[i + 1]! },
          { dx: 0, dy: 1, char: chars[i + 2]! },
        ],
        width: 2,
        height: 2,
      })
      i += 3
    } else if (remaining >= 2 && roll < 0.8 && width >= 2) {
      // Horizontal domino — two blocks in a row.
      pieces.push({
        cells: [
          { dx: 0, dy: 0, char: chars[i]! },
          { dx: 1, dy: 0, char: chars[i + 1]! },
        ],
        width: 2,
        height: 1,
      })
      i += 2
    } else {
      pieces.push({
        cells: [{ dx: 0, dy: 0, char: chars[i]! }],
        width: 1,
        height: 1,
      })
      i += 1
    }
  }
  return pieces
}

/**
 * Build one round. Returns null when the answer builds no round:
 * word mode needs a letters-only answer of 3–6 letters; sum mode
 * needs a whole-number answer of 0–27. The bag holds every target
 * character twice plus up to 4 borrowed distractor characters,
 * shuffled and split into falling pieces — so a careful kid can
 * always complete the row, and one wrong row never ends the round.
 */
export function buildBlockDropRound(
  prompt: string,
  answer: string,
  otherAnswers: string[],
  imageUrl?: string,
  imageCredit?: string,
): BlockDropRound | null {
  const clean = (answer ?? '').trim()
  if (!prompt || !clean) return null
  if (/^[A-Za-z]{3,6}$/.test(clean)) {
    const targetWord = clean.toUpperCase()
    const distractors = borrowDistractorChars(otherAnswers, 'word', targetWord)
    const bag = shuffled([
      ...targetWord.split(''),
      ...targetWord.split(''),
      ...distractors,
    ])
    return {
      prompt,
      mode: 'word',
      targetWord,
      width: targetWord.length,
      pieces: charsToPieces(bag, targetWord.length),
      imageUrl,
      imageCredit,
    }
  }
  if (/^\d+$/.test(clean)) {
    const targetSum = Number.parseInt(clean, 10)
    if (targetSum > BLOCK_DROP_MAX_SUM) return null
    // Digits that add up to the target: split it into three
    // digits (0–9 each) so the sum is always reachable.
    const targetDigits: string[] = []
    let left = targetSum
    for (let part = 0; part < 3; part++) {
      const take = part === 2 ? left : Math.min(9, left)
      targetDigits.push(String(take))
      left -= take
    }
    const targetChars = targetDigits.join('')
    const distractors = borrowDistractorChars(otherAnswers, 'sum', targetChars)
    const bag = shuffled([
      ...targetDigits,
      ...targetDigits,
      ...distractors,
    ])
    return {
      prompt,
      mode: 'sum',
      targetSum,
      width: BLOCK_DROP_SUM_WIDTH,
      pieces: charsToPieces(bag, BLOCK_DROP_SUM_WIDTH),
      imageUrl,
      imageCredit,
    }
  }
  return null
}
