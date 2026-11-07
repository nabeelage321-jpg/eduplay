import type { ActivityCompletion } from '@/components/activity-types/shared'

/**
 * Game feel — finish math (2026-11-07, build-list item 4).
 * Pure helpers, so tests can prove the finish split without a browser.
 *
 * The owner's split: 50% and above is "good marks" (fireworks);
 * below 50% the player gets "Play again" as ENCOURAGEMENT, never
 * as punishment — no failure wording, no red "failed" language.
 * A player that does not report correct/total counts gets the plain
 * finish screen, exactly as before.
 */

/** Percent of correct answers from completion details, or null when the player did not report counts. */
export function completionPercent(details?: ActivityCompletion | null): number | null {
  if (!details || details.correctCount == null || !details.totalCount) return null
  return Math.round((details.correctCount / details.totalCount) * 100)
}

export type FinishCelebration = 'fireworks' | 'encourage' | 'plain'

export function finishCelebration(percent: number | null): FinishCelebration {
  if (percent == null) return 'plain'
  return percent >= 50 ? 'fireworks' : 'encourage'
}

/**
 * Is this a PERFECT score — every answer right AND full marks?
 * Percent alone is not enough: a game with a hint cost (Categorize
 * hints cost 5 marks each) can have 100% of the answers right with
 * a score below the maximum, and calling that "PERFECT SCORE!" would
 * be a lie. When the maximum is unknown (the player reported no
 * counts), percent alone decides, exactly as before.
 */
export function isPerfectScore(
  percent: number | null,
  score: number | null,
  maxScore: number | null,
): boolean {
  if (percent !== 100) return false
  if (maxScore == null || score == null) return true
  return score >= maxScore
}
