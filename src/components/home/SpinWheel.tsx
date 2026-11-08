'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { playEduSound, readSoundOn, storeSoundOn } from '@/lib/game-sound'
import { HELPER_OPEN_EVENT } from '@/lib/mascot'
import {
  WHEEL_SEGMENTS,
  randomSegmentIndex,
  rotationForSegment,
  segmentAngle,
  typeHubHref,
  type WheelSegment,
} from '@/lib/spin-wheel'

/**
 * Spin the Wheel and Play — homepage, right under the hero (2026-11-08,
 * owner order). One button, two states (owner correction 2026-11-08
 * 11:16 PKT): "Spin and Play" spins the wheel; once a type has landed
 * the SAME button becomes "Play {type}" and opens that type's hub
 * page. No separate Play button, no Spin Again button.
 *
 * The wheel has one segment per game type (65). A spin picks ONLY a
 * game type — one of the 65 segments, uniform random. It NEVER picks
 * a specific subject/grade game: the subject/grade is the kid's own
 * choice (owner correction 2026-11-08 11:30 PKT — the wheel had
 * landed on "Islamiyat Grade 3 Typing Race" and he does not want
 * that). Play goes to /{locale}/activities/{type-slug}, the type's
 * hub page, where the kid picks his own game himself. No sign-in
 * needed. English wording for every locale (no translations
 * invented), like the other homepage sections.
 */
type Phase = 'idle' | 'spinning' | 'landed'

const SPIN_MS = 4500
const WHEEL_R = 200
const WHEEL_C = 200

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180
  return { x: WHEEL_C + radius * Math.cos(a), y: WHEEL_C + radius * Math.sin(a) }
}

