'use client'

import { useEffect, useState } from 'react'
import {
  encouragementFor,
  levelForPoints,
  loadStreak,
  pointsToNextLevel,
  type FinishResult,
  type StreakProgress,
} from '@/lib/streak'

/**
 * STREAK BADGE v1 (2026-11-04, master-list part 7). Device-local only:
 * it reads this browser's localStorage after mount (never during
 * server render, so there is no hydration mismatch and no invented
 * number on a fresh device).
 *
 * Fresh device (no finished game on this device): NO streak number
 * is shown — a "0-day streak" is never presented as an achievement.
 * Only the honest starter line appears.
 *
 * The missed-day rule is stated plainly under the badge, not hidden:
 * miss a day and the streak goes back to zero.
 */
export function StreakBadge() {
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState<StreakProgress | null>(null)

  useEffect(() => {
    setMounted(true)
    setProgress(loadStreak())
  }, [])

  if (!mounted) return null

  if (progress === null) {
    return (
      <div style={{ textAlign: 'center', padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>
        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
          ⭐ Play a game to start your streak
        </p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
          Finish a game and your streak begins — one finished game a day keeps it alive.
        </p>
      </div>
    )
  }

  const level = levelForPoints(progress.totalPoints)
  return (
    <div style={{ textAlign: 'center', padding: '0.75rem 1rem', color: 'var(--color-text-primary)' }}>
      <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
        🔥 {progress.streakDays}-day streak · ⭐ Level {level} · {progress.totalPoints} points
      </p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
        {pointsToNextLevel(progress.totalPoints)} points to Level {level + 1}. Miss a day and your streak goes back to zero.
      </p>
    </div>
  )
}

/**
 * End-screen line after a real finish on the play page. It shows the
 * streak and level from the finish just recorded, plus the star
 * helper's encouragement line. It never alters the game's own score.
 */
export function StreakFinishLine({ result }: { result: FinishResult }) {
  const { progress, level } = result
  return (
    <div style={{
      marginTop: '1rem', padding: '0.75rem 1rem',
      background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)',
    }}>
      <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
        🔥 Streak: {progress.streakDays} {progress.streakDays === 1 ? 'day' : 'days'} · ⭐ Level {level}
      </p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
        {encouragementFor(result)}
      </p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        {progress.totalPoints} points in total · {pointsToNextLevel(progress.totalPoints)} points to Level {level + 1} ·
        Miss a day and your streak goes back to zero.
      </p>
    </div>
  )
}
