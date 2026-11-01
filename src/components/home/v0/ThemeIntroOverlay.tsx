'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Astronaut theme-intro player, v2 — ORIGINAL SVG scene art, NO emoji.
//
// Storyboard (the owner's exact example, in order), told by motion,
// not by words — there are no captions and no scene text at all:
//  0. An original SVG rocket launches upward, flame and smoke.
//  1. It flies across an original SVG solar system (sun, ringed
//     planet, cratered planet, stars).
//  2. It lands on an original planet surface and enters an
//     original panel / door.
//  3. Inside, an original huge screen is seen from far away.
//  4. On that screen an original kid character sits at a desk
//     playing a game.
//  5. The camera zooms into that screen — and that screen becomes
//     the real EduPlay page underneath, because the overlay removes
//     itself and the page was there all along.
//
// This is a theme intro, not a game and not a video: inline SVG
// art + CSS animations only. No emoji, no raster images, no video
// files, no audio files, no external assets, no copied characters,
// no new dependencies.
//
// Duration and stop (v3 — faster, sound added):
//  - The whole sequence is ~17 seconds (was ~26s) — well under the
//    30-second safety timer, which ends it no matter what.
//  - Sound is Web Audio tones generated in code only (one short cue
//    per scene). No audio files, no downloaded music, no copyrighted
//    music. Sound starts only because the intro was tapped, and a
//    visible Mute button stops it instantly. On end/skip/unmount
//    all sound stops. Reduced-motion users get no auto sound.
//  - A visible Skip button (48px, top-right) ends it instantly.
//  - When it ends or is skipped, onDone runs, the host clears the
//    request, and this component UNMOUNTS — nothing keeps animating
//    in the background, and the underlying page is untouched.
//  - Reduced-motion users get no moving intro: a single static
//    SVG scene with a Continue button, and no timers at all.

const STEP_MS = [2600, 3900, 3300, 2600, 2600, 2000] // total 17,000ms
const TOTAL_MS = STEP_MS.reduce((a, b) => a + b, 0)
const HARD_STOP_MS = 30_000

// One consistent flat style, drawn in code: deep space blues,
// warm orange rocket, teal screen glow. All art is original to
// EduPlay — simple geometric shapes, no character copied from
// any rival or cartoon.

