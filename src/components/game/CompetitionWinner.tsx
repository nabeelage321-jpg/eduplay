'use client'

import { useEffect, useState } from 'react'
import { isChallengeExpired } from '@/lib/challenges'

/**
 * PAST WINNERS — real top scorers only, never invented.
 *
 * Reads the SAME existing endpoint the challenge view and the report
 * page read (GET /api/live-sessions?roomCode=<PIN>), nicknames only.
 * A winner is declared ONLY after the competition has ended (deadline
 * passed) AND the live session has real scores — the top scorer is the
 * winner. While the competition is still running, no winner is shown
 * at all: the leaderboard is still moving, so naming one would be a
 * guess. With no session or no scores, the section says so plainly
 * instead of inventing a name.
 *
 * No prizes are promised anywhere on this page — topping the
 * leaderboard is the reward, and the winner shown here is the top
 * scorer, not a prize recipient.
 */
interface CompetitionWinnerProps {
  pin: string
  deadline: string | null
}

interface LivePlayer {
  nickname?: string
  score?: number
}

type WinnerState =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'unavailable' }
  | { kind: 'ready'; players: LivePlayer[] }

export default function CompetitionWinner({ pin, deadline }: CompetitionWinnerProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [state, setState] = useState<WinnerState>({ kind: 'loading' })

  // Re-check expiry while the page is open, same as the challenge view.
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Results ONLY from the live session with this PIN, if one exists.
  useEffect(() => {
    if (!pin) {
      setState({ kind: 'none' })
      return
    }
    fetch(`/api/live-sessions?roomCode=${encodeURIComponent(pin)}`)
      .then(async (res) => {
        if (res.status === 404) {
          setState({ kind: 'none' })
          return
        }
        if (!res.ok) {
          setState({ kind: 'unavailable' })
          return
        }
        const data = await res.json().catch(() => ({}))
        const players = Array.isArray(data.players) ? data.players : []
        setState({ kind: 'ready', players })
      })
      .catch(() => setState({ kind: 'unavailable' }))
  }, [pin])

  const expired = isChallengeExpired(deadline, nowMs)

  if (state.kind === 'loading') {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Loading past results…</p>
  }
  if (state.kind === 'unavailable') {
    return (
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Past results are not available right now. Please try again later — no
        winner is shown rather than a guessed one.
      </p>
    )
  }
  if (state.kind === 'none' || state.players.length === 0) {
    return (
      <p style={{ color: 'var(--color-text-secondary)' }}>
        No past winners yet — winners appear here after a competition ends.
      </p>
    )
  }
  if (!expired) {
    return (
      <p style={{ color: 'var(--color-text-secondary)' }}>
        This competition is still running — the winner appears here when it
        ends. The leaderboard is still moving.
      </p>
    )
  }

  // Finished, with real scores: the top scorer is the winner.
  const ranked = [...state.players].sort(
    (a, b) => (typeof b.score === 'number' ? b.score : 0) - (typeof a.score === 'number' ? a.score : 0),
  )
  const winner = ranked[0]
  const winnerName =
    typeof winner.nickname === 'string' && winner.nickname ? winner.nickname : 'Player'
  const winnerScore = typeof winner.score === 'number' ? winner.score : 0
  const finishedLabel = deadline ? new Date(deadline).toLocaleDateString() : null

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: '1.25rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '2rem' }} aria-hidden="true">
        🏆
      </div>
      <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.5rem 0 0.25rem' }}>
        Winner: {winnerName} — {winnerScore} pts
      </p>
      <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
        Top scorer of this competition
        {finishedLabel ? ` · Finished on ${finishedLabel}` : ''}
      </p>
    </div>
  )
}
