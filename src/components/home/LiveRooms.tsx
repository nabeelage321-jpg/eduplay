'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { gameNumberHref, liveHostHref, liveJoinHref, parseGameNumber, parseLiveCode } from '@/lib/live-rooms'

/**
 * Live Game Rooms — homepage section, right under Spin the Wheel
 * (2026-11-08, owner order: the live-room option belongs on the
 * homepage, not only in the nav). Kid-friendly, big and colourful,
 * same style as the Spin the Wheel section.
 *
 * Three actions, all wired into EXISTING flows — nothing is rebuilt
 * here, no session logic, no API calls:
 * - "Host a game" → /{locale}/live in host mode (hosting itself
 *   keeps its existing sign-in behaviour on the live page).
 * - "Join a game" → room-code input + Join button → /{locale}/live
 *   in join mode with the code prefilled.
 * - "Play a game with number" → game-number input + Play button →
 *   /{locale}/game-number?number=<digits> (the existing number
 *   route the play-games page already uses).
 * No sign-in needed to SEE the section. English wording for every
 * locale (no translations invented), like the other homepage sections.
 */
export default function LiveRooms({ locale }: { locale: string }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const validCode = parseLiveCode(code) !== null
  const [gameNumber, setGameNumber] = useState('')
  const validGameNumber = parseGameNumber(gameNumber) !== null

  function join() {
    if (!validCode) return
    router.push(liveJoinHref(locale, code))
  }

  function playByNumber() {
    const href = gameNumberHref(locale, gameNumber)
    if (!href) return
    router.push(href)
  }

  const cardStyle = {
    flex: 1,
    minWidth: '260px',
    borderRadius: '1.5rem',
    border: '2px solid var(--color-text-primary)',
    padding: '1.75rem 1.5rem',
    textAlign: 'center' as const,
  }
  const bigBtnStyle = {
    display: 'inline-flex',
    minHeight: '56px',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    borderRadius: '9999px',
    padding: '0 1.75rem',
    fontSize: '1.125rem',
    fontWeight: 800,
    cursor: 'pointer',
    border: 'none',
  } as const

  return (
    <section aria-labelledby="live-rooms-title" style={{ margin: '0 auto', maxWidth: '80rem', padding: '3rem 1rem 4rem', textAlign: 'center' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)' }}>
        Play together
      </p>
      <h2 id="live-rooms-title" style={{ marginTop: '0.5rem', fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
        Live Game Rooms 🎮
      </h2>
      <p style={{ marginTop: '0.75rem', fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
        Host a game for your class — or join one with a room code!
      </p>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* HOST — teachers host from their own saved games. */}
        <div style={{ ...cardStyle, background: '#F3E8FF' }}>
          <div style={{ fontSize: '2.5rem' }} aria-hidden>🎤</div>
          <h3 style={{ marginTop: '0.5rem', fontSize: '1.375rem', fontWeight: 800, color: '#26264A' }}>Host a game</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '1rem', fontWeight: 600, lineHeight: 1.5, color: '#4A4A6A' }}>
            Pick one of your games, share the room code, and watch the leaderboard fill up!
          </p>
          <button
            type="button"
            onClick={() => router.push(liveHostHref(locale))}
            style={{ ...bigBtnStyle, marginTop: '1.25rem', background: 'var(--color-primary)', color: 'white' }}
          >
            🎤 Host a game
          </button>
        </div>

        {/* JOIN — kids join with a 6-character room code, no account. */}
        <div style={{ ...cardStyle, background: '#D1FAE5' }}>
          <div style={{ fontSize: '2.5rem' }} aria-hidden>🔑</div>
          <h3 style={{ marginTop: '0.5rem', fontSize: '1.375rem', fontWeight: 800, color: '#26264A' }}>Join a game</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '1rem', fontWeight: 600, lineHeight: 1.5, color: '#4A4A6A' }}>
            Got a room code from your teacher? Type it in and jump straight in!
          </p>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="Room code"
              aria-label="Room code"
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              style={{
                width: '11rem',
                minHeight: '56px',
                borderRadius: '9999px',
                border: '2px solid var(--color-text-primary)',
                background: 'white',
                padding: '0 1.25rem',
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '0.2em',
                textAlign: 'center',
                textTransform: 'uppercase',
                color: '#26264A',
              }}
            />
            <button
              type="button"
              onClick={join}
              disabled={!validCode}
              style={{
                ...bigBtnStyle,
                background: validCode ? 'var(--color-primary)' : 'var(--color-border)',
                color: 'white',
                opacity: validCode ? 1 : 0.6,
                cursor: validCode ? 'pointer' : 'not-allowed',
              }}
            >
              Join →
            </button>
          </div>
        </div>

        {/* PLAY BY NUMBER — a kid types the game number a teacher
            gave them and the game opens (existing /game-number route). */}
        <div style={{ ...cardStyle, background: '#FEF3C7' }}>
          <div style={{ fontSize: '2.5rem' }} aria-hidden>🔢</div>
          <h3 style={{ marginTop: '0.5rem', fontSize: '1.375rem', fontWeight: 800, color: '#26264A' }}>Play a game with number</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '1rem', fontWeight: 600, lineHeight: 1.5, color: '#4A4A6A' }}>
            Got a game number from your teacher? Type it to open that game.
          </p>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <input
              value={gameNumber}
              onChange={(e) => setGameNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="e.g. 100123"
              aria-label="Game number"
              inputMode="numeric"
              maxLength={6}
              autoComplete="off"
              style={{
                width: '11rem',
                minHeight: '56px',
                borderRadius: '9999px',
                border: '2px solid var(--color-text-primary)',
                background: 'white',
                padding: '0 1.25rem',
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '0.2em',
                textAlign: 'center',
                color: '#26264A',
              }}
            />
            <button
              type="button"
              onClick={playByNumber}
              disabled={!validGameNumber}
              style={{
                ...bigBtnStyle,
                background: validGameNumber ? 'var(--color-primary)' : 'var(--color-border)',
                color: 'white',
                opacity: validGameNumber ? 1 : 0.6,
                cursor: validGameNumber ? 'pointer' : 'not-allowed',
              }}
            >
              Play →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
