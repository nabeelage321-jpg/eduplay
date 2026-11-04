/**
 * Picture Answer — pure round-building logic (type 36, fourth of
 * the remaining 8 toward 40). No React here, so it is
 * unit-testable and shared by the player and the print
 * worksheet.
 *
 * The game: the player answers a question about a picture. Each
 * round shows the item's picture when the item carries one,
 * plus its prompt/clue, and four options built Quiz-style from
 * the game's own answers. Nothing is invented: every round is
 * a real item from the teacher's own game, every option is a
 * real answer from that same game, and no picture is ever
 * invented, stock-filled, or AI-generated for an item that
 * carries none — such a round shows an honest no-picture
 * state (clue + options) instead.
 *
 * Audit finding (2026-11-04): items CAN carry a picture today
 * — ActivityItem.imageUrl exists, the save routes whitelist
 * it (sliced to 500 chars), and the adapter passes it through
 * untouched. Labelled Diagram reads items[0].imageUrl, Jigsaw
 * and Map Quiz read the first non-empty imageUrl across
 * items. But programme games carry NO imageUrl (the known
 * labelled-diagram limit: it plays as a label quiz), and the
 * creator has NO per-item picture field for any type — Map
 * Quiz, Jigsaw, and Video Quiz only stamp ONE shared URL onto
 * every item. So this batch adds a per-item Picture URL field
 * for picture-answer only (see ItemEditor): each question gets
 * its own picture, pasted by the teacher (own or CC-licensed
 * image only, no upload infrastructure).
 *
 * Rules (exact, also stated in the player's How to Play):
 * - 3 lives. 10 points per correct answer, score out of
 *   10 x rounds. One round per item, rounds shuffled once
 *   per item content.
 * - Each round: the item's picture when imageUrl is present
 *   (a picture that fails to load falls back to the no-picture
 *   state in the player — never a broken-image icon), the
 *   prompt/clue, and options: the correct answer plus up to
 *   3 other items' answers, shuffled. A single-item game has
 *   only its own answer to offer, so it plays with one
 *   option — playable, just easy, same as Quiz.
 * - Correct answer: +10, correct sound, score pop, next round
 *   after a short feedback beat. Wrong answer: -1 life,
 *   wrong sound, shake/red, next round.
 * - 30 seconds per round, one timer warning at 5 seconds
 *   left. Time-up: -1 life, "Time's up!", round skipped.
 * - All rounds done with lives left = win; 0 lives =
 *   game over.
 */

export const PICTURE_ANSWER_LIVES = 3
export const PICTURE_ANSWER_ROUND_SECONDS = 30
export const PICTURE_ANSWER_WARNING_SECONDS = 5
export const PICTURE_ANSWER_POINTS = 10

export interface PictureAnswerItem {
  prompt: string
  answer: string
  imageUrl?: string
}

export interface PictureAnswerRound {
  /** The question/clue about the picture (the item's prompt). */
  prompt: string
  /** The correct answer (never shown on the student sheet / in play). */
  answer: string
  /** The item's own picture URL, or '' when the item carries none. */
  imageUrl: string
  /** Options: correct answer + up to 3 other answers, shuffled (player) or stored order (print). */
  options: string[]
  /** Index of the correct answer inside options. */
  correctIndex: number
}

/**
 * Build one round per item.
 *
 * Player mode (deterministic: false): round order AND option
 * order are shuffled, so the correct option moves around.
 * Print mode (deterministic: true): original item order and
 * stored option order, so the student worksheet and the
 * answer key can never drift apart. On paper the options are
 * blank checkboxes with nothing marking the correct one, so
 * stored order leaks nothing.
 * Either way every round is a real item, every option is a
 * real answer from the same game, and no picture is invented.
 */
export function buildPictureAnswerRounds<T extends PictureAnswerItem>(
  items: T[],
  opts?: { deterministic?: boolean; shuffle?: <U>(arr: U[]) => U[] },
): PictureAnswerRound[] {
  if (!items || items.length === 0) return []
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
  const allAnswers = items.map((i) => i.answer)
  const ordered = opts?.deterministic === true ? items : shuffleFn(items)
  return ordered.map((item) => {
    const wrong = shuffleFn(
      allAnswers.filter((a) => a !== item.answer),
    ).slice(0, 3)
    const options = opts?.deterministic === true
      ? [item.answer, ...wrong]
      : shuffleFn([item.answer, ...wrong])
    return {
      prompt: item.prompt,
      answer: item.answer,
      imageUrl: item.imageUrl ?? '',
      options,
      correctIndex: options.indexOf(item.answer),
    }
  })
}
