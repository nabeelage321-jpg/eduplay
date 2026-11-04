/**
 * Memory Recall — pure round-building logic (type 37, fifth of
 * the remaining 8 toward 40). No React here, so it is
 * unit-testable and shared by the player and the print
 * worksheet's key (the worksheet itself renders prompts +
 * writing lines from the items directly).
 *
 * The game, in two phases:
 * - STUDY: the player sees every prompt→answer pair at once,
 *   in the game's own order, for as long as they want. There
 *   is no timer on study — rushing the study phase would
 *   punish careful players, and the test is the recall, not
 *   the reading speed.
 * - RECALL: the pairs are hidden and never shown again. One
 *   round per item, shuffled: the prompt only, plus options
 *   built Quiz-style from the game's own answers. The player
 *   answers from memory, under lives and a per-round timer.
 *
 * How this differs from the two look-alikes (audit,
 * 2026-11-04 — read before building, not assumed):
 * - Memory Match shows all tiles FACE DOWN in a grid and the
 *   player flips two at a time to pair prompt with answer.
 *   Every pair stays on screen, matchable by position, with
 *   no lives and no timer. Memory Recall hides the pairs
 *   entirely during recall: nothing on screen can be matched
 *   by position, and the answer must come from memory.
 * - Flashcards show ONE card at a time and the player taps
 *   to REVEAL the answer, then self-marks known/unknown.
 *   The answer is always one tap away and the score is
 *   self-reported. Memory Recall never reveals an answer on
 *   demand during recall, never asks the player to grade
 *   themselves, and scores only options the player actually
 *   picks under lives and a timer.
 *
 * Rules (exact, also stated in the player's How to Play):
 * - 3 lives. 10 points per correct recall, score out of
 *   10 x rounds. One recall round per usable item (prompt
 *   and answer both present, non-blank); rounds shuffled
 *   once per item content.
 * - Each recall round: the prompt only, plus options = the
 *   correct answer + up to 3 other items' answers, shuffled.
 *   A single-item game has only its own answer to offer, so
 *   it plays with one option — playable, just easy, same
 *   as Quiz.
 * - Correct recall: +10, correct sound, score pop, next
 *   round after a short feedback beat. Wrong recall: -1
 *   life, wrong sound, shake/red, next round. The correct
 *   option is shown green after answering, so a wrong
 *   recall still teaches the pair — but it never scores.
 * - 30 seconds per recall round, one timer warning at 5
 *   seconds left. Time-up: -1 life, "Time's up!", round
 *   skipped. The study phase has no timer.
 * - All rounds done with lives left = win; 0 lives =
 *   game over.
 *
 * Nothing is invented: every pair is a real item from the
 * teacher's own game, every option is a real answer from
 * that same game.
 */

export const MEMORY_RECALL_LIVES = 3
export const MEMORY_RECALL_ROUND_SECONDS = 30
export const MEMORY_RECALL_WARNING_SECONDS = 5
export const MEMORY_RECALL_POINTS = 10

export interface MemoryRecallItem {
  prompt: string
  answer: string
}

export interface MemoryRecallPair {
  prompt: string
  answer: string
}

export interface MemoryRecallRound {
  /** The prompt only — the answer is never shown during recall. */
  prompt: string
  /** The correct answer (never shown during recall except green after answering). */
  answer: string
  /** Options: correct answer + up to 3 other answers, shuffled (player) or stored order (print key). */
  options: string[]
  /** Index of the correct answer inside options. */
  correctIndex: number
}

/** Usable items only: prompt and answer both present, non-blank. */
export function buildMemoryRecallPairs<T extends MemoryRecallItem>(
  items: T[],
): MemoryRecallPair[] {
  if (!items || items.length === 0) return []
  return items
    .filter((i) => i.prompt?.trim() && i.answer?.trim())
    .map((i) => ({ prompt: i.prompt, answer: i.answer }))
}

/**
 * Build one recall round per usable pair.
 *
 * Player mode (deterministic: false): round order AND option
 * order are shuffled, so the correct option moves around.
 * Deterministic mode (deterministic: true): original pair
 * order and stored option order, so a worksheet and its key
 * built from the same rounds can never drift apart.
 */
export function buildMemoryRecallRounds<T extends MemoryRecallItem>(
  items: T[],
  opts?: { deterministic?: boolean; shuffle?: <U>(arr: U[]) => U[] },
): MemoryRecallRound[] {
  const pairs = buildMemoryRecallPairs(items)
  if (pairs.length === 0) return []
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
  const allAnswers = pairs.map((p) => p.answer)
  const ordered = opts?.deterministic === true ? pairs : shuffleFn(pairs)
  return ordered.map((pair) => {
    const wrong = shuffleFn(
      allAnswers.filter((a) => a !== pair.answer),
    ).slice(0, 3)
    const options =
      opts?.deterministic === true
        ? [pair.answer, ...wrong]
        : shuffleFn([pair.answer, ...wrong])
    return {
      prompt: pair.prompt,
      answer: pair.answer,
      options,
      correctIndex: options.indexOf(pair.answer),
    }
  })
}