// The rocket, drawn once and reused in the launch, flight and
// landing scenes. `id` is a short suffix so gradient ids never
// collide when two scenes are on screen at once (reduced motion).
function Rocket({ id, x, y, scale = 1 }: { id: string; x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} aria-hidden="true">
      <defs>
        <linearGradient id={`rk-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <path d="M -22 18 Q -38 34 -30 44 L -14 30 Z" fill="#f97316" />
      <path d="M 22 18 Q 38 34 30 44 L 14 30 Z" fill="#f97316" />
      <path d="M 0 -52 C 16 -38 20 -16 20 14 L 20 26 L -20 26 L -20 14 C -20 -16 -16 -38 0 -52 Z" fill={`url(#rk-${id})`} stroke="#cbd5e1" strokeWidth="2" />
      <path d="M 0 -52 C 8 -44 13 -34 15 -24 L -15 -24 C -13 -34 -8 -44 0 -52 Z" fill="#f97316" />
      <circle cx="0" cy="-4" r="11" fill="#7dd3fc" stroke="#334155" strokeWidth="2" />
      <circle cx="-4" cy="-6" r="1.6" fill="#0f172a" />
      <circle cx="4" cy="-6" r="1.6" fill="#0f172a" />
      <path d="M -4 -1 Q 0 3 4 -1" fill="none" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />
      <g className="ti-flame">
        <path d="M -10 26 Q 0 52 10 26 Q 5 34 0 32 Q -5 34 -10 26 Z" fill="#f59e0b" />
        <path d="M -5 26 Q 0 40 5 26 Q 0 31 -5 26 Z" fill="#fde68a" />
      </g>
    </g>
  )
}

function Stars() {
  return (
    <g aria-hidden="true" fill="#e2e8f0">
      <circle className="ti-twinkle" cx="24" cy="30" r="2.5" />
      <circle cx="70" cy="70" r="1.8" />
      <circle className="ti-twinkle" cx="300" cy="40" r="2.5" />
      <circle cx="330" cy="110" r="1.8" />
      <circle cx="50" cy="170" r="1.8" />
      <circle className="ti-twinkle" cx="310" cy="200" r="2.2" />
      <circle cx="180" cy="24" r="1.6" />
      <circle cx="250" cy="150" r="1.6" />
      <path className="ti-twinkle" d="M 150 90 l 3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" />
      <path d="M 90 230 l 2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 Z" />
    </g>
  )
}

// 0 — Launch: rocket rising from a planet, smoke curling below it.
function LaunchScene() {
  return (
    <svg viewBox="0 0 360 300" width="min(88vw, 340px)" role="img" aria-label="Rocket launching">
      <rect width="360" height="300" rx="24" fill="#0a0e2a" />
      <Stars />
      <ellipse cx="180" cy="288" rx="150" ry="22" fill="#334155" />
      <ellipse cx="150" cy="282" rx="30" ry="8" fill="#475569" />
      <ellipse cx="220" cy="286" rx="20" ry="6" fill="#475569" />
      <g className="ti-rise">
        <Rocket id="launch" x={180} y={150} scale={1.15} />
      </g>
      <g fill="#e2e8f0" opacity="0.85">
        <circle className="ti-smoke" cx="150" cy="235" r="14" />
        <circle className="ti-smoke" cx="205" cy="242" r="18" />
        <circle className="ti-smoke" cx="178" cy="252" r="12" />
      </g>
    </svg>
  )
}

// 1 — Solar system: sun, ringed planet, cratered planet, rocket flying across.
function SolarScene() {
  return (
    <svg viewBox="0 0 360 300" width="min(88vw, 340px)" role="img" aria-label="Rocket flying through the solar system">
      <rect width="360" height="300" rx="24" fill="#0a0e2a" />
      <Stars />
      <g>
        <circle cx="52" cy="52" r="26" fill="#fbbf24" />
        <g stroke="#fbbf24" strokeWidth="4" strokeLinecap="round">
          <line x1="52" y1="12" x2="52" y2="22" />
          <line x1="52" y1="82" x2="52" y2="92" />
          <line x1="12" y1="52" x2="22" y2="52" />
          <line x1="82" y1="52" x2="92" y2="52" />
        </g>
      </g>
      <g>
        <circle cx="268" cy="92" r="30" fill="#a78bfa" />
        <ellipse cx="268" cy="92" rx="52" ry="13" fill="none" stroke="#c4b5fd" strokeWidth="6" transform="rotate(-18 268 92)" />
        <circle cx="258" cy="84" r="6" fill="#8b5cf6" />
      </g>
      <g>
        <circle cx="92" cy="210" r="34" fill="#fb923c" />
        <circle cx="80" cy="200" r="7" fill="#ea580c" />
        <circle cx="104" cy="218" r="5" fill="#ea580c" />
        <circle cx="90" cy="226" r="4" fill="#ea580c" />
      </g>
      <circle cx="300" cy="220" r="18" fill="#2dd4bf" />
      <g className="ti-fly">
        <Rocket id="solar" x={180} y={150} scale={0.9} />
      </g>
    </svg>
  )
}

// 2 — Landing: rocket on a planet surface beside a base station with a glowing door.
function LandingScene() {
  return (
    <svg viewBox="0 0 360 300" width="min(88vw, 340px)" role="img" aria-label="Rocket landed beside a base station">
      <rect width="360" height="300" rx="24" fill="#0a0e2a" />
      <Stars />
      <ellipse cx="180" cy="292" rx="170" ry="26" fill="#7c3aed" />
      <ellipse cx="120" cy="284" rx="24" ry="7" fill="#6d28d9" />
      <ellipse cx="250" cy="288" rx="18" ry="6" fill="#6d28d9" />
      <Rocket id="land" x={104} y={176} scale={0.95} />
      <g>
        <rect x="196" y="168" width="110" height="104" rx="14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
        <path d="M 196 168 A 55 40 0 0 1 306 168 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
        <line x1="251" y1="128" x2="251" y2="104" stroke="#94a3b8" strokeWidth="3" />
        <circle className="ti-twinkle" cx="251" cy="100" r="5" fill="#f87171" />
        <rect x="232" y="196" width="38" height="76" rx="8" fill="#f59e0b" />
        <rect x="240" y="206" width="22" height="56" rx="5" fill="#fde68a" />
        <circle cx="290" cy="190" r="7" fill="#38bdf8" />
      </g>
    </svg>
  )
}

// A game screen, drawn with shapes only — tiles, a star, a circle,
// a triangle — never words. `w` is the screen width in the scene.
function GameScreen({ x, y, w }: { x: number; y: number; w: number }) {
  const h = w * 0.62
  const col = (w - 70) / 3
  const rowH = (h - 60) / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="4" />
      <rect x={x + 10} y={y + 10} width={w - 20} height={h - 20} rx="8" fill="#fff7ed" />
      <rect x={x + 20} y={y + 22} width={col} height={rowH} rx="8" fill="#fda4af" />
      <rect x={x + 30 + col} y={y + 22} width={col} height={rowH} rx="8" fill="#93c5fd" />
      <rect x={x + 40 + 2 * col} y={y + 22} width={col} height={rowH} rx="8" fill="#86efac" />
      <path d={`M ${x + 20 + col / 2} ${y + 28} l 5 11 12 1 -9 8 3 12 -11 -7 -11 7 3 -12 -9 -8 12 -1 Z`} fill="#fff" />
      <circle cx={x + 30 + col * 1.5} cy={y + 22 + rowH / 2} r={10} fill="#fff" />
      <path d={`M ${x + 40 + 2.5 * col} ${y + 30} l 11 18 -22 0 Z`} fill="#fff" />
    </g>
  )
}

