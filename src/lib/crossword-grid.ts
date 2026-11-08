/**
 * CROSSWORD GRID PLACEMENT (prompt-to-game draft gate, 2026-11-08).
 *
 * This mirrors the placement rules of the Crossword player
 * (src/components/activity-types/CrosswordActivity.tsx, buildCrossword)
 * exactly — same 13×13 grid, same first-word-across-in-the-middle,
 * same crossing rule (every word after the first must CROSS an
 * existing word at a shared letter, across or down), same adjacency
 * rules (no touching neighbours except at the crossing itself).
 * The player is the authority: it drops words that cannot cross.
 * This module is the DRAFT-TIME gate, so a prompt-to-game draft whose
 * words cannot form a grid is rejected with a plain error BEFORE the
 * creator sees it, instead of shipping a flat word list that plays
 * as one lonely across word (or a grid the player silently shrinks).
 *
 * Pure, no React: the API route imports it. If the player ever
 * changes its grid size or placement rules, this file must change
 * with it — the temp tests pin the shared cases (planets, animals,
 * colours, table word sets, no-shared-letter sets).
 */

const SIZE = 13

type Grid = (string | null)[][]

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => new Array<string | null>(SIZE).fill(null))
}

function canPlaceDown(grid: Grid, ans: string, r0: number, c: number): boolean {
  if (r0 < 0 || r0 + ans.length > SIZE) return false
  for (let i = 0; i < ans.length; i++) {
    const existing = grid[r0 + i][c]
    if (existing && existing !== ans[i]) return false
    if (!existing) {
      if (grid[r0 + i][c - 1] || grid[r0 + i][c + 1]) return false
    }
  }
  if (grid[r0 - 1]?.[c] || grid[r0 + ans.length]?.[c]) return false
  return true
}

function canPlaceAcross(grid: Grid, ans: string, r: number, c0: number): boolean {
  if (c0 < 0 || c0 + ans.length > SIZE) return false
  for (let i = 0; i < ans.length; i++) {
    const existing = grid[r][c0 + i]
    if (existing && existing !== ans[i]) return false
    if (!existing) {
      if (grid[r - 1]?.[c0 + i] || grid[r + 1]?.[c0 + i]) return false
    }
  }
  if (grid[r]?.[c0 - 1] || grid[r]?.[c0 + ans.length]) return false
  return true
}

function placeDown(grid: Grid, ans: string, r0: number, c: number): void {
  ans.split('').forEach((letter, i) => {
    if (!grid[r0 + i][c]) grid[r0 + i][c] = letter
  })
}

function placeAcross(grid: Grid, ans: string, r: number, c0: number): void {
  ans.split('').forEach((letter, i) => {
    if (!grid[r][c0 + i]) grid[r][c0 + i] = letter
  })
}

function normalise(answer: string): string {
  return (answer ?? '').toUpperCase().replace(/\s/g, '')
}

/**
 * How many of these answers the player would actually place on its
 * grid (first word across in the middle, every later word crossing
 * at a shared letter, at most 10 words — the player's own cap).
 * A return of 1 means only the anchor placed: a flat list, not a
 * crossword. Callers require at least CROSSWORD_MIN_PLACED_WORDS.
 */
export function countPlacedCrosswordWords(answers: string[]): number {
  const words = answers.map(normalise).filter((w) => w.length > 0 && w.length <= SIZE)
  if (words.length === 0) return 0
  const grid = emptyGrid()
  const first = words[0]
  const startCol = Math.floor((SIZE - first.length) / 2)
  const startRow = Math.floor(SIZE / 2)
  placeAcross(grid, first, startRow, startCol)
  let placed = 1

  for (let wi = 1; wi < Math.min(words.length, 10); wi++) {
    const ans = words[wi]
    let done = false
    for (let r = 1; r < SIZE - 1 && !done; r++) {
      for (let c = 1; c < SIZE - 1 && !done; c++) {
        const cell = grid[r][c]
        if (!cell) continue
        const indices: number[] = []
        for (let k = 0; k < ans.length; k++) if (ans[k] === cell) indices.push(k)
        for (const idx of indices) {
          if (done) break
          const dr = r - idx
          if (canPlaceDown(grid, ans, dr, c)) {
            placeDown(grid, ans, dr, c)
            placed++
            done = true
            break
          }
          const dc = c - idx
          if (canPlaceAcross(grid, ans, r, dc)) {
            placeAcross(grid, ans, r, dc)
            placed++
            done = true
          }
        }
      }
    }
  }
  return placed
}

/**
 * Minimum placed words for a prompt-to-game crossword draft: the
 * anchor plus at least two crossing words — a real little grid,
 * not one word, not one cross. Typical topic sets (planets,
 * animals, colours, table word sets) place 4+, so this bar rejects
 * only lists that genuinely cannot interlock.
 */
export const CROSSWORD_MIN_PLACED_WORDS = 3
