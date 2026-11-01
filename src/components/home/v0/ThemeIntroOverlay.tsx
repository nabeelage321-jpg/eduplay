'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Astronaut theme-intro player.
//
// Storyboard (the owner's exact example, in order):
//  0. A rocket launches upward.
//  1. It flies through a solar system (stars, planets).
//  2. It lands on a planet and enters a panel / door.
//  3. Inside, a huge screen is seen from far away.
//  4. On that screen a kid is working / playing a game.
//  5. The camera focuses / zooms into that screen — and that screen
//     becomes the real EduPlay page underneath, because the overlay
//     removes itself and the page was there all along.
//
// This is a theme intro, not a game and not a video: lightweight CSS
// animations + emoji art only. No video files, no audio files, no
// external assets, no new dependencies.
//
// Duration and stop (hard rules):
//  - The whole sequence is ~26 seconds — well under the 60-second
//    maximum. A 60-second safety timer also ends it no matter what.
//  - A visible Skip button (48px, top-right) ends it instantly.
//  - When it ends or is skipped, onDone runs, the host clears the
//    request, and this component UNMOUNTS — nothing keeps animating
//    in the background, and the underlying page is untouched.
//  - Reduced-motion users get no moving intro: a single static
//    scene with a Continue button, and no timers at all.

const STEP_MS = [4000, 6000, 5000, 4000, 4000, 3000] // total 26,000ms
const TOTAL_MS = STEP_MS.reduce((a, b) => a + b, 0)
const HARD_STOP_MS = 60_000

const CAPTIONS = [
  'The rocket is launching!',
  'Flying through the solar system…',
  'Landing on a planet — and going inside!',
  'Look — a huge screen, far away!',
  'A kid is playing a game on that screen!',
  'Zooming in… that screen is EduPlay!',
]

