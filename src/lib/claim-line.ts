/**
 * Claim Line — pure board + question logic (type 38, sixth of
 * the remaining 8 toward 40). No React here, so it is
 * unit-testable and shared by the player and the print
 * worksheet's key (the worksheet itself renders the board
 * and the questions from the items directly).
 *
 * The game (research, 2026-11-04 — Baamboozle-style board
 * claiming, EduPlay's own art and wording, never copied):
 * a 3x3 board. The player taps an empty square and answers
 * a question about it; a correct answer claims that square
 * for the player. The computer takes a turn after every
 * player attempt and claims a random empty square. The
 * first side to hold a full line of 3 (row, column, or
 * diagonal) wins. A full board with no line is a draw.
 *
 * How this differs from the look-alikes (audit,
 * 2026-11-04 — read before building, not assumed):
 * - Speed Judge judges ONE claim at a time (prompt + a
 *   claimed answer: Correct or Wrong), 10 seconds, no
 *   board, no opponent, no line. Claim Line never judges
 *   a claim: it answers ordinary questions, and the
 *   answers become board moves against an opponent.
 * - TrueFalse gives a verdict on ONE statement at a time
 *   (swipe or tap True/False), no board, no opponent, no
 *   line, no lives, no timer.
 * - Order shows ALL items at once, drags them into one
 *   sequence, and checks the whole set once (no lives,
 *   no per-item timer, retry allowed). Claim Line never
 *   arranges a sequence: one square at a time, one
 *   question at a time, immediate feedback per move,
 *   lives and a per-question timer, and a placed claim
 *   is locked — it is never re-dragged.
 *
 * Rules (exact, also stated in the player's How to Play):
 * - 3 lives. 10 points per correct answer (per square the
 *   player claims). One question per square the player
 *   picks; questions are the game's own items, options
 *   built Quiz-style from the game's own answers.
 * - Correct answer: +10, correct sound, score pop, the
 *   square is claimed for the player. Then the player's
 *   line is checked: a line of 3 wins at once.
 * - Wrong answer: -1 life, wrong sound, shake/red, the
 *   square stays empty. Time-up: -1 life, "Time's up!",
 *   the square stays empty. Either way the computer then
 *   takes its turn (unless the game already ended).
 * - Computer turn: claims one random empty square (no
 *   question is invented for the computer — it is the
 *   solo opponent's move, and solo play is the v1; live
 *   turn-taking against another player is not built).
 *   Then the computer's line is checked: a line of 3
 *   loses the game at once. 0 lives also loses at once.
 * - A full board with no line is a draw — the game ends,
 *   not won, with the real score kept.
 * - Questions come from the game's items in shuffled
 *   order; if the items run out before the board ends
 *   (a game with fewer than 9 items), the queue
 *   reshuffles and cycles — questions repeat, but they
 *   are always real items, never invented. A single-item
 *   game plays with one option per question — playable,
 *   just easy, same as Quiz.
 * - All rounds done with lives left is NOT the win here:
 *   the win is a line of 3. The game ends on a player
 *   line (win), a computer line (lose), 0 lives (lose),
 *   or a full board (draw).
 *
 * Nothing is invented: every question is a real item
 * from the teacher's own game, every option is a real
 * answer from that same game, and the computer's squares
 * are board moves, not answers.
 */

export const CLAIM_LINE_LIVES = 3
export const CLAIM_LINE_QUESTION_SECONDS = 30
export const CLAIM_LINE_WARNING_SECONDS = 5
export const CLAIM_LINE_POINTS = 10
export const CLAIM_LINE_BOARD_SQUARES = 9

export type ClaimLineMark = 'player' | 'computer' | null
export type ClaimLineBoard = ClaimLineMark[]

/** The 8 winning lines on a 3x3 board (square indexes 0-8). */
export const CLAIM_LINE_WIN_LINES: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export interface ClaimLineItem {
  prompt: string
  answer: string
}

export interface ClaimLineQuestion {
  /** The question (the item's prompt). */
  prompt: string
  /** The correct answer (never shown before answering). */
  answer: string
  /** Options: correct answer + up to 3 other answers, shuffled (player) or stored order (print). */
  options: string[]
  /** Index of the correct answer inside options. */
  correctIndex: number
}

/** True when `mark` holds any full line of 3 on the board. */
export function claimLineHasLine(board: ClaimLineBoard, mark: Exclude<ClaimLineMark, null>): boolean {
  return CLAIM_LINE_WIN_LINES.some((line) => line.every((i) => board[i] === mark))
}

/** Indexes of the empty squares, in board order. */
export function claimLineEmptySquares(board: ClaimLineBoard): number[] {
  const out: number[] = []
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) out.push(i)
  }
  return out
}

/** True when no square is empty. */
export function claimLineBoardFull(board: ClaimLineBoard): boolean {
  return claimLineEmptySquares(board).length === 0
}

/**
 * The computer's move: one random empty square, or -1 when
 * the board is full. `random` is injectable so tests can
 * force a deterministic pick; production passes nothing.
 */
export function claimLineComputerPick(
  board: ClaimLineBoard,
  random: () => number = Math.random,
): number {
  const empty = claimLineEmptySquares(board)
  if (empty.length === 0) return -1
  return empty[Math.floor(random() * empty.length)]
}

/** Usable items only: prompt and answer both present, non-blank. */
export function buildClaimLineQuestions<T extends ClaimLineItem>(
  items: T[],
  opts?: { deterministic?: boolean; shuffle?: <U>(arr: U[]) => U[] },
): ClaimLineQuestion[] {
  if (!items || items.length === 0) return []
  const usable = items.filter((i) => i.prompt?.trim() && i.answer?.trim())
  if (usable.length === 0) return []
  const shuffleFn =
    opts?.shuffle ??
    (<U>(arr: U[]): U[] => {
      const copy = [...arr]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    })
  const allAnswers = usable.map((i) => i.answer)
  const ordered = opts?.deterministic === true ? usable : shuffleFn(usable)
  return ordered.map((item) => {
    const wrong = shuffleFn(
      allAnswers.filter((a) => a !== item.answer),
    ).slice(0, 3)
    const options =
      opts?.deterministic === true
        ? [item.answer, ...wrong]
        : shuffleFn([item.answer, ...wrong])
    return {
      prompt: item.prompt,
      answer: item.answer,
      options,
      correctIndex: options.indexOf(item.answer),
    }
  })
}