// 3 — Huge screen, seen from far away inside a dark room.
function HugeScreenScene() {
  return (
    <svg viewBox="0 0 360 300" width="min(88vw, 340px)" role="img" aria-label="A huge screen far away">
      <rect width="360" height="300" rx="24" fill="#111827" />
      <rect x="0" y="252" width="360" height="48" fill="#1f2937" />
      <g className="ti-glow">
        <GameScreen x={105} y={84} w={150} />
      </g>
      <rect x="165" y="180" width="30" height="52" fill="#374151" />
      <rect x="140" y="232" width="80" height="8" rx="4" fill="#374151" />
    </svg>
  )
}

// 4 — A kid at a desk, playing the game on the screen.
function KidScene() {
  return (
    <svg viewBox="0 0 360 300" width="min(88vw, 340px)" role="img" aria-label="A kid playing a game on a screen">
      <rect width="360" height="300" rx="24" fill="#fef3c7" />
      <rect x="0" y="252" width="360" height="48" fill="#fde68a" />
      <GameScreen x={88} y={52} w={184} />
      <rect x="168" y="168" width="24" height="40" fill="#475569" />
      <rect x="70" y="208" width="220" height="12" rx="6" fill="#b45309" />
      <rect x="80" y="220" width="10" height="32" fill="#92400e" />
      <rect x="270" y="220" width="10" height="32" fill="#92400e" />
      <g>
        <circle cx="180" cy="186" r="26" fill="#fcd9b8" stroke="#92400e" strokeWidth="2" />
        <path d="M 154 178 A 26 26 0 0 1 206 178 L 206 170 A 26 20 0 0 0 154 170 Z" fill="#1e293b" />
        <circle cx="171" cy="188" r="2.4" fill="#0f172a" />
        <circle cx="189" cy="188" r="2.4" fill="#0f172a" />
        <path d="M 172 198 Q 180 204 188 198" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        <path d="M 154 208 Q 180 196 206 208 L 206 220 L 154 220 Z" fill="#38bdf8" />
        <path d="M 154 212 Q 132 218 128 208" fill="none" stroke="#fcd9b8" strokeWidth="9" strokeLinecap="round" />
        <path d="M 206 212 Q 228 218 232 208" fill="none" stroke="#fcd9b8" strokeWidth="9" strokeLinecap="round" />
      </g>
      <rect x="140" y="196" width="80" height="12" rx="4" fill="#334155" />
    </svg>
  )
}

// 5 — Zoom: the same game screen grows to fill the view, then the overlay ends.
function ZoomScene() {
  return (
    <div className="ti-zoom" style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 360 300" width="min(92vw, 380px)" role="img" aria-label="Zooming into the game screen">
        <rect width="360" height="300" rx="24" fill="#fff7ed" />
        <GameScreen x={30} y={40} w={300} />
      </svg>
    </div>
  )
}

