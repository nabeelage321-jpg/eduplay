'use client'

import { useEffect, useState } from 'react'
import { useLiveSessionPolling } from '@/lib/hooks/useLiveSessionPolling'

/**
 * ONE-CLICK HOST — first launch blocker (2026-11-03).
 *
 * Lives on the saved-game detail page, next to Play Now / Copy & Edit.
 * It only appears when the signed-in teacher owns this game: ownership
 * is checked against the SAME session-scoped source the /en/live
 * pick-list already uses (GET /api/my-activities: teacher_id = session
 * user only). Signed out, or viewing somebody else's game, renders
 * nothing — never an error, never a fake button.
 *
 * One click reuses the EXISTING room system, nothing new is invented:
 * POST /api/live-sessions (same call LiveSessionRoom makes), then the
 * SAME page shows the room code big, Copy + share actions, and the
 * live leaderboard polled every 3 seconds via useLiveSessionPolling
 * (the interim polling flow, NOT realtime — stated on screen).
 * The old /en/live flow (pick-list + manual id typing) is untouched
 * and stays as the fallback.
 *
 * Honest limit: the POST route itself is unchanged, so it still
 * accepts any activityId from a direct API caller — exactly as the
 * /en/live host flow already does today. This batch gates the
 * BUTTON on ownership; it does not add server-side ownership
 * enforcement, because adding it to POST would change the existing
 * /en/live host path too. That is a separate, deliberate decision.
 *
 * Students join at https://eduplay-self.vercel.app/{locale}/join and
 * enter the room code there. There is no code-prefilled deep link:
 * the join page takes a typed code, so this component does not invent
 * a ?roomCode= URL that the join page does not read.
 * Instagram has no web share endpoint, so its action honestly copies
 * the join text for pasting into Instagram instead of pretending to
 * share.
 */
interface HostLiveGameProps {
  activityId: string
  locale: string
  activityTitle: string
}

interface CreatedSession {
  sessionId: string
  roomCode: string
}

