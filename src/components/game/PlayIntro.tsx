'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { typeIntro } from '@/lib/type-intro'
import { cleanPlayerName, loadPlayerName, resolvePlayerName, savePlayerName } from '@/lib/player-name'
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
 *     The panel is NOT rendered here any more: item 37 moved it
 *     into PlaySidePanel, which the play page shows on ALL THREE
 *     screens (intro, play, finish), so it never sits in the top
 *     header and is never duplicated.
 *
 * ONE SCREEN (item 23, item 37): the intro is compact on purpose
 * — name field + START button are visible in the first view with
 * no scroll. Spacing is tightened, never the type: rule text stays
 * readable (0.88rem), the title stays big (1.3rem+).
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
  typeSlug: string
  itemCount: number
  locale: SupportedLocale
  onStart: (playerName: string) => void
}

export default function PlayIntro({
  typeSlug,
  itemCount,
  locale,
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
    <div dir={rtl ? 'rtl' : 'ltr'}>
      {/* LEFT — the instructions box: beautiful, colourful, engaging.
          The right panel is NOT here any more (item 37): the play
          page renders PlaySidePanel beside this box on every
          screen (intro, play, finish). */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fff7e6 0%, #ffeef5 45%, #eaf4ff 100%)',
          border: '3px solid #ffc93c',
          borderRadius: '1.25rem',
          padding: '0.85rem 0.95rem',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <motion.div
            aria-hidden="true"
            animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: '2.1rem', lineHeight: 1 }}
          >
            {intro.icon}
          </motion.div>
          <h2
            style={{
              fontFamily: FUNKY_FONT,
              fontSize: 'clamp(1.3rem, 3.5vw, 1.6rem)',
              color: '#26264a',
              margin: '0.25rem 0 0.1rem',
              letterSpacing: '0.01em',
            }}
          >
            How to play {intro.name}!
          </h2>
          <p style={{ color: '#5b5b7a', fontSize: '0.88rem', margin: 0, fontWeight: 700 }}>
            {intro.desc} · {itemCount} {itemCount === 1 ? 'round' : 'rounds'} · Ready to play? 🚀
          </p>
        </div>

        <div style={{ display: 'grid', gap: '0.35rem' }}>
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
                padding: '0.4rem 0.6rem',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '1.1rem', lineHeight: 1.2, flexShrink: 0 }}>
                {row.icon}
              </span>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.35, color: '#26264a' }}>
                <strong style={{ fontFamily: FUNKY_FONT, fontWeight: 400 }}>{row.label}: </strong>
                {row.text}
              </p>
            </div>
          ))}
        </div>

        {/* NAME + START: the START button sits BELOW the name,
            "Skip instructions" sits under the START button. */}
        <div style={{ marginTop: '0.6rem' }}>
          <label
            htmlFor="play-intro-player-name"
            style={{
              display: 'block',
              fontFamily: FUNKY_FONT,
              fontSize: '1.05rem',
              color: '#26264a',
              marginBottom: '0.3rem',
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
              padding: '0.6rem 0.9rem',
              borderRadius: '0.85rem',
              border: '3px solid #c084fc',
              background: '#fff',
              color: '#26264a',
              fontSize: '1rem',
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
            marginTop: '0.6rem',
            width: '100%',
            padding: '0.8rem',
            borderRadius: '1rem',
            border: 'none',
            background: 'linear-gradient(90deg, #ff5a8a, #f59e0b, #22c55e, #3b82f6)',
            color: '#fff',
            fontFamily: FUNKY_FONT,
            fontSize: '1.15rem',
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
            marginTop: '0.4rem',
            padding: '0.35rem',
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
    </div>
  )
}