// Static composite for reduced-motion users: rocket, planet, screen — no timers.
function StaticScene() {
  return (
    <svg viewBox="0 0 360 300" width="min(88vw, 340px)" role="img" aria-label="Astronaut world: rocket, planets and a game screen">
      <rect width="360" height="300" rx="24" fill="#0a0e2a" />
      <Stars />
      <circle cx="290" cy="70" r="26" fill="#a78bfa" />
      <ellipse cx="290" cy="70" rx="44" ry="11" fill="none" stroke="#c4b5fd" strokeWidth="5" transform="rotate(-18 290 70)" />
      <Rocket id="static" x={92} y={150} scale={0.9} />
      <GameScreen x={196} y={180} w={120} />
    </svg>
  )
}

// --- v3 sound: Web Audio tones only, generated in code. No audio
// files, no downloaded music, no copyrighted music, no external
// assets. One short cue per scene, all at low volume, all stopped
// on mute, end, skip, or unmount.
type ToneSpec = {
  from: number
  to?: number
  dur: number
  type: OscillatorType
  vol: number
  delay?: number
}

export default function ThemeIntroOverlay({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [muted, setMuted] = useState(false)
  const doneRef = useRef(false)
  const mutedRef = useRef(false)
  const audioRef = useRef<{ ctx: AudioContext; master: GainNode } | null>(null)
  const sourcesRef = useRef<Set<OscillatorNode>>(new Set())
  const noteTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  const stopSound = useCallback(() => {
    noteTimersRef.current.forEach((t) => clearTimeout(t))
    noteTimersRef.current = []
    sourcesRef.current.forEach((osc) => {
      try { osc.stop() } catch { /* already stopped */ }
    })
    sourcesRef.current.clear()
    const audio = audioRef.current
    audioRef.current = null
    if (audio) {
      audio.ctx.close().catch(() => undefined)
    }
  }, [])

  const ensureAudio = useCallback(() => {
    if (typeof window === 'undefined') return null
    if (audioRef.current) return audioRef.current
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    const ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)
    const audio = { ctx, master }
    audioRef.current = audio
    ctx.resume().catch(() => undefined)
    return audio
  }, [])

  const playTone = useCallback((spec: ToneSpec) => {
    if (mutedRef.current) return
    const audio = ensureAudio()
    if (!audio) return
    const start = () => {
      if (mutedRef.current || !audioRef.current) return
      const { ctx, master } = audio
      if (ctx.state === 'closed') return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = spec.type
      const t0 = ctx.currentTime
      osc.frequency.setValueAtTime(spec.from, t0)
      if (spec.to !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to), t0 + spec.dur)
      }
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(spec.vol, t0 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + spec.dur)
      osc.connect(gain)
      gain.connect(master)
      sourcesRef.current.add(osc)
      osc.onended = () => sourcesRef.current.delete(osc)
      osc.start(t0)
      osc.stop(t0 + spec.dur + 0.05)
    }
    if (spec.delay && spec.delay > 0) {
      noteTimersRef.current.push(setTimeout(start, spec.delay))
    } else {
      start()
    }
  }, [ensureAudio])

  // One distinct short cue per scene. All tones are generated here;
  // no file is ever fetched or played.
  const playSceneCue = useCallback((sceneStep: number) => {
    switch (sceneStep) {
      case 0: // Launch: low rumble rising into a whoosh.
        playTone({ from: 55, to: 140, dur: 2.2, type: 'sawtooth', vol: 0.5 })
        playTone({ from: 220, to: 520, dur: 1.6, type: 'sine', vol: 0.25, delay: 500 })
        break
      case 1: // Solar system: twinkling arpeggio.
        ;[880, 1174, 1318, 1568].forEach((freq, i) => {
          playTone({ from: freq, dur: 0.35, type: 'sine', vol: 0.28, delay: i * 320 })
        })
        break
      case 2: // Landing: soft thud.
        playTone({ from: 130, to: 45, dur: 0.5, type: 'sine', vol: 0.6 })
        playTone({ from: 90, to: 50, dur: 0.4, type: 'triangle', vol: 0.3, delay: 120 })
        break
      case 3: // Huge screen, far away: soft hum.
        playTone({ from: 220, dur: 1.8, type: 'sine', vol: 0.2 })
        playTone({ from: 440, dur: 1.4, type: 'sine', vol: 0.1, delay: 200 })
        break
      case 4: // Kid playing: playful blips.
        ;[523, 659, 784, 659].forEach((freq, i) => {
          playTone({ from: freq, dur: 0.22, type: 'triangle', vol: 0.3, delay: i * 240 })
        })
        break
      default: // Zoom: rising sweep into the real page.
        playTone({ from: 300, to: 1200, dur: 1.7, type: 'sine', vol: 0.3 })
        break
    }
  }, [playTone])

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    stopSound()
    onDone()
  }, [onDone, stopSound])

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      if (next) stopSound()
      return next
    })
  }, [stopSound])

  // Resume the audio context on any later tap/keypress too: some
  // browsers start it suspended even after the theme tap.
  useEffect(() => {
    const resume = () => {
      const audio = audioRef.current
      if (audio && audio.ctx.state === 'suspended') {
        audio.ctx.resume().catch(() => undefined)
      }
    }
    window.addEventListener('pointerdown', resume)
    window.addEventListener('keydown', resume)
    return () => {
      window.removeEventListener('pointerdown', resume)
      window.removeEventListener('keydown', resume)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true)
      return
    }
    let elapsed = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i < STEP_MS.length; i++) {
      elapsed += STEP_MS[i - 1]
      timers.push(setTimeout(() => setStep(i), elapsed))
    }
    timers.push(setTimeout(finish, TOTAL_MS))
    timers.push(setTimeout(finish, HARD_STOP_MS))
    return () => timers.forEach((t) => clearTimeout(t))
  }, [finish])

  // Play the cue for the current scene. No auto sound at all for
  // reduced-motion users, and nothing while muted.
  useEffect(() => {
    if (reducedMotion || muted) return
    playSceneCue(step)
  }, [step, muted, reducedMotion, playSceneCue])

  // Final safety: unmount always silences the intro.
  useEffect(() => () => stopSound(), [stopSound])

  const scene = (() => {
    switch (step) {
      case 0: return <LaunchScene />
      case 1: return <SolarScene />
      case 2: return <LandingScene />
      case 3: return <HugeScreenScene />
      case 4: return <KidScene />
      default: return <ZoomScene />
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
        @keyframes ti-fly { from { transform: translateX(-110px); } to { transform: translateX(110px); } }
        @keyframes ti-zoom { from { transform: scale(0.6); opacity: 0.6; } to { transform: scale(1.4); opacity: 1; } }
        @keyframes ti-flame { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.35); } }
        @keyframes ti-twinkle { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes ti-smoke { from { transform: translateY(0) scale(1); opacity: 0.85; } to { transform: translateY(24px) scale(1.5); opacity: 0; } }
        @keyframes ti-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
        .ti-rise { animation: ti-rise 2.6s ease-out forwards; }
        .ti-fly { animation: ti-fly 3.9s linear forwards; }
        .ti-zoom { animation: ti-zoom 2s ease-in forwards; }
        .ti-flame { transform-origin: top center; animation: ti-flame 0.5s ease-in-out infinite; }
        .ti-twinkle { animation: ti-twinkle 1.6s ease-in-out infinite; }
        .ti-smoke { animation: ti-smoke 2s ease-out infinite; }
        .ti-glow { animation: ti-glow 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ti-rise, .ti-fly, .ti-zoom, .ti-flame, .ti-twinkle, .ti-smoke, .ti-glow { animation: none !important; }
        }
      `}</style>

      {!reducedMotion && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute intro sound' : 'Mute intro sound'}
          style={{
            position: 'absolute', top: '1rem', left: '1rem', minHeight: '48px',
            minWidth: '48px', padding: '0 1.25rem', borderRadius: '9999px',
            border: '2px solid #fff', background: 'rgba(255,255,255,0.15)',
            color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      )}

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
        Skip intro ×
      </button>

      {reducedMotion ? (
        <div style={{ textAlign: 'center', maxWidth: '22rem' }}>
          <StaticScene />
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
        scene
      )}
    </div>
  )
}
