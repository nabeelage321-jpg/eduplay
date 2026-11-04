'use client'

import { useEffect, useState } from 'react'
import { challengeCountdown, isChallengeExpired } from '@/lib/challenges'

/**
 * PUBLIC CHALLENGE VIEW v1 — no sign-in required. Opened from a
 * challenge link, it shows exactly what the link carries: the game
 * title (loaded from the public activity record, never invented),
 * the PIN, the group name if given, and the deadline with a live
 * countdown. The Join button goes to the existing join flow with the
 * PIN prefilled (the join page reads ?roomCode=, plus ?group= as the
 * guests batch already did).
 *
 * Expiry is enforced here, in plain words: once the deadline has
 * passed, the view says the challenge is expired and joining is
 * disabled — an expired challenge never silently accepts players.
 *
 * Results come ONLY from the existing live-session leaderboard for
 * the session with this PIN (GET /api/live-sessions?roomCode=). With
 * no session yet, the view honestly shows "No results yet" — never
 * invented scores, names, or ranks. Results show nicknames only,
 * exactly as the leaderboard shows; no email, phone, photo, or real
 * identity appears anywhere on this page.
 *
 * Link-only limit, stated on screen: this challenge is not stored on
 * the server in v1 — the deadline and group travel in the link, and
 * server-persistent challenges are phase 2.
 */
interface ChallengeViewProps {
  locale: string
  gameId: string
  pin: string
  group: string | null
  deadline: string | null
}

interface LivePlayer {
  nickname?: string
  score?: number
}

type ResultsState =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'unavailable' }
  | { kind: 'ready'; players: LivePlayer[] }

export default function ChallengeView({ locale, gameId, pin, group, deadline }: ChallengeViewProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [title, setTitle] = useState<string | null>(null)
  const [titleFailed, setTitleFailed] = useState(false)
  const [results, setResults] = useState<ResultsState>({ kind: 'loading' })

  // Live countdown, ticking once a second while the page is open.
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Game title from the public activity record — never invented.
  useEffect(() => {
    if (!gameId) {
      setTitleFailed(true)
      return
    }
    fetch(`/api/activities/${encodeURIComponent(gameId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const name = typeof data?.activity?.title === 'string' ? data.activity.title.trim() : ''
        if (name) setTitle(name)
        else setTitleFailed(true)
      })
      .catch(() => setTitleFailed(true))
  }, [gameId])

  // Results ONLY from the live session with this PIN, if one exists.
  useEffect(() => {
    if (!pin) {
      setResults({ kind: 'none' })
      return
    }
    fetch(`/api/live-sessions?roomCode=${encodeURIComponent(pin)}`)
      .then(async (res) => {
        if (res.status === 404) {
          setResults({ kind: 'none' })
          return
        }
        if (!res.ok) {
          setResults({ kind: 'unavailable' })
          return
        }
        const data = await res.json().catch(() => ({}))
        const players = Array.isArray(data.players) ? data.players : []
        setResults({ kind: 'ready', players })
      })
      .catch(() => setResults({ kind: 'unavailable' }))
  }, [pin])

  const expired = isChallengeExpired(deadline, nowMs)
  const countdown = challengeCountdown(deadline, nowMs)
  const joinHref = pin
    ? `/${locale}/join?roomCode=${encodeURIComponent(pin)}${group ? `&group=${encodeURIComponent(group)}` : ''}`
    : null
  const deadlineLabel = deadline
    ? new Date(deadline).toLocaleString()
    : 'No deadline in this link'

  return (
    <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <p style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
        🏆 Challenge
      </p>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>
        {title ?? (titleFailed ? 'Challenge game' : 'Loading challenge…')}
      </h1>
      {titleFailed ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>
          The game title could not be loaded from this link, but the PIN and deadline below are
          exactly what the link carries.
        </p>
      ) : null}
      <dl style={{ display: 'grid', gap: '0.5rem', marginTop: '1.5rem' }}>
        <div>
          <dt style={{ fontWeight: 700 }}>Challenge PIN</dt>
          <dd style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.1em', margin: 0 }}>
            {pin || '—'}
          </dd>
        </div>
        {group ? (
          <div>
            <dt style={{ fontWeight: 700 }}>Group</dt>
            <dd style={{ margin: 0 }}>{group}</dd>
          </div>
        ) : null}
        <div>
          <dt style={{ fontWeight: 700 }}>Deadline</dt>
          <dd style={{ margin: 0 }}>{deadlineLabel}</dd>
        </div>
        {deadline && !expired ? (
          <div>
            <dt style={{ fontWeight: 700 }}>Time left</dt>
            <dd style={{ margin: 0 }}>
              {countdown.days > 0 ? `${countdown.days}d ` : ''}
              {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
            </dd>
          </div>
        ) : null}
      </dl>

      {expired ? (
        <p
          role="alert"
          style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', fontWeight: 700 }}
        >
          This challenge has expired — joining is closed. An expired challenge does not accept
          new players.
        </p>
      ) : joinHref ? (
        <a
          href={joinHref}
          style={{ display: 'inline-flex', marginTop: '1.5rem', minHeight: '52px', alignItems: 'center', padding: '0 1.75rem', borderRadius: '9999px', background: 'var(--color-primary)', color: 'white', fontWeight: 800, fontSize: '1.125rem', textDecoration: 'none' }}
        >
          Join this challenge →
        </a>
      ) : (
        <p role="alert" style={{ marginTop: '1.5rem', fontWeight: 600 }}>
          This link has no valid PIN, so it cannot be joined.
        </p>
      )}
      {expired ? (
        <p style={{ marginTop: '0.75rem', color: 'var(--color-text-secondary)' }}>
          Joining is disabled because the deadline has passed.
        </p>
      ) : null}

      <section aria-label="Challenge results" style={{ marginTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Results</h2>
        {/* Reports v1 (master list part 5): the same leaderboard rows,
            plus summary maths, on the public report route. Nothing
            else about this view changes. */}
        {pin ? (
          <a
            href={`/${locale}/report?pin=${encodeURIComponent(pin)}`}
            style={{ display: 'inline-block', marginTop: '0.5rem', fontWeight: 700, color: 'var(--color-primary)' }}
          >
            View report →
          </a>
        ) : null}
        {results.kind === 'loading' ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading results…</p>
        ) : results.kind === 'none' ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No results yet — no live session has reported results for this PIN yet. Results appear
            here once the teacher starts the live session and players join.
          </p>
        ) : results.kind === 'unavailable' ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Results are not available right now. Please try again later — no scores are shown
            rather than guessed ones.
          </p>
        ) : results.players.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>
            No results yet — the live session exists but no player has scored yet.
          </p>
        ) : (
          <ol style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem', padding: 0, listStyle: 'none' }}>
            {results.players.map((player, i) => (
              <li
                key={`${player.nickname ?? 'player'}-${i}`}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
              >
                <span>
                  {i + 1}. {typeof player.nickname === 'string' && player.nickname ? player.nickname : 'Player'}
                </span>
                <strong>{typeof player.score === 'number' ? player.score : 0} pts</strong>
              </li>
            ))}
          </ol>
        )}
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
          Nicknames only, as the live leaderboard shows. Link only, in this version: this
          challenge is not stored on the server — server-persistent challenges come in phase 2.
        </p>
      </section>
    </div>
  )
}
