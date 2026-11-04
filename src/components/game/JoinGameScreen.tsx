'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { useGameStore } from '@/lib/store/game-store'
import {
  cleanGroupName,
  loadGuestNicknames,
  rememberGuestNickname,
  saveGroupName,
} from '@/lib/guests'

interface JoinGameScreenProps {
  locale: string
}

// JOIN FLOW FIX 2026-11-02 — the old flow pushed EVERY code, real or not,
// to the play page for activity id 0, and activity 0 does not exist, so any code
// (including the ABC123 placeholder example) landed on a bare
// "Activity Not Found" page. This flow now looks the code up first
// against the real interim live-session API (GET /api/live-sessions
// ?roomCode=, the same lookup /live uses; polling interim, NOT
// Realtime) and only navigates when a session — and its activity —
// really exists. Anything else stays on this page with a plain
// inline error. No navigation to activity 0, ever.
const FLOATERS = [
  { char: '⭐', left: '8%', top: '16%', size: '2rem', delay: 0 },
  { char: '☁️', left: '86%', top: '14%', size: '2.2rem', delay: 0.6 },
  { char: '🎲', left: '12%', top: '72%', size: '2rem', delay: 1.1 },
  { char: '🌈', left: '88%', top: '66%', size: '2rem', delay: 0.3 },
  { char: '🧩', left: '46%', top: '8%', size: '1.8rem', delay: 1.5 },
]