export default function HostLiveGame({ activityId, locale, activityTitle }: HostLiveGameProps) {
  const [isOwner, setIsOwner] = useState<boolean | null>(null)
  const [created, setCreated] = useState<CreatedSession | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const { session, players, error: pollError, refresh } = useLiveSessionPolling(
    created ? created.sessionId : null,
    3000,
  )

  // Ownership: same source as the /en/live pick-list. null = loading,
  // false = signed out / not this teacher's game / fetch failed — all
  // render nothing, never an error.
  useEffect(() => {
    let cancelled = false
    fetch('/api/my-activities')
      .then((res) => (res.ok ? res.json() : { activities: [] }))
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data.activities) ? data.activities : []
        setIsOwner(list.some((g: { id?: string }) => g.id === activityId))
      })
      .catch(() => {
        if (!cancelled) setIsOwner(false)
      })
    return () => {
      cancelled = true
    }
  }, [activityId])

  if (!isOwner) return null

  const joinUrl = `https://eduplay-self.vercel.app/${locale}/join`
  const roomCode = created ? created.roomCode : ''
  const shareText = created
    ? `Join my EduPlay game "${activityTitle}"! Room code: ${roomCode}. Go to ${joinUrl} and enter the code.`
    : ''
  const status = session ? session.status : 'waiting'

  async function copyText(text: string, label: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const area = document.createElement('textarea')
        area.value = text
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        document.body.removeChild(area)
      }
      setCopied(label)
    } catch {
      setCopied(null)
      setError('Copy did not work in this browser — select the code and copy it by hand.')
    }
  }

  async function createSession() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/live-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, teacherName: 'Teacher', mode: 'classic' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not create a live room.')
        return
      }
      setCreated({ sessionId: data.sessionId, roomCode: data.roomCode })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create a live room.')
    } finally {
      setBusy(false)
    }
  }

  async function doAction(action: 'start' | 'end') {
    if (!created) return
    setActionBusy(true)
    setActionMessage(null)
    try {
      const res = await fetch(`/api/live-sessions/${created.sessionId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionMessage(data.error ?? `Could not ${action} the room.`)
      } else {
        setActionMessage(action === 'start' ? 'Game started.' : 'Game ended.')
        refresh()
      }
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : `Could not ${action} the room.`)
    } finally {
      setActionBusy(false)
    }
  }

  async function genericShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: activityTitle,
          text: shareText,
          url: joinUrl,
        })
        return
      } catch {
        // User cancelled the share sheet, or share failed: fall back
        // to copying the join text instead of leaving them stuck.
      }
    }
    await copyText(shareText, 'shared')
  }

  const btnPrimary: React.CSSProperties = {
    padding: '0.875rem 1.75rem',
    background: 'var(--gradient-btn)',
    color: '#fff',
    borderRadius: 'var(--radius)',
    border: 'none',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
  }
  const btnSecondary: React.CSSProperties = {
    padding: '0.625rem 1rem',
    background: 'var(--color-surface-alt)',
    color: 'var(--color-primary)',
    borderRadius: 'var(--radius)',
    border: '2px solid var(--color-primary)',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
  }

  return (
    <section
      aria-label="Host this game live"
      style={{
        padding: '1.25rem 1.5rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        marginBottom: '1.5rem',
      }}
    >
      {!created ? (
        <>
          <h2
            style={{
              fontSize: '1.1rem',
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            🎮 Host this game live
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>
            One click creates a live room for this game — no activity id to type, no separate
            live page to visit. Students join at{' '}
            <strong>{joinUrl}</strong> with the room code.
          </p>
          <button type="button" onClick={createSession} disabled={busy} style={btnPrimary}>
            {busy ? 'Creating room…' : '🎮 Host live game'}
          </button>
          {error ? <p style={{ color: 'var(--color-danger)', marginTop: '0.75rem' }}>{error}</p> : null}
        </>
      ) : (
        <>
          <h2
            style={{
              fontSize: '1.1rem',
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              marginBottom: '0.25rem',
            }}
          >
            🎮 Live room ready
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Status: <strong>{status}</strong> · Students join at {joinUrl} and enter this code.
          </p>

          <div
            style={{
              textAlign: 'center',
              padding: '1rem',
              background: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              marginBottom: '1rem',
            }}
          >
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Room code</div>
            <div
              aria-label={`Room code ${roomCode}`}
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                letterSpacing: '0.25em',
                color: 'var(--color-text-primary)',
              }}
            >
              {roomCode}
            </div>
            <button
              type="button"
              onClick={() => copyText(roomCode, 'code')}
              style={{ ...btnSecondary, marginTop: '0.5rem' }}
            >
              📋 {copied === 'code' ? 'Copied!' : 'Copy room code'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={btnSecondary}
            >
              💬 Share on WhatsApp
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(joinUrl)}&quote=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={btnSecondary}
            >
              👍 Share on Facebook
            </a>
            <button type="button" onClick={() => copyText(shareText, 'instagram')} style={btnSecondary}>
              📸 {copied === 'instagram' ? 'Copied for Instagram!' : 'Copy for Instagram'}
            </button>
            <button type="button" onClick={genericShare} style={btnSecondary}>
              🔗 {copied === 'shared' ? 'Copied!' : 'Share anywhere'}
            </button>
            <button type="button" onClick={() => copyText(joinUrl, 'link')} style={btnSecondary}>
              {copied === 'link' ? 'Link copied!' : 'Copy join link'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => doAction('start')}
              disabled={actionBusy || status !== 'waiting'}
              style={btnPrimary}
            >
              Start game
            </button>
            <button
              type="button"
              onClick={() => doAction('end')}
              disabled={actionBusy || status === 'ended'}
              style={{ ...btnPrimary, background: 'var(--color-danger)' }}
            >
              End game
            </button>
            <a href={`/${locale}/live`} style={btnSecondary}>
              Open full live room →
            </a>
          </div>
          {actionMessage ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{actionMessage}</p>
          ) : null}
          {error ? <p style={{ color: 'var(--color-danger)' }}>{error}</p> : null}

          <h3 style={{ fontFamily: 'var(--font-display)', marginTop: '1.25rem' }}>
            🏆 Live leaderboard
          </h3>
          {pollError ? (
            <p style={{ color: 'var(--color-danger)' }}>{pollError}</p>
          ) : players.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>
              No players yet. Share the room code to invite students.
            </p>
          ) : (
            <ol style={{ paddingLeft: '1.25rem' }}>
              {players.map((p, i) => (
                <li
                  key={p.id}
                  style={{
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: '1.05rem',
                  }}
                >
                  <strong>
                    #{i + 1} {p.nickname}
                  </strong>{' '}
                  — {p.score} points
                </li>
              ))}
            </ol>
          )}
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
            Leaderboard refreshes automatically every 3 seconds while this page is open
            (polling interim, not instant realtime). The old live page at /{locale}/live still
            works exactly as before.
          </p>
        </>
      )}
    </section>
  )
}
