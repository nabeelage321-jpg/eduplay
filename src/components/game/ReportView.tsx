'use client'

import { useEffect, useState } from 'react'
import { summarizeReportPlayers, type ReportPlayer } from '@/lib/reports'

/**
 * PUBLIC TEACHER REPORT v1 — no sign-in required. Opened from a
 * challenge view's "View report" link, it shows one live session,
 * looked up by PIN through the existing GET
 * /api/live-sessions?roomCode= endpoint — the same source the
 * challenge view uses for its results.
 *
 * What it shows, and nothing more:
 * - the game title, loaded from the public activity record for the
 *   session's activity_id (never invented; a plain fallback line if
 *   it cannot load)
 * - the session PIN
 * - every player's nickname + score, highest first
 * - a class summary computed from those real rows only: player
 *   count, total points, average score, top score
 * - "No results yet" when the session has no players (or no session
 *   exists for the PIN yet) — never invented rows
 *
 * What it does NOT show, plainly: accuracy, time taken,
 * per-question results, or a multi-session trend. A score alone
 * cannot become accuracy without total questions, the session does
 * not track time or per-question answers, and one session has no
 * trend to draw. Multi-session trends are phase 2 and need stored
 * session history.
 *
 * Child safety: nicknames only, exactly as the live leaderboard
 * shows. This report adds summary maths, not new personal data —
 * it shows no more than the session leaderboard already shows.
 */
interface ReportViewProps {
  pin: string
}

type ReportState =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'unavailable' }
  | { kind: 'ready'; players: ReportPlayer[]; activityId: string | null }

export default function ReportView({ pin }: ReportViewProps) {
  const cleanPin = String(pin ?? '').trim().toUpperCase()
  const [title, setTitle] = useState<string | null>(null)
  const [titleFailed, setTitleFailed] = useState(false)
  const [report, setReport] = useState<ReportState>({ kind: 'loading' })

  // One session, by PIN, from the existing live-session endpoint.
  useEffect(() => {
    if (!cleanPin) {
      setReport({ kind: 'none' })
      return
    }
    fetch(`/api/live-sessions?roomCode=${encodeURIComponent(cleanPin)}`)
      .then(async (res) => {
        if (res.status === 404) {
          setReport({ kind: 'none' })
          return
        }
        if (!res.ok) {
          setReport({ kind: 'unavailable' })
          return
        }
        const data = await res.json().catch(() => ({}))
        const players = Array.isArray(data.players) ? data.players : []
        const activityId =
          typeof data?.session?.activity_id === 'string' ? data.session.activity_id : null
        setReport({ kind: 'ready', players, activityId })
      })
      .catch(() => setReport({ kind: 'unavailable' }))
  }, [cleanPin])

  // Game title from the public activity record — never invented.
  const activityId = report.kind === 'ready' ? report.activityId : null
  useEffect(() => {
    if (!activityId) return
    fetch(`/api/activities/${encodeURIComponent(activityId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const name = typeof data?.activity?.title === 'string' ? data.activity.title.trim() : ''
        if (name) setTitle(name)
        else setTitleFailed(true)
      })
      .catch(() => setTitleFailed(true))
  }, [activityId])

  const summary =
    report.kind === 'ready' ? summarizeReportPlayers(report.players) : null

  return (
    <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <p style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
        📊 Teacher report
      </p>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>
        {/* The game-title fetch only runs for a ready report with an
            activityId, so the heading must NOT wait on it: once the
            report state itself is finished (rows, "No results yet",
            or unavailable), the heading is finished too. Only while
            the report is actually loading may it read "Loading…". */}
        {title ?? (report.kind === 'loading' ? 'Loading report…' : 'Session report')}
      </h1>
      {titleFailed ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>
          The game title could not be loaded, but the PIN and results below are from the live
          session itself.
        </p>
      ) : null}
      <dl style={{ display: 'grid', gap: '0.5rem', marginTop: '1.5rem' }}>
        <div>
          <dt style={{ fontWeight: 700 }}>Session PIN</dt>
          <dd style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.1em', margin: 0 }}>
            {cleanPin || '—'}
          </dd>
        </div>
      </dl>

      {report.kind === 'loading' ? (
        <p style={{ marginTop: '2rem', color: 'var(--color-text-secondary)' }}>Loading report…</p>
      ) : report.kind === 'unavailable' ? (
        <p style={{ marginTop: '2rem', color: 'var(--color-text-secondary)' }}>
          Results are not available right now. Please try again later — no scores are shown
          rather than guessed ones.
        </p>
      ) : report.kind === 'none' || !summary || summary.playerCount === 0 ? (
        <p style={{ marginTop: '2rem', color: 'var(--color-text-secondary)' }}>
          No results yet — no live session was found for this PIN yet, or the session has no
          players yet. Results appear here once players join and score.
        </p>
      ) : (
        <>
          <section aria-label="Class summary" style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Class summary</h2>
            <dl
              style={{
                marginTop: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
              }}
            >
              <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <dt style={{ fontWeight: 700 }}>Players</dt>
                <dd style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{summary.playerCount}</dd>
              </div>
              <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <dt style={{ fontWeight: 700 }}>Total points</dt>
                <dd style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{summary.total}</dd>
              </div>
              <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <dt style={{ fontWeight: 700 }}>Average score</dt>
                <dd style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
                  {summary.average.toFixed(1)}
                </dd>
              </div>
              <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <dt style={{ fontWeight: 700 }}>Top score</dt>
                <dd style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{summary.topScore}</dd>
              </div>
            </dl>
          </section>

          <section aria-label="Per-student results" style={{ marginTop: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Per-student results</h2>
            <ol style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem', padding: 0, listStyle: 'none' }}>
              {summary.players.map((player, i) => (
                <li
                  key={`${player.nickname}-${i}`}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
                >
                  <span>
                    {i + 1}. {player.nickname}
                  </span>
                  <strong>{player.score} pts</strong>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      <p style={{ color: 'var(--color-text-secondary)', marginTop: '2rem' }}>
        Nicknames only, as the live leaderboard shows. This report adds summary maths only — it
        shows no more personal data than the session leaderboard already shows.
      </p>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Not shown in this version: accuracy, time taken, and per-question results — a score
        alone cannot become accuracy without total questions, and the session does not track
        time or per-question answers. Multi-session trends are phase 2 and need stored session
        history.
      </p>
    </div>
  )
}
