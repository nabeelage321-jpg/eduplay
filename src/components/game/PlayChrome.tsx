'use client'

import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'

// SHARED PLAY-SCREEN CHROME (2026-11-07, owner 18:23 PKT —
// "time ticking live, hearts, Word 5 of 10, How to play, ye bi
// achay hona chayan, aur ya white color behtar nahi ho sakta").
// One kid-style set used by every shell-wrapped game, so all of
// them look the same: chunky gradient pills, Fredoka One, white
// rings, chunky shadows. No game rule, score, sound, or layout
// lives here — only how the chrome looks. Fredoka One, already
// loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

const PILL_BASE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  color: '#fff',
  fontFamily: FUNKY_FONT,
  fontWeight: 800,
  padding: '0.35rem 0.8rem',
  borderRadius: '9999px',
  border: '2px solid #fff',
  textShadow: '0 1px 3px rgba(0,0,0,0.2)',
  whiteSpace: 'nowrap',
  lineHeight: 1.3,
}

/** The round timer, ticking live: it POPS a little every second
 *  (the motion span remounts on tickKey), and under the warning
 *  threshold it turns warm/red and pulses faster, so a kid FEELS
 *  the time running out. `display` is the text shown (e.g. "42s"
 *  or "1:34"); `warning` decides the colour. */
export function TimerChip({ display, warning, tickKey, label }: {
  display: string
  warning: boolean
  tickKey: number | string
  label?: string
}) {
  return (
    <motion.span
      key={tickKey}
      initial={{ scale: warning ? 1.35 : 1.2 }}
      animate={{ scale: 1 }}
      transition={{ duration: warning ? 0.15 : 0.25 }}
      aria-live="polite"
      aria-label={label ?? display}
      style={{
        ...PILL_BASE,
        fontSize: '1rem',
        background: warning
          ? 'linear-gradient(135deg, #f97316, #ef4444)'
          : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
        boxShadow: warning
          ? '0 3px 0 rgba(0,0,0,0.15), 0 6px 14px rgba(239,68,68,0.45)'
          : '0 3px 0 rgba(0,0,0,0.15), 0 6px 14px rgba(59,130,246,0.35)',
      }}
    >
      ⏱ {display}
    </motion.span>
  )
}

/** Lives as big chunky hearts. A lost heart does not just vanish:
 *  it remounts (keyed by filled state) and pops/fades into a grey
 *  heart, so the loss is visible. The count text stays, as before. */
export function LivesHearts({ lives, maxLives }: { lives: number; maxLives: number }) {
  const safeLives = Math.max(0, Math.min(maxLives, lives))
  return (
    <span
      aria-live="polite"
      aria-label={`${safeLives} ${safeLives === 1 ? 'life' : 'lives'} left`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}
    >
      {Array.from({ length: maxLives }, (_, i) => {
        const filled = i < safeLives
        return (
          <motion.span
            key={`${i}-${filled ? 'full' : 'lost'}`}
            initial={filled ? { scale: 1.3 } : { scale: 1.6, rotate: -20, opacity: 0.4 }}
            animate={{ scale: 1, rotate: 0, opacity: filled ? 1 : 0.5 }}
            transition={{ duration: 0.3 }}
            style={{
              fontSize: '1.35rem',
              lineHeight: 1,
              filter: filled ? 'drop-shadow(0 2px 2px rgba(239,68,68,0.4))' : 'grayscale(1)',
            }}
          >
            {filled ? '❤️' : '🤍'}
          </motion.span>
        )
      })}
      <span style={{
        fontFamily: FUNKY_FONT, fontWeight: 800, fontSize: '0.95rem',
        color: 'var(--color-text-primary)', marginLeft: '0.25rem', whiteSpace: 'nowrap',
      }}>
        {safeLives} {safeLives === 1 ? 'life' : 'lives'}
      </span>
    </span>
  )
}

/** The round indicator ("Round 1 of 10", "Word 4 of 10", ...) as a
 *  chunky colourful pill in the same kid style as the score pill,
 *  in its own teal/blue hue so it never reads as a second score. */
export function RoundPill({ children }: { children: ReactNode }) {
  return (
    <span
      aria-live="polite"
      style={{
        ...PILL_BASE,
        fontSize: '0.95rem',
        background: 'linear-gradient(135deg, #14b8a6, #3b82f6)',
        boxShadow: '0 3px 0 rgba(0,0,0,0.15), 0 6px 14px rgba(20,184,166,0.35)',
      }}
    >
      {children}
    </span>
  )
}

/** The mid-game "How to play" button as a chunky gradient pill,
 *  consistent with the other kid-style buttons — never the plain
 *  white pill it was. Same label, same action. */
export function HowToPlayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...PILL_BASE,
        fontSize: '0.95rem',
        background: 'linear-gradient(135deg, #a855f7, #ec4899)',
        boxShadow: '0 3px 0 rgba(0,0,0,0.15), 0 6px 14px rgba(168,85,247,0.4)',
        cursor: 'pointer',
      }}
    >
      How to play
    </button>
  )
}

/** The question card's look: a soft colourful tint (warm peach to
 *  lavender to pink) with a colourful border, instead of the plain
 *  white card. Question text stays dark and fully readable — the
 *  card keeps its own `color: var(--color-text-primary)`. Spread
 *  into a card's style object where `background` / `border` were. */
export const QUESTION_CARD_STYLE: CSSProperties = {
  background: 'linear-gradient(135deg, #fff7ed 0%, #ede9fe 55%, #fce7f3 100%)',
  border: '2px solid #a78bfa',
}