export default function SpinWheel({ locale }: { locale: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [rotation, setRotation] = useState(0)
  const [landed, setLanded] = useState<WheelSegment | null>(null)
  const [soundOn, setSoundOn] = useState(true)
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const landTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSegment = useRef<WheelSegment | null>(null)
  const landedRef = useRef(false)

  useEffect(() => {
    setSoundOn(readSoundOn())
    return () => {
      if (tickTimer.current) clearInterval(tickTimer.current)
      if (landTimer.current) clearTimeout(landTimer.current)
    }
  }, [])

  function stopTicks() {
    if (tickTimer.current) {
      clearInterval(tickTimer.current)
      tickTimer.current = null
    }
  }

  function land() {
    if (landedRef.current) return
    landedRef.current = true
    stopTicks()
    if (landTimer.current) {
      clearTimeout(landTimer.current)
      landTimer.current = null
    }
    const s = pendingSegment.current
    pendingSegment.current = null
    if (s) {
      setLanded(s)
      setPhase('landed')
      playEduSound('win', readSoundOn())
    } else {
      setPhase('idle')
    }
  }

  function spin() {
    if (phase === 'spinning') return
    playEduSound('click', readSoundOn())
    setPhase('spinning')
    setLanded(null)
    landedRef.current = false
    // Type only — uniform random segment, no game pick, no fetch.
    const idx = randomSegmentIndex()
    pendingSegment.current = WHEEL_SEGMENTS[idx] ?? null
    setRotation((prev) => rotationForSegment(idx, prev))
    tickTimer.current = setInterval(() => playEduSound('tick', readSoundOn()), 140)
    // Fallback if the transition-end event never fires.
    landTimer.current = setTimeout(land, SPIN_MS + 600)
  }

  function handleButton() {
    if (phase === 'landed' && landed) {
      playEduSound('click', readSoundOn())
      router.push(typeHubHref(locale, landed.slug))
      return
    }
    if (phase === 'idle') spin()
  }

  const seg = segmentAngle()

  return (
    <section id="spin-the-wheel" aria-labelledby="spin-wheel-title" style={{ margin: '0 auto', maxWidth: '80rem', padding: '3rem 1rem 4rem', textAlign: 'center' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)' }}>
        Can&apos;t decide?
      </p>
      <h2 id="spin-wheel-title" style={{ marginTop: '0.5rem', fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
        🎡 Spin the Wheel and Play
      </h2>
      <p style={{ margin: '0.75rem auto 0', maxWidth: '36rem', fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
        Tap the button — the wheel can land on any of the 65 games. Then tap Play and pick your own game of that type!
      </p>

      {/* Sound toggle — same device setting as the games, default ON. */}
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => {
            const next = !soundOn
            setSoundOn(next)
            storeSoundOn(next)
            if (next) playEduSound('click', true)
          }}
          aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
          style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', gap: '0.5rem', borderRadius: '9999px', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '0 1rem', fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', cursor: 'pointer' }}
        >
          {soundOn ? '🔊 Sound on' : '🔇 Sound off'}
        </button>
      </div>

      {/* The wheel — tap it to spin, same as the button. */}
      <div style={{ position: 'relative', margin: '2rem auto 0', maxWidth: '420px' }}>
        {/* Pointer at the top. */}
        <div aria-hidden="true" style={{ position: 'absolute', top: '-6px', left: '50%', zIndex: 2, transform: 'translateX(-50%)', fontSize: '2.5rem', lineHeight: 1, color: 'var(--color-text-primary)', textShadow: '0 2px 0 rgba(0,0,0,0.15)' }}>
          ▼
        </div>
        <svg
          viewBox={`0 0 ${WHEEL_C * 2} ${WHEEL_C * 2}`}
          role="img"
          aria-label="Game wheel — one segment per game type"
          onClick={() => {
            if (phase === 'idle') spin()
          }}
          onTransitionEnd={land}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            cursor: phase === 'idle' ? 'pointer' : 'default',
            transform: `rotate(${rotation}deg)`,
            transition: phase === 'spinning' ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.08, 1)` : 'none',
            borderRadius: '50%',
            border: '4px solid var(--color-text-primary)',
            boxShadow: '0 8px 0 0 var(--color-border)',
          }}
        >
          {WHEEL_SEGMENTS.map((s, i) => {
            const a0 = i * seg
            const a1 = (i + 1) * seg
            const p0 = polar(a0, WHEEL_R)
            const p1 = polar(a1, WHEEL_R)
            const mid = polar((i + 0.5) * seg, WHEEL_R * 0.8)
            return (
              <g key={s.slug}>
                <path
                  d={`M ${WHEEL_C} ${WHEEL_C} L ${p0.x} ${p0.y} A ${WHEEL_R} ${WHEEL_R} 0 0 1 ${p1.x} ${p1.y} Z`}
                  fill={s.colour}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
                <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="central" fontSize={15}>
                  {s.icon}
                </text>
              </g>
            )
          })}
        </svg>
        {/* Static hub — does not spin with the wheel. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            width: '4.5rem',
            height: '4.5rem',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: '3px solid var(--color-text-primary)',
            background: 'var(--color-surface)',
            fontSize: '2rem',
          }}
        >
          🎡
        </div>
      </div>

      {/* Result — the TYPE only, never a specific game. */}
      <div aria-live="polite" style={{ marginTop: '2rem', minHeight: '5.5rem' }}>
        {phase === 'landed' && landed ? (
          <div style={{ maxWidth: '36rem', margin: '0 auto', borderRadius: '1.5rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '1.25rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)' }}>
              The wheel landed on…
            </p>
            <p style={{ marginTop: '0.5rem', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, color: 'var(--color-text-primary)' }}>
              {landed.icon} {landed.name}
            </p>
            <p style={{ marginTop: '0.5rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Pick your subject and grade, then play!
            </p>
          </div>
        ) : phase === 'spinning' ? (
          <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Spinning… where will it land? 🎲
          </p>
        ) : (
          <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            One tap, one surprise game type — you pick the game!
          </p>
        )}
      </div>

      {/* TWINKLE'S INVITE (2026-11-08, owner order): when a visitor
          lands on the homepage, Twinkle says one line — "Try Spin and
          Play!" — in a speech bubble next to her, tail pointing down
          at the Spin button. Shown while the wheel is idle; hidden
          once the wheel is spinning or a type has landed. The wrapper
          keeps its height so the button never jumps when the bubble
          hides. */}
      <div style={{ marginTop: '1rem', minHeight: '5.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {phase === 'idle' && (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '0.75rem' }}>
            {/* Twinkle here is a picture, not the roaming mascot
                button — tapping her asks the real mascot to open its
                "What we have" panel (owner order 2026-11-08). */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(HELPER_OPEN_EVENT))}
              aria-label="Ask Twinkle what EduPlay has"
              style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', flexShrink: 0 }}
            >
              <Image
                src="/eduplay-mascot.png"
                alt="Twinkle, EduPlay's helper star"
                width={128}
                height={128}
                style={{ width: '4rem', height: '4rem', objectFit: 'contain', display: 'block' }}
              />
            </button>
            <div style={{ position: 'relative', borderRadius: '1.25rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '0.75rem 1rem', boxShadow: '0 4px 0 0 var(--color-border)', textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                Try Spin and Play! 🎡
              </p>
              <span
                aria-hidden="true"
                style={{ position: 'absolute', left: '50%', bottom: '-12px', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '12px solid var(--color-border)' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* THE button — one button, two states. */}
      <button
        type="button"
        onClick={handleButton}
        disabled={phase === 'spinning'}
        style={{
          marginTop: '1rem',
          display: 'inline-flex',
          minHeight: '64px',
          alignItems: 'center',
          gap: '0.75rem',
          borderRadius: '9999px',
          border: 'none',
          background: phase === 'landed' ? '#22A06B' : 'var(--color-primary)',
          padding: '0 2.5rem',
          fontSize: '1.5rem',
          fontWeight: 800,
          color: 'white',
          cursor: phase === 'spinning' ? 'wait' : 'pointer',
          opacity: phase === 'spinning' ? 0.7 : 1,
          boxShadow: '0 6px 0 0 rgba(0,0,0,0.2)',
        }}
      >
        {phase === 'landed' && landed ? `▶ Play ${landed.name}` : phase === 'spinning' ? 'Spinning…' : '🎡 Spin and Play'}
      </button>
    </section>
  )
}
