'use client'

import { useState } from 'react'
import { useLiveSessionPolling } from '@/lib/hooks/useLiveSessionPolling'

/**
 * Batch 3 — INTERIM live room (teacher-host + student-join, polling).
 *
 * Teacher: enter an activity id, create a session, share the 6-letter
 * room code, Start / End the session. Students: enter the room code
 * and a nickname, join, then play the activity (link) and report
 * their score — the leaderboard refreshes for everyone every
 * 3 seconds via polling.
 *
 * Honest limits, shown in the UI: this is NOT instant realtime and
 * NOT question-by-question sync — the teacher does not yet control
 * each student's current question, and scores are client-reported.
 * It IS real cross-device state once the live tables are migrated
 * (see supabase/migrations/003_create_live_sessions.sql); without
 * those tables the API returns a clear error instead of fake data.
 */
export default function LiveSessionRoom({ locale }: { locale: string }) {
  const [mode, setMode] = useState<'host' | 'join'>('host')
  const [activityId, setActivityId] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [nickname, setNickname] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reportScore, setReportScore] = useState('')

  const { session, players, error } = useLiveSessionPolling(sessionId, 3000)

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  }

  async function createSession() {
    if (!activityId.trim()) { setMessage('Enter an activity id first.'); return }
    setBusy(true); setMessage(null)
    const { ok, data } = await postJson('/api/live-sessions', {
      activityId: activityId.trim(),
      teacherName: teacherName.trim() || 'Teacher',
      mode: 'classic',
    })
    setBusy(false)
    if (!ok) { setMessage(data.error ?? 'Could not create session.'); return }
    setSessionId(data.sessionId)
    setMessage(`Session created. Share room code: ${data.roomCode}`)
  }

  async function lookupAndJoin() {
    const code = roomCodeInput.trim().toUpperCase()
    if (!code || !nickname.trim()) { setMessage('Enter a room code and a nickname.'); return }
    setBusy(true); setMessage(null)
    const lookup = await fetch(`/api/live-sessions?roomCode=${encodeURIComponent(code)}`)
    const lookupData = await lookup.json().catch(() => ({}))
    if (!lookup.ok) { setBusy(false); setMessage(lookupData.error ?? 'Session not found.'); return }
    const id = lookupData.session.id as string
    const { ok, data } = await postJson(`/api/live-sessions/${id}/join`, { nickname: nickname.trim() })
    setBusy(false)
    if (!ok) { setMessage(data.error ?? 'Could not join session.'); return }
    setSessionId(id)
    setPlayerId(data.playerId)
    setMessage(`Joined as ${data.nickname}.`)
  }

  async function doAction(action: 'start' | 'end') {
    if (!sessionId) return
    setBusy(true)
    const { ok, data } = await postJson(`/api/live-sessions/${sessionId}/action`, { action })
    setBusy(false)
    if (!ok) setMessage(data.error ?? `Could not ${action} session.`)
    else setMessage(action === 'start' ? 'Session started.' : 'Session ended.')
  }

  async function reportMyScore() {
    if (!sessionId || !playerId) return
    const score = Number(reportScore)
    if (!Number.isFinite(score) || score < 0) { setMessage('Enter a score of 0 or more.'); return }
    const { ok, data } = await postJson(`/api/live-sessions/${sessionId}/action`, {
      action: 'score', playerId, score, correctAnswers: 0,
    })
    if (!ok) setMessage(data.error ?? 'Could not report score.')
    else setMessage(`Score reported: ${data.score}.`)
  }

  const bigBtn: React.CSSProperties = {
    width: '100%', minHeight: '56px', padding: '0.9rem 1rem', borderRadius: 'var(--radius)',
    border: 'none', background: 'var(--color-primary)', color: '#fff',
    fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', minHeight: '56px', padding: '0.9rem 1rem', fontSize: '1.05rem',
    borderRadius: 'var(--radius)', border: '2px solid var(--color-border)',
    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1rem', color: 'var(--color-text-primary)' }}>
      <p style={{
        background: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))',
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
        padding: '0.75rem 1rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)',
      }}>
        INTERIM LIVE — updates every 3 seconds by polling, not instant realtime.
        Teacher controls start/end; students report scores. Question-by-question
        sync is not in this interim.
      </p>

      {!sessionId && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
            <button onClick={() => setMode('host')} aria-pressed={mode === 'host'} style={{ ...bigBtn, background: mode === 'host' ? 'var(--color-primary)' : 'var(--color-surface)', color: mode === 'host' ? '#fff' : 'var(--color-text-primary)', border: '2px solid var(--color-border)' }}>Host a game</button>
            <button onClick={() => setMode('join')} aria-pressed={mode === 'join'} style={{ ...bigBtn, background: mode === 'join' ? 'var(--color-primary)' : 'var(--color-surface)', color: mode === 'join' ? '#fff' : 'var(--color-text-primary)', border: '2px solid var(--color-border)' }}>Join a game</button>
          </div>

          {mode === 'host' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input value={activityId} onChange={(e) => setActivityId(e.target.value)} placeholder="Activity id (from a saved activity)" aria-label="Activity id" style={inputStyle} />
              <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Your name (optional)" aria-label="Teacher name" style={inputStyle} />
              <button onClick={createSession} disabled={busy} style={bigBtn}>{busy ? 'Creating…' : 'Create session →'}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} placeholder="Room code (6 letters)" aria-label="Room code" maxLength={6} style={inputStyle} />
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Your nickname" aria-label="Nickname" maxLength={20} style={inputStyle} />
              <button onClick={lookupAndJoin} disabled={busy} style={bigBtn}>{busy ? 'Joining…' : 'Join game →'}</button>
            </div>
          )}
        </>
      )}

      {sessionId && session && (
        <div style={{ marginTop: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>Room {session.room_code}</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Status: <strong>{session.status}</strong> · Activity: {session.activity_id} · Host: {session.teacher_name}
          </p>
          {!playerId && (
            <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0', flexWrap: 'wrap' }}>
              <button onClick={() => doAction('start')} disabled={busy || session.status !== 'waiting'} style={{ ...bigBtn, flex: 1 }}>Start game</button>
              <button onClick={() => doAction('end')} disabled={busy || session.status === 'ended'} style={{ ...bigBtn, flex: 1, background: 'var(--color-danger)' }}>End game</button>
            </div>
          )}
          {playerId && (
            <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a href={`/${locale}/play/${session.activity_id}`} style={{ ...bigBtn, display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '2.2' }}>
                Play this activity →
              </a>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input value={reportScore} onChange={(e) => setReportScore(e.target.value)} placeholder="Your final score" aria-label="Your final score" inputMode="numeric" style={{ ...inputStyle, flex: 1 }} />
                <button onClick={reportMyScore} style={{ ...bigBtn, width: 'auto', padding: '0.9rem 1.25rem' }}>Report score</button>
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                After you finish playing, report your score here so it appears on the live leaderboard below.
              </p>
            </div>
          )}
          <h3 style={{ fontFamily: 'var(--font-display)', marginTop: '1.5rem' }}>🏆 Live leaderboard</h3>
          {players.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No players yet. Share the room code to invite students.</p>
          ) : (
            <ol style={{ paddingLeft: '1.25rem' }}>
              {players.map((p, i) => (
                <li key={p.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '1.05rem' }}>
                  <strong>#{i + 1} {p.nickname}</strong> — {p.score} points
                  {p.id === playerId ? ' (you)' : ''}
                </li>
              ))}
            </ol>
          )}
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
            Leaderboard refreshes automatically every 3 seconds while this page is open.
          </p>
        </div>
      )}

      {error && <p style={{ color: 'var(--color-danger)', marginTop: '1rem' }}>{error}</p>}
      {message && <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>{message}</p>}
    </div>
  )
}
