'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { typeIntro } from '@/lib/type-intro'
import { cleanPlayerName, loadPlayerName, resolvePlayerName, savePlayerName } from '@/lib/player-name'
import ActivityIdLine from '@/components/activity-types/ActivityIdLine'
import InteractiveSoundToggle from '@/components/activity-types/InteractiveSoundToggle'
import ShareSheetButton from '@/components/game/ShareSheetButton'
import { isRTL } from '@/components/activity-types/shared'
import type { SupportedLocale } from '@/types'

/**
 * PLAY INTRO (batch-1 shared build, final list items 4 + 5 + 7).
 *
 * ONE instruction scene for ALL 40 game types — Quiz is the
 * benchmark. Before any game starts, the kid sees:
 *   LEFT (big, colourful, engaging): the type's icon + name, what
 *     to do, how scores are given, the objective, controls, timer
 *     and lives (only when that type really has them — see
 *     src/lib/type-intro.ts), and how the game ends. A call to
 *     action invites the kid to press START.
 *   NAME + START: the name field, the big START button BELOW the
 *     name, and "Skip instructions — start playing" under it.
 *     Both buttons start the game; START is the kid who read the
 *     instructions, Skip is the kid who wants to jump straight in.
 *   RIGHT (small panel): Share, sound, Activity ID, game name —
 *     and the game number when the game has one (migration 011;
 *     nothing is shown — and nothing invented — before then).
 *
 * The intro shows once per page load. Play Again never re-asks:
 * the play page owns that state. The name is the same device-local
 * name Quiz used before (account name wins, remembered name is the
 * fallback, empty is fine) and is shown on the finish screen only
 * — never scoring, never rules, never sent to a server.
 *
 * Kid-friendly, NOT like a PDF: big funky letters (Fredoka One,
 * already loaded), bright gradient header, colourful rule chips,
 * and a bouncing start button. No new font, no copied art.
 */

const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

interface PlayIntroProps {
  gameId: string
  gameTitle: string
  typeSlug: string
  itemCount: number
  locale: SupportedLocale
  showShare: boolean
  gameNumber?: number | null
  onStart: (playerName: string) => void
}

