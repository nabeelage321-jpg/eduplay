/**
 * Speed Judge — pure round-building logic (type 34, second of the
 * remaining 8 toward 40). No React here, so it is unit-testable
 * and shared by the player and the print worksheet.
 *
 * The game: the player is shown a CLAIM built from a real item —
 * the question (prompt) plus a claimed answer — and must judge it
 * fast: tap Correct if the claimed answer really answers the
 * question, Wrong if it does not. Nothing is invented: a true
 * claim uses the item's own answer, a false claim uses ANOTHER
 * item's answer from the same game, so every claim is a real
 * answer from the teacher's own game, just attached to the wrong
 * question. No item is ever dropped, and no answer is ever made up.
 *
 * Rules (exact, also stated in the player's How to Play):
 * - 3 lives. 10 points per correct judgement, score out of
 *   10 x rounds. NO speed bonus: speed matters only through the
 *   timer (answer before it runs out); every correct judgement
 *   is worth the same 10 points, fast or slow.
 * - One round per item. A correct judgement advances with +10;
 *   a wrong judgement costs 1 life; a time-up costs 1 life and
 *   the round is skipped.
 * - 10 seconds per round, one timer warning at 3 seconds left.
 * - All rounds done with lives left = win; 0 lives = game over.
 */

export const SPEED_JUDGE_LIVES = 3
export const SPEED_JUDGE_ROUND_SECONDS = 10
export const SPEED_JUDGE_WARNING_SECONDS = 3

export interface SpeedJudgeRound {
  /** The question the claim is about (the item's prompt). */
  prompt: string
  /** The answer claimed for that question. */
  claimedAnswer: string
  /** True when the claimed answer is the item's own answer. */
  isTrueClaim: boolean
  /** The judgement that scores: 'correct' for a true claim, 'wrong' for a false one. */
  correctJudgement: 'correct' | 'wrong'
}

interface SpeedJudgeItem {
  prompt: string
  answer: string
}

/**
 * Build one round per usable item (prompt + answer present).
 *
 * Player mode (deterministic: false): round order is shuffled and
 * each round's claim is a coin flip — true claim (own answer) or
 * false claim (a shuffled other item's answer). A game with a
 * single item has no other answer to borrow, so every claim is
 * true; the game still plays honestly (judge everything Correct),
 * it is just an easy game, and nothing is invented to fake a
 * false claim.
 *
 * Print mode (deterministic: true): original item order, even
 * rounds carry true claims, odd rounds carry the NEXT item's
 * answer (cyclically) as a false claim. Deterministic so the
 * student worksheet and the answer key can never drift apart.
 */
export function buildSpeedJudgeRounds<T extends SpeedJudgeItem>(
  items: T[],
  opts?: { deterministic?: boolean; shuffle?: <U>(arr: U[]) => U[] },
): SpeedJudgeRound[] {
  const usable = items.filter((i) => i.prompt && i.answer)
  if (usable.length === 0) return []
  const deterministic = opts?.deterministic === true
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

  const ordered = deterministic ? usable : shuffleFn(usable)
  return ordered.map((item, index) => {
    let isTrueClaim: boolean
    let claimedAnswer: string
    if (usable.length === 1) {
      // No other answer exists to borrow — every claim is true.
      isTrueClaim = true
      claimedAnswer = item.answer
    } else if (deterministic) {
      isTrueClaim = index % 2 === 0
      if (isTrueClaim) {
        claimedAnswer = item.answer
      } else {
        // Next usable item's answer, cyclically — always a real
        // answer from the same game, never an invented one.
        const nextIndex = (usable.indexOf(item) + 1) % usable.length
        claimedAnswer = usable[nextIndex].answer
      }
    } else {
      isTrueClaim = Math.random() < 0.5
      if (isTrueClaim) {
        claimedAnswer = item.answer
      } else {
        const others = shuffleFn(usable.filter((o) => o !== item).map((o) => o.answer))
        claimedAnswer = others[0]
      }
    }
    return {
      prompt: item.prompt,
      claimedAnswer,
      isTrueClaim,
      correctJudgement: isTrueClaim ? 'correct' : 'wrong',
    }
  })
}
