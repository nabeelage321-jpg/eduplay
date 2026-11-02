import type { ActivityItem, Audience, SupportedLocale } from '@/types'

/** Optional extra detail a player may pass with its final score.
 *  Only Riddle supplies this today; every other type keeps calling
 *  onComplete(score) with no second argument, which stays valid. */
export interface ActivityCompletion {
  correctCount?: number
  totalCount?: number
  letterHintsUsed?: number
}

export interface ActivityProps {
  items: ActivityItem[]
  theme: Audience
  locale: SupportedLocale
  onComplete: (score: number, details?: ActivityCompletion) => void
}

export interface FeedbackState {
  type: 'correct' | 'wrong' | 'idle'
  message: string
  points: number
}

export const SCORE_PER_CORRECT = 10
export const TIMER_DEFAULT = 30

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function isRTL(locale: SupportedLocale): boolean {
  return locale === 'ur' || locale === 'ar'
}

export const feedbackMessages = {
  correct: ['Correct! +10', 'Great job! +10', 'Excellent! +10', '⭐ +10'],
  wrong: ['Try again!', 'Not quite!', 'Keep going!', 'Almost there!'],
}

export function getRandomFeedback(type: 'correct' | 'wrong'): string {
  const msgs = feedbackMessages[type]
  return msgs[Math.floor(Math.random() * msgs.length)]
}