export default function PlayIntro({
  gameId,
  gameTitle,
  typeSlug,
  itemCount,
  locale,
  showShare,
  gameNumber,
  onStart,
}: PlayIntroProps) {
  const intro = typeIntro(typeSlug, itemCount)
  const rtl = isRTL(locale)
  const { data: session, status } = useSession()
  const sessionName = session?.user?.name ? cleanPlayerName(session.user.name) : ''
  const [storedName] = useState<string | null>(() => loadPlayerName())
  const [playerName, setPlayerName] = useState<string>(() =>
    resolvePlayerName(null, loadPlayerName()).name,
  )
  const nameEditedRef = useRef(false)
  const playerNameRef = useRef(playerName)

  useEffect(() => {
    if (status === 'authenticated' && sessionName && !nameEditedRef.current) {
      setPlayerName(sessionName)
    }
  }, [status, sessionName])
  useEffect(() => {
    playerNameRef.current = playerName
  }, [playerName])

  const nameSource = resolvePlayerName(sessionName, storedName).source
  const introNameHint =
    nameSource === 'account'
      ? `Signed in as ${sessionName} — we'll show this name on the finish screen. Change it if you like.`
      : nameSource === 'remembered'
        ? 'We remembered your name from last time — change it if you like.'
        : "Type your name once — we'll remember it on this device for next time."

  function start() {
    const cleaned = cleanPlayerName(playerNameRef.current)
    if (cleaned) savePlayerName(cleaned)
    onStart(cleaned)
  }

  const ruleRows: Array<{ icon: string; label: string; text: string; color: string }> = [
    { icon: '🎯', label: 'How to play', text: intro.rules.howTo, color: '#ff5a8a' },
    { icon: '⭐', label: 'Scores', text: intro.rules.scoring, color: '#f59e0b' },
    { icon: '🏆', label: 'Your goal', text: intro.rules.objective, color: '#22c55e' },
    { icon: '🎮', label: 'Controls', text: intro.rules.controls, color: '#3b82f6' },
  ]
  if (intro.rules.timer) {
    ruleRows.push({ icon: '⏱️', label: 'Timer', text: intro.rules.timer, color: '#a855f7' })
  }
  if (intro.rules.lives) {
    ruleRows.push({ icon: '❤️', label: 'Lives', text: intro.rules.lives, color: '#ef4444' })
  }
  ruleRows.push({ icon: '🏁', label: 'Finish', text: intro.rules.finish, color: '#0ea5e9' })

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.75rem 0.5rem', maxWidth: '860px', margin: '0 auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '0.75rem',
        }}
        className="eduplay-intro-grid"
      >
        <style>{`
          @media (min-width: 720px) {
            .eduplay-intro-grid { grid-template-columns: minmax(0, 1fr) 220px !important; }
          }
        `}</style>
        {/* LEFT — the instructions box: beautiful, colourful, engaging. */}
        <div
          style={{
            background: 'linear-gradient(135deg, #fff7e6 0%, #ffeef5 45%, #eaf4ff 100%)',
            border: '3px solid #ffc93c',
            borderRadius: '1.25rem',
            padding: '1rem 1.1rem',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <motion.div
              aria-hidden="true"
              animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ fontSize: '2.75rem', lineHeight: 1 }}
            >
              {intro.icon}
            </motion.div>
            <h2
              style={{
                fontFamily: FUNKY_FONT,
                fontSize: 'clamp(1.5rem, 4vw, 1.9rem)',
                color: '#26264a',
                margin: '0.4rem 0 0.15rem',
                letterSpacing: '0.01em',
              }}
            >
              How to play {intro.name}!
            </h2>
            <p style={{ color: '#5b5b7a', fontSize: '0.95rem', margin: 0, fontWeight: 700 }}>
              {intro.desc} · {itemCount} {itemCount === 1 ? 'round' : 'rounds'} · Ready to play? 🚀
            </p>
          </div>

          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {ruleRows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  gap: '0.6rem',
                  alignItems: 'flex-start',
                  background: '#fff',
                  border: `2px solid ${row.color}55`,
                  borderLeft: `6px solid ${row.color}`,
                  borderRadius: '0.85rem',
                  padding: '0.55rem 0.75rem',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '1.2rem', lineHeight: 1.2, flexShrink: 0 }}>
                  {row.icon}
                </span>
                <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.45, color: '#26264a' }}>
                  <strong style={{ fontFamily: FUNKY_FONT, fontWeight: 400 }}>{row.label}: </strong>
                  {row.text}
                </p>
              </div>
            ))}
          </div>

          {/* NAME + START: the START button sits BELOW the name,
              "Skip instructions" sits under the START button. */}
          <div style={{ marginTop: '0.9rem' }}>
            <label
              htmlFor="play-intro-player-name"
              style={{
                display: 'block',
                fontFamily: FUNKY_FONT,
                fontSize: '1.05rem',
                color: '#26264a',
                marginBottom: '0.4rem',
              }}
            >
              Your name 🙋
            </label>
            <input
              id="play-intro-player-name"
              type="text"
              value={playerName}
              maxLength={20}
              autoComplete="nickname"
              onChange={(e) => {
                nameEditedRef.current = true
                setPlayerName(e.target.value)
              }}
              placeholder="Type your name"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '0.85rem',
                border: '3px solid #c084fc',
                background: '#fff',
                color: '#26264a',
                fontSize: '1.05rem',
                fontFamily: FUNKY_FONT,
                boxSizing: 'border-box',
              }}
            />
            <p style={{ color: '#5b5b7a', fontSize: '0.85rem', margin: '0.35rem 0 0' }}>{introNameHint}</p>
          </div>

          <motion.button
            onClick={start}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }}
            style={{
              marginTop: '0.9rem',
              width: '100%',
              padding: '1rem',
              borderRadius: '1rem',
              border: 'none',
              background: 'linear-gradient(90deg, #ff5a8a, #f59e0b, #22c55e, #3b82f6)',
              color: '#fff',
              fontFamily: FUNKY_FONT,
              fontSize: '1.3rem',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(255, 90, 138, 0.4)',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            ▶ START PLAYING!
          </motion.button>
          <button
            onClick={start}
            style={{
              display: 'block',
              width: '100%',
              marginTop: '0.6rem',
              padding: '0.5rem',
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Skip instructions — start playing
          </button>
        </div>

        {/* RIGHT — the small panel: Share, sound, Activity ID, name. */}
        <aside
          style={{
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            borderRadius: '1rem',
            padding: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            alignSelf: 'start',
          }}
        >
          <p
            style={{
              fontFamily: FUNKY_FONT,
              fontSize: '1.05rem',
              color: 'var(--color-text-primary)',
              margin: 0,
              overflowWrap: 'break-word',
            }}
          >
            🎮 {gameTitle}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {intro.name} · {itemCount} {itemCount === 1 ? 'round' : 'rounds'}
          </p>
          {gameNumber != null ? (
            <p style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>
              🔢 Game No. {gameNumber}
            </p>
          ) : null}
          <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
              SHARE
            </p>
            {showShare ? (
              <ShareSheetButton gameId={gameId} gameTitle={gameTitle} locale={locale} />
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Sharing is off for this game.
              </p>
            )}
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
              SOUND
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              <span aria-hidden="true">🔊</span>
              <InteractiveSoundToggle />
            </div>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
              ACTIVITY ID
            </p>
            <ActivityIdLine id={gameId} />
          </div>
        </aside>
      </div>
    </div>
  )
}