export default function ThemeIntroOverlay({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const doneRef = useRef(false)

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }, [onDone])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true)
      return
    }
    // Advance one scene at a time; every timer is cleared on unmount.
    let elapsed = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i < STEP_MS.length; i++) {
      elapsed += STEP_MS[i - 1]
      timers.push(setTimeout(() => setStep(i), elapsed))
    }
    timers.push(setTimeout(finish, TOTAL_MS))
    // Hard stop: never run longer than 60 seconds, whatever happens.
    timers.push(setTimeout(finish, HARD_STOP_MS))
    return () => timers.forEach((t) => clearTimeout(t))
  }, [finish])

  // Scene art: emoji composition per step. The final zoom scene
  // scales the screen to fill the viewport and fades the overlay
  // out, so the real page underneath is revealed.
  const scene = (() => {
    switch (step) {
      case 0:
        return (
          <div style={{ textAlign: 'center' }}>
            <div className="ti-rise" style={{ fontSize: '6rem', lineHeight: 1 }} aria-hidden="true">🚀</div>
            <div style={{ fontSize: '3rem', marginTop: '1rem' }} aria-hidden="true">🌍</div>
          </div>
        )
      case 1:
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', letterSpacing: '0.5rem' }} aria-hidden="true">✨ ⭐ 🌟 ✨ ⭐</div>
            <div className="ti-fly" style={{ fontSize: '5rem', margin: '1rem 0' }} aria-hidden="true">🚀</div>
            <div style={{ fontSize: '3.5rem', letterSpacing: '1rem' }} aria-hidden="true">🪐 🌕 🔴 🟠</div>
            <p style={{ color: '#cbd5e1' }}>Sun, planets and stars all around!</p>
          </div>
        )
      case 2:
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '6rem' }} aria-hidden="true">🪐</div>
            <div style={{ fontSize: '4rem', marginTop: '-1rem' }} aria-hidden="true">🚀</div>
            <div
              style={{
                margin: '1rem auto 0', width: '10rem', padding: '1rem',
                borderRadius: '1rem', background: '#1e293b', border: '3px solid #f59e0b',
                fontSize: '1.25rem', fontWeight: 700, color: '#fde68a',
              }}
            >
              🚪 Panel — come inside!
            </div>
          </div>
        )
      case 3:
        return (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                margin: '0 auto', width: '12rem', padding: '1rem', borderRadius: '1rem',
                background: '#0f172a', border: '4px solid #38bdf8', color: '#e0f2fe',
              }}
            >
              <div style={{ fontSize: '2rem' }} aria-hidden="true">🖥️</div>
              <p style={{ marginTop: '0.5rem' }}>A huge screen… far away!</p>
            </div>
          </div>
        )
      case 4:
        return (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                margin: '0 auto', width: '16rem', padding: '1.25rem', borderRadius: '1rem',
                background: '#0f172a', border: '4px solid #38bdf8', color: '#e0f2fe',
              }}
            >
              <div style={{ fontSize: '3rem' }} aria-hidden="true">🧒 🎮</div>
              <p style={{ marginTop: '0.5rem', fontWeight: 700 }}>A kid is playing a game!</p>
              <p style={{ fontSize: '0.875rem', color: '#bae6fd' }}>Quiz • Match-Up • Fun</p>
            </div>
          </div>
        )
      default:
        return (
          <div className="ti-zoom" style={{ textAlign: 'center' }}>
            <div
              style={{
                margin: '0 auto', width: '18rem', padding: '1.5rem', borderRadius: '1rem',
                background: '#fff7ed', border: '4px solid #f97316', color: '#431407',
              }}
            >
              <div style={{ fontSize: '3rem' }} aria-hidden="true">🎮</div>
              <p style={{ marginTop: '0.5rem', fontWeight: 800, fontSize: '1.25rem' }}>That screen is EduPlay!</p>
            </div>
          </div>
        )
    }
  })()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Astronaut theme intro"
      style={{
        position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', background: 'linear-gradient(180deg, #0a0e2a 0%, #1e1b4b 60%, #0f172a 100%)',
        color: '#fff',
      }}
    >
      <style>{`
        @keyframes ti-rise { from { transform: translateY(60px); } to { transform: translateY(-40px); } }
        @keyframes ti-fly { from { transform: translateX(-60px); } to { transform: translateX(60px); } }
        @keyframes ti-zoom { from { transform: scale(0.6); opacity: 0.6; } to { transform: scale(1.4); opacity: 1; } }
        .ti-rise { animation: ti-rise 4s ease-out forwards; }
        .ti-fly { animation: ti-fly 6s linear forwards; }
        .ti-zoom { animation: ti-zoom 3s ease-in forwards; }
        @media (prefers-reduced-motion: reduce) {
          .ti-rise, .ti-fly, .ti-zoom { animation: none !important; }
        }
      `}</style>

      <button
        type="button"
        // eslint-disable-next-line jsx-a11y/no-autofocus -- intentional: keyboard users must reach Skip first.
        autoFocus
        onClick={finish}
        style={{
          position: 'absolute', top: '1rem', right: '1rem', minHeight: '48px',
          minWidth: '48px', padding: '0 1.25rem', borderRadius: '9999px',
          border: '2px solid #fff', background: 'rgba(255,255,255,0.15)',
          color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
        }}
      >
        Skip intro ✕
      </button>

      {reducedMotion ? (
        <div style={{ textAlign: 'center', maxWidth: '22rem' }}>
          <div style={{ fontSize: '5rem' }} aria-hidden="true">🧑‍🚀 🪐 🖥️</div>
          <p style={{ marginTop: '1rem', fontSize: '1.25rem', fontWeight: 700 }}>
            Astronaut world — rocket, planets and a game screen.
          </p>
          <p style={{ marginTop: '0.5rem', color: '#cbd5e1' }}>
            No moving intro for you — tap Continue to go straight to EduPlay.
          </p>
          <button
            type="button"
            onClick={finish}
            style={{
              marginTop: '1.5rem', minHeight: '48px', padding: '0 1.5rem',
              borderRadius: '9999px', border: 'none', background: '#f97316',
              color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Continue to EduPlay →
          </button>
        </div>
      ) : (
        <>
          {scene}
          <p aria-live="polite" style={{ marginTop: '2rem', fontSize: '1.25rem', fontWeight: 700, textAlign: 'center' }}>
            {CAPTIONS[step]}
          </p>
          <p style={{ marginTop: '0.5rem', color: '#cbd5e1', fontSize: '0.875rem' }}>
            Short intro — it ends on its own in under a minute.
          </p>
        </>
      )}
    </div>
  )
}
