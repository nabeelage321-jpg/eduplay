'use client'

import { useEffect, useState } from 'react'
import { useLiveSessionPolling } from '@/lib/hooks/useLiveSessionPolling'
import {
  cleanGroupName,
  loadGroupName,
  loadGuestNicknames,
  rememberGuestNickname,
  saveGroupName,
} from '@/lib/guests'
import { clearLiveRoom, countPlayed, loadLiveRoom, saveLiveRoom } from '@/lib/live-room'
import SessionReport from '@/components/game/SessionReport'

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
export default function LiveSessionRoom({ locale, initialMode, initialCode }: { locale: string; initialMode?: 'host' | 'join' | null; initialCode?: string | null }) {
  const [mode, setMode] = useState<'host' | 'join'>(initialMode ?? 'host')
  const [activityId, setActivityId] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [roomCodeInput, setRoomCodeInput] = useState(initialCode ?? '')
  const [nickname, setNickname] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // LIVE RECORDS 2026-11-08: true while a remembered room is being
  // validated after a reload. The choice UI stays hidden during
  // this window so the page does not flash back to host/join.
  const [restoring, setRestoring] = useState(false)

  // TEACHER-ID / LIVE-PICK BATCH 2026-11-02. The teacher's own saved
  // games, from the same session-scoped source as the Dashboard list
  // (GET /api/my-activities: teacher_id = session user only). null =
  // still loading; [] = signed out, no users row, or no saved games —
  // all three render the same plain empty line, never an error and
  // never fake games. Clicking a row fills the Activity id input;
  // typing in the input still works exactly as before.
  interface MyGame {
    id: string
    title: string
    type: string | null
    subject: string | null
    grade: string | null
  }
  const [myGames, setMyGames] = useState<MyGame[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/my-activities')
      .then((res) => (res.ok ? res.json() : { activities: [] }))
      .then((data) => {
        if (!cancelled) setMyGames(Array.isArray(data.activities) ? data.activities : [])
      })
      .catch(() => {
        if (!cancelled) setMyGames([])
      })
    return () => { cancelled = true }
  }, [])
  const [reportScore, setReportScore] = useState('')

  const { session, players, error } = useLiveSessionPolling(sessionId, 3000)

  // LIVE RECORDS 2026-11-08: restore an open room after a reload
  // (or coming back from the play page). The stored record only
  // re-opens a room that still exists — the validation effect below
  // forgets ended or missing rooms instead of resurrecting them,
  // and restore never creates a session or a player row.
  useEffect(() => {
    const stored = loadLiveRoom()
    if (!stored) return
    setSessionId(stored.sessionId)
    if (stored.playerId) setPlayerId(stored.playerId)
    if (stored.nickname) setNickname(stored.nickname)
    setRestoring(true)
  }, [])

  // LIVE RECORDS 2026-11-08: validate a restored room once the
  // polling hook answers. While restoring, a transient poll error
  // is NOT fatal — the next poll retries; only a "not found" answer
  // forgets the room. An ended room is forgotten (choice screen on
  // the next visit), and a player whose player row is gone re-joins
  // manually instead of silently landing on the host controls.
  useEffect(() => {
    if (!restoring) return
    if (error && /not found/i.test(error)) {
      clearLiveRoom()
      setSessionId(null)
      setPlayerId(null)
      setRestoring(false)
      setMessage('That room is no longer available.')
      return
    }
    if (!session) return
    if (session.status === 'ended') {
      clearLiveRoom()
      setSessionId(null)
      setPlayerId(null)
      setRestoring(false)
      return
    }
    const stored = loadLiveRoom()
    if (stored?.role === 'player' && stored.playerId && !players.some((p) => p.id === stored.playerId)) {
      clearLiveRoom()
      setSessionId(null)
      setPlayerId(null)
      setRestoring(false)
      setMessage('Your player spot in that room is gone — join again with the room code.')
      return
    }
    setRestoring(false)
  }, [restoring, session, players, error])

  // GUESTS/GROUPS v1 (device-local only, see src/lib/guests.ts):
  // optional group name on the host side, stored on this device
  // keyed by session id and room code and shown above the
  // leaderboard; previous nicknames on the join side, offered as
  // tap-to-pick chips. No group name = exactly as before. No
  // database column, migration, or API change is involved, so a
  // group name is not server-persistent on other devices on its
  // own — that is phase 2, not this batch.
  const [groupName, setGroupName] = useState('')
  const [displayGroup, setDisplayGroup] = useState<string | null>(null)
  const [previousNicknames, setPreviousNicknames] = useState<string[]>([])
  useEffect(() => {
    setPreviousNicknames(loadGuestNicknames())
  }, [])
  useEffect(() => {
    if (!sessionId) {
      setDisplayGroup(null)
      return
    }
    setDisplayGroup(loadGroupName({ sessionId, roomCode: session?.room_code ?? null }))
  }, [sessionId, session?.room_code])

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
    const group = cleanGroupName(groupName)
    if (group) {
      saveGroupName({ sessionId: data.sessionId, roomCode: data.roomCode, name: group })
      setDisplayGroup(group)
    }
    setSessionId(data.sessionId)
    // LIVE RECORDS 2026-11-08: remember the room on this device so
    // a reload restores it (validation above still applies).
    saveLiveRoom({ sessionId: data.sessionId, roomCode: data.roomCode, role: 'host' })
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
    rememberGuestNickname(nickname.trim())
    setDisplayGroup(loadGroupName({ sessionId: id, roomCode: code }))
    setSessionId(id)
    setPlayerId(data.playerId)
    // LIVE RECORDS 2026-11-08: remember the room on this device so
    // a reload (or coming back from the play page) restores it.
    saveLiveRoom({ sessionId: id, roomCode: code, role: 'player', playerId: data.playerId, nickname: nickname.trim() })
    setMessage(`Joined as ${data.nickname}.`)
  }

  async function doAction(action: 'start' | 'end') {
    if (!sessionId) return
    setBusy(true)
    const { ok, data } = await postJson(`/api/live-sessions/${sessionId}/action`, { action })
    setBusy(false)
    if (!ok) setMessage(data.error ?? `Could not ${action} session.`)
    else {
      setMessage(action === 'start' ? 'Session started.' : 'Session ended.')
      // LIVE RECORDS 2026-11-08: ending forgets the room on this
      // device — the next reload shows the choice screen, never a
      // resurrected ended room. The room view itself stays put until
      // the teacher leaves it, so the final leaderboard + report
      // remain visible (and stay in the Dashboard rooms list).
      if (action === 'end') clearLiveRoom()
    }
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

      {restoring && (
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>Restoring your room…</p>
      )}

      {!sessionId && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
            <button onClick={() => setMode('host')} aria-pressed={mode === 'host'} style={{ ...bigBtn, background: mode === 'host' ? 'var(--color-primary)' : 'var(--color-surface)', color: mode === 'host' ? '#fff' : 'var(--color-text-primary)', border: '2px solid var(--color-border)' }}>Host a game</button>
            <button onClick={() => setMode('join')} aria-pressed={mode === 'join'} style={{ ...bigBtn, background: mode === 'join' ? 'var(--color-primary)' : 'var(--color-surface)', color: mode === 'join' ? '#fff' : 'var(--color-text-primary)', border: '2px solid var(--color-border)' }}>Join a game</button>
          </div>

          {mode === 'host' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myGames !== null && myGames.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                  No saved games yet — <a href={`/${locale}/create`} style={{ color: 'var(--color-primary)' }}>create one first</a>
                </p>
              ) : myGames !== null ? (
                <div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
                    Your saved games — tap one to fill the Activity id:
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
                    {myGames.map((game) => {
                      const selected = activityId === game.id
                      return (
                        <li key={game.id}>
                          <button
                            type="button"
                            onClick={() => setActivityId(game.id)}
                            aria-pressed={selected}
                            style={{
                              width: '100%', minHeight: '48px', textAlign: 'left', cursor: 'pointer',
                              padding: '0.6rem 0.9rem', borderRadius: 'var(--radius)',
                              border: selected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                              background: selected
                                ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))'
                                : 'var(--color-surface)',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            <span style={{ display: 'block', fontWeight: 700 }}>{game.title}</span>
                            <span style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                              {[game.subject, game.grade, game.type].filter(Boolean).join(' · ')}
                              {selected ? ' · ✓ Selected' : ''}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
              <input value={activityId} onChange={(e) => setActivityId(e.target.value)} placeholder="Activity id (from a saved activity)" aria-label="Activity id" style={inputStyle} />
              <input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Your name (optional)" aria-label="Teacher name" style={inputStyle} />
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name (optional)" aria-label="Group name" maxLength={30} style={inputStyle} />
              <button onClick={createSession} disabled={busy} style={bigBtn}>{busy ? 'Creating…' : 'Create session →'}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} placeholder="Room code (6 letters)" aria-label="Room code" maxLength={6} style={inputStyle} />
              {previousNicknames.length > 0 ? (
                <div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
                    Played before on this device? Tap your nickname:
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {previousNicknames.map((previous) => (
                      <button
                        key={previous}
                        type="button"
                        onClick={() => setNickname(previous)}
                        aria-label={`Use nickname ${previous}`}
                        style={{ padding: '0.5rem 0.9rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {previous}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
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
              {/* LIVE-JOIN FIX 2026-11-08: the Play link carries the
                  session + player proof (?session=&player=). A hosted
                  PRIVATE game 404s on the general play route for
                  anyone but its owner, so without these params the
                  joiner lands on "Activity Not Found". The play page
                  uses them to load the game through the session-scoped
                  endpoint (GET /api/live-sessions/[id]/activity),
                  which serves it only to a joined player of this
                  session (or the owner). The legacy /play/[id] link
                  308-redirects to /activity/[id]/play and Next.js
                  preserves the query string. */}
              <a href={`/${locale}/play/${session.activity_id}?session=${sessionId}&player=${playerId}`} style={{ ...bigBtn, display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '2.2' }}>
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
          {displayGroup ? (
            <p style={{ fontWeight: 700, marginTop: '1.5rem', marginBottom: 0 }}>👥 Group: {displayGroup}</p>
          ) : null}
          <h3 style={{ fontFamily: 'var(--font-display)', marginTop: displayGroup ? '0.5rem' : '1.5rem' }}>🏆 Live leaderboard</h3>
          {/* LIVE RECORDS 2026-11-08: the host sees how many students
              actually played, not just who joined. */}
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            🎓 {countPlayed(players)} student{countPlayed(players) === 1 ? '' : 's'} played
          </p>
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
          {/* LIVE RECORDS 2026-11-08: the same report the Dashboard
              rooms list shows — printable, and gone 3 days after the
              room was created (free plan). */}
          <SessionReport
            roomCode={session.room_code}
            createdAt={session.created_at}
            players={players}
          />
        </div>
      )}

      {error && <p style={{ color: 'var(--color-danger)', marginTop: '1rem' }}>{error}</p>}
      {message && <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>{message}</p>}
    </div>
  )
}
