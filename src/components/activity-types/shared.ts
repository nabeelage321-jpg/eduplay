import type { ActivityItem, Audience, SupportedLocale } from '@/types'

/** Optional extra detail a player may pass with its final score.
 *  Only Riddle (letterHintsUsed), AsterQuiz (livesLeft), Dictation
 *  (wordsCorrect / totalWords / passagesDone), Dialogue
 *  (linesRead / totalLines / characters), Jigsaw
 *  (piecesPlaced / totalPieces), and Letter Wheel
 *  (skippedCount / missedCount) supply this today; Quiz also
 *  supplies playerName (build-list item 5) and elapsedSeconds /
 *  correctCount / totalCount. Every other type keeps calling
 *  onComplete(score) with no second argument, which stays valid. */
export interface ActivityCompletion {
  // TIMER FIX 2026-11-03: the play shell's elapsed seconds at finish
  // (0-based from play start, countdown excluded), so a host page
  // can report the shell's single elapsed time instead of its own
  // load-time timer. Only Quiz reports this so far.
  elapsedSeconds?: number
  correctCount?: number
  totalCount?: number
  // QUIZ INTRO (2026-11-07, build-list item 5): the name the player
  // typed (or had auto-filled from their signed-in account) on the
  // Quiz How-to-Play screen. Shown on the finish screen only — it
  // never changes scoring, lives, timers, or questions.
  playerName?: string
  letterHintsUsed?: number
  livesLeft?: number
  wordsCorrect?: number
  totalWords?: number
  passagesDone?: number
  linesRead?: number
  totalLines?: number
  characters?: string[]
  piecesPlaced?: number
  totalPieces?: number
  skippedCount?: number
  missedCount?: number
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