export default function JoinGameScreen({ locale }: JoinGameScreenProps) {
  const t = useTranslations('game')
  const router = useRouter()
  const joinGame = useGameStore((state) => state.joinGame)
  const reduceMotion = useReducedMotion()

  const [roomCode, setRoomCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // GUESTS/GROUPS v1 (device-local only, see src/lib/guests.ts):
  // previous nicknames typed on this device, offered as tap-to-pick
  // chips — an optional shortcut, never a requirement and never a
  // login wall; and a group name from the host's invitation link
  // (?group=), shown on this page so a guest knows which group the
  // session belongs to. Neither is collected from, or sent to, a
  // server; the group name is stored on this device keyed by the
  // session once the code lookup succeeds.
  const [previousNicknames, setPreviousNicknames] = useState<string[]>([])
  const [invitationGroup, setInvitationGroup] = useState<string | null>(null)
  useEffect(() => {
    setPreviousNicknames(loadGuestNicknames())
    try {
      const params = new URLSearchParams(window.location.search)
      const group = cleanGroupName(params.get('group') ?? '')
      if (group) setInvitationGroup(group)
      // CHALLENGES v1 (additive only): a challenge Join button links here
      // with ?roomCode=<PIN> (pin= accepted as an alias), so the PIN is
      // prefilled instead of retyped. A typed code still works exactly
      // as before, and a missing or bogus code still goes through the
      // same lookup-then-error flow below — nothing else changed.
      const prefilled = (params.get('roomCode') ?? params.get('pin') ?? '').trim().toUpperCase()
      if (prefilled) setRoomCode(prefilled)
    } catch {
      /* no invitation group — join works exactly as before */
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!roomCode.trim()) {
      setError('Room code is required')
      return
    }

    if (!nickname.trim()) {
      setError('Nickname is required')
      return
    }

    if (nickname.length > 20) {
      setError('Nickname must be 20 characters or less')
      return
    }

    setIsValidating(true)
    setError(null)

    try {
      // 1. Look the code up. A code that is not a live session (for
      // example the ABC123 placeholder) answers 404 here, and the
      // user stays on this page with a plain error — never a dead
      // play page.
      const code = roomCode.trim().toUpperCase()
      const lookupRes = await fetch(`/api/live-sessions?roomCode=${encodeURIComponent(code)}`)
      const lookupData = await lookupRes.json().catch(() => ({}))
      if (!lookupRes.ok) {
        if (lookupRes.status === 404) {
          setError(t('roomNotFound'))
        } else if (lookupRes.status === 503) {
          setError(t('liveUnavailable'))
        } else {
          setError(lookupData.error ?? t('joinFailed'))
        }
        setIsValidating(false)
        return
      }
      const session = lookupData.session as { id?: string; activity_id?: string; status?: string } | undefined
      const activityId = String(session?.activity_id ?? '').trim()
      if (!session?.id || !activityId) {
        setError(t('roomNotFound'))
        setIsValidating(false)
        return
      }
      if (session.status === 'ended') {
        setError(t('sessionEnded'))
        setIsValidating(false)
        return
      }

      // 1b. Remember a group name from the host's invitation, keyed
      // by this session, so the session/leaderboard view on this
      // device can show it. Sessions without a group name skip this
      // and behave exactly as before.
      if (invitationGroup) {
        saveGroupName({ sessionId: session.id, roomCode: code, name: invitationGroup })
      }

      // 2. Register the player on the session (same as /live does),
      // so the live leaderboard sees this player.
      const joinRes = await fetch(`/api/live-sessions/${session.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      })
      const joinData = await joinRes.json().catch(() => ({}))
      if (!joinRes.ok) {
        if (joinRes.status === 410) {
          setError(t('sessionEnded'))
        } else {
          setError(joinData.error ?? t('joinFailed'))
        }
        setIsValidating(false)
        return
      }

      // 3. Only now navigate — to the session's REAL activity id,
      // never to activity 0. Remember this nickname on this device
      // so a returning guest can tap it next time instead of
      // retyping it; the join itself is unchanged.
      rememberGuestNickname(nickname.trim())
      joinGame(code, nickname.trim())
      router.push(`/${locale}/activity/${activityId}/play?roomCode=${encodeURIComponent(code)}`)
    } catch {
      setError(t('roomCheckFailed'))
      setIsValidating(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-background)', position: 'relative', overflow: 'hidden' }}>
      {FLOATERS.map((f) =>
        reduceMotion ? (
          <span key={f.char + f.left} aria-hidden="true" style={{ position: 'absolute', left: f.left, top: f.top, fontSize: f.size, opacity: 0.7 }}>
            {f.char}
          </span>
        ) : (
          <motion.span
            key={f.char + f.left}
            aria-hidden="true"
            style={{ position: 'absolute', left: f.left, top: f.top, fontSize: f.size, opacity: 0.7 }}
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, delay: f.delay, ease: 'easeInOut' }}
          >
            {f.char}
          </motion.span>
        ),
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
        style={{ position: 'relative' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <Image src="/eduplay-mascot.png" alt="" width={96} height={96} style={{ width: 96, height: 96, objectFit: 'contain' }} priority={false} />
        </div>
        <div className="rounded-lg p-8" style={{ backgroundColor: 'var(--color-surface)' }}>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {t('joinGame')}
          </h1>
          <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {t('enterCodeNickname')}
          </p>

          {invitationGroup ? (
            <p className="mb-4 p-3 rounded-lg text-center font-semibold" style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-primary)' }}>
              👥 Joining group: {invitationGroup}
            </p>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="room-code" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t('roomCode')}
              </label>
              <input
                id="room-code"
                type="text"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase())
                  setError(null)
                }}
                placeholder="E.g., ABC123"
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg border-2 text-center text-2xl font-mono tracking-widest uppercase"
                style={{
                  borderColor: error ? 'var(--color-danger)' : 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  minHeight: 48,
                }}
                autoComplete="off"
                aria-label={t('roomCode')}
              />
            </div>

            {previousNicknames.length > 0 ? (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Played before on this device? Tap your nickname:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {previousNicknames.map((previous) => (
                    <button
                      key={previous}
                      type="button"
                      onClick={() => {
                        setNickname(previous)
                        setError(null)
                      }}
                      aria-label={`Use nickname ${previous}`}
                      className="px-3 py-2 rounded-lg border-2 font-semibold"
                      style={{
                        borderColor: 'var(--color-border)',
                        backgroundColor: 'var(--color-background)',
                        color: 'var(--color-text-primary)',
                        minHeight: 40,
                        cursor: 'pointer',
                      }}
                    >
                      {previous}
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  Saved only on this device. You can still type a different nickname below.
                </p>
              </div>
            ) : null}

            <div className="mb-4">
              <label htmlFor="nickname" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t('nickname')}
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value)
                  setError(null)
                }}
                placeholder={t('enterNickname')}
                maxLength={20}
                className="w-full px-4 py-3 rounded-lg border-2"
                style={{
                  borderColor: error ? 'var(--color-danger)' : 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  minHeight: 48,
                }}
                autoComplete="off"
                aria-label={t('nickname')}
              />
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                {nickname.length}/20
              </p>
            </div>

            {error && (
              <div role="alert" className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: 'var(--color-danger)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!roomCode || !nickname || isValidating}
              className="w-full py-3 rounded-lg font-semibold transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                minHeight: 48,
              }}
              aria-label={t('joinButton')}
            >
              {isValidating ? t('joining') : t('joinButton')}
            </button>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('askTeacherCode')}
          </p>
        </div>

        <ol className="mt-6 space-y-2" style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
          <li>1. {t('joinStep1')}</li>
          <li>2. {t('joinStep2')}</li>
          <li>3. {t('joinStep3')}</li>
        </ol>
      </motion.div>
    </div>
  )
}
