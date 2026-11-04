/**
 * Opinion Cloud — pure statement + reaction logic (type 39,
 * seventh of the remaining 8 toward 40). No React here, so it
 * is unit-testable and shared by the player and the tests.
 *
 * The game (EduPlay's own idea, own art and wording, never
 * copied): each item is a STATEMENT to react to, not a
 * question with a right answer. The player reacts Agree,
 * Disagree, or Not sure, and builds their own opinion
 * cloud as they go. The game finishes when every
 * statement has a reaction — on participation, never on
 * correctness.
 *
 * How this differs from the look-alikes (audit,
 * 2026-11-04 — read before building, not assumed):
 * - No poll, survey, or vote type exists on EduPlay at
 *   all: the only "poll" hits in the codebase are the
 *   live-session network polling (a leaderboard refresh
 *   every 3 seconds), not opinion polls. Nothing here
 *   renames an existing type.
 * - Categorize sorts items into teacher-set categories
 *   and scores them right/wrong. Opinion Cloud never
 *   sorts anything into a right category: a reaction is
 *   the player's own view, and all three reactions count
 *   exactly the same.
 * - TrueFalse gives a verdict on ONE statement at a time
 *   (True/False) and scores it right/wrong. Opinion Cloud
 *   never asks for a verdict and never scores one: Agree,
 *   Disagree, and Not sure are all equally valid, and no
 *   reaction is ever marked wrong.
 * - Speed Judge judges claims Correct/Wrong against the
 *   game's answers. Opinion Cloud never judges: the
 *   item's answer field is never shown and never scored
 *   as a right answer — it simply is not an opinion.
 * - Quiz and every other knowledge type score correct
 *   answers. Opinion Cloud has no correct answers at
 *   all, so it cannot be a knowledge quiz in disguise.
 *
 * Rules (exact, also stated in the player's How to Play):
 * - One statement per usable item: prompt present and
 *   non-blank. The answer field is NOT required and is
 *   never displayed — opinions have no right answer, so
 *   there is nothing to reveal as "correct".
 * - Reactions: 'agree' | 'disagree' | 'not-sure'. A
 *   reaction locks in with a click sound and a short
 *   feedback beat ("Opinion noted"), then the next
 *   statement appears. A reaction is never re-tapped:
 *   changing your mind mid-game is not built in v1 —
 *   the cloud shows what you said, honestly, as said.
 * - NO lives: nothing is ever lost, because no opinion
 *   is wrong. NO timer: opinions are untimed — no
 *   per-statement timer, no timer warning, no time-up.
 *   Pause still covers the game (no reaction can be
 *   tapped while paused); re-reading How to Play
 *   mid-game freezes nothing, because nothing is timed.
 * - Completion: every statement reacted to. The finish
 *   screen is the player's own cloud — counts per
 *   reaction plus the statements grouped by reaction.
 *   Solo v1 shows ONLY the player's own cloud. A
 *   class-wide cloud (everyone's reactions together)
 *   needs server storage and is phase 2 — it is never
 *   faked from one player's answers, and no consensus
 *   percentage is ever invented.
 * - Score, honestly defined: the number of opinions
 *   shared (one per reacted statement, every reaction
 *   counting 1 equally). It is a participation count,
 *   not points for being right — the player header and
 *   the finish screen both label it "shared", and the
 *   play shell's Score slot carries this same count.
 *   onComplete fires exactly once with that count plus
 *   the statement total — and deliberately NO
 *   correctCount, because nothing here is correct or
 *   incorrect.
 * - Statements are shuffled once per item content
 *   (fingerprint + ref guard in the player, the
 *   2026-11-02 quiz lesson), so play-page timer ticks
 *   can never reshuffle a game in progress.
 *
 * Nothing is invented: every statement is a real item
 * from the teacher's own game, every reaction is the
 * player's own, and no consensus, percentage, rating,
 * or count is ever made up.
 */

export const OPINION_CLOUD_REACTIONS = ['agree', 'disagree', 'not-sure'] as const
export type OpinionReaction = (typeof OPINION_CLOUD_REACTIONS)[number]

export const OPINION_REACTION_LABEL: Record<OpinionReaction, string> = {
  agree: 'Agree',
  disagree: 'Disagree',
  'not-sure': 'Not sure',
}

export const OPINION_REACTION_EMOJI: Record<OpinionReaction, string> = {
  agree: '👍',
  disagree: '👎',
  'not-sure': '🤔',
}

export interface OpinionCloudItem {
  prompt: string
  answer?: string
}

export interface OpinionCloudStatement {
  /** The statement to react to (the item's prompt). */
  prompt: string
}

/** Usable items only: prompt present, non-blank. The answer is never required. */
export function buildOpinionCloudStatements<T extends OpinionCloudItem>(
  items: T[],
  opts?: { shuffle?: <U>(arr: U[]) => U[] },
): OpinionCloudStatement[] {
  if (!items || items.length === 0) return []
  const usable = items.filter((i) => i.prompt?.trim())
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
  return shuffleFn(usable).map((item) => ({ prompt: item.prompt }))
}

/** Counts per reaction across a finished (or partial) reaction list. */
export function opinionCloudCounts(
  reactions: Array<OpinionReaction | null>,
): Record<OpinionReaction, number> {
  const counts: Record<OpinionReaction, number> = { agree: 0, disagree: 0, 'not-sure': 0 }
  for (const r of reactions) {
    if (r !== null) counts[r] += 1
  }
  return counts
}

/** True when every statement has a reaction. */
export function opinionCloudComplete(reactions: Array<OpinionReaction | null>): boolean {
  return reactions.length > 0 && reactions.every((r) => r !== null)
}

/** Shared count: one per reacted statement, every reaction counting 1 equally. */
export function opinionCloudShared(reactions: Array<OpinionReaction | null>): number {
  return reactions.filter((r) => r !== null).length
}
