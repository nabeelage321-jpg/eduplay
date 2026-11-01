// Generic theme-intro player for the 14 Kids worlds other than
// Astronaut (which keeps its own untouched player). Same rules as
// Astronaut v3: explicit tap only, ~17 seconds, 30-second hard stop,
// Web Audio tones only (no files, no copyrighted music), visible
// 48px Skip (top-right) and Sound on/off (top-left), sound stops
// on mute/end/skip/unmount, reduced-motion users get a static scene
// + Continue button with no auto sound, overlay unmounts on done.
// Scenes and per-world notes come from ThemeIntroWorlds; this file
// only owns timing, sound and chrome. No emoji, no captions.

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getWorldScenes, WORLD_NOTES, type ToneSpec, type WorldIntroId } from './ThemeIntroWorlds'

const STEP_MS = [2600, 3900, 3300, 2600, 2600, 2000]
const TOTAL_MS = STEP_MS.reduce((a, b) => a + b, 0)
const HARD_STOP_MS = 30_000

export default function ThemeIntroWorldOverlay({ introId, onDone }: { introId: WorldIntroId; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [muted, setMuted] = useState(false)
  const doneRef = useRef(false)
  const mutedRef = useRef(false)
  const audioRef = useRef<{ ctx: AudioContext; master: GainNode } | null>(null)
  const sourcesRef = useRef<Set<OscillatorNode>>(new Set())
  const noteTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const scenes = getWorldScenes(introId)
  const notes = WORLD_NOTES[introId]
  const label = introId.charAt(0).toUpperCase() + introId.slice(1)

  useEffect(() => { mutedRef.current = muted }, [muted])

  const stopSound = useCallback(() => {
    noteTimersRef.current.forEach((t) => clearTimeout(t))
    noteTimersRef.current = []
    sourcesRef.current.forEach((osc) => { try { osc.stop() } catch { /* already stopped */ } })
    sourcesRef.current.clear()
    const audio = audioRef.current
    audioRef.current = null
    if (audio) audio.ctx.close().catch(() => undefined)
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
      if (spec.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to), t0 + spec.dur)
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
    if (spec.delay && spec.delay > 0) noteTimersRef.current.push(setTimeout(start, spec.delay))
    else start()
  }, [ensureAudio])

  const playSceneCue = useCallback((sceneStep: number) => {
    switch (sceneStep) {
      case 0:
        playTone({ from: 55, to: 140, dur: 2.2, type: 'sawtooth', vol: 0.5 })
        playTone({ from: 220, to: 520, dur: 1.6, type: 'sine', vol: 0.25, delay: 500 })
        break
      case 1:
        notes.arp.forEach((freq, i) => playTone({ from: freq, dur: 0.35, type: 'sine', vol: 0.28, delay: i * 320 }))
        break
      case 2:
        playTone({ from: 130, to: 45, dur: 0.5, type: 'sine', vol: 0.6 })
        playTone({ from: 90, to: 50, dur: 0.4, type: 'triangle', vol: 0.3, delay: 120 })
        break
      case 3:
        playTone({ from: 220, dur: 1.8, type: 'sine', vol: 0.2 })
        playTone({ from: 440, dur: 1.4, type: 'sine', vol: 0.1, delay: 200 })
        break
      case 4:
        notes.blips.forEach((freq, i) => playTone({ from: freq, dur: 0.22, type: 'triangle', vol: 0.3, delay: i * 240 }))
        break
      default:
        playTone({ from: 300, to: 1200, dur: 1.7, type: 'sine', vol: 0.3 })
        break
    }
  }, [playTone, notes])

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    stopSound()
    onDone()
  }, [onDone, stopSound])

  const toggleMute = useCallback(() => {
    setMuted((prev) => { const next = !prev; if (next) stopSound(); return next })
  }, [stopSound])

  useEffect(() => {
    const resume = () => {
      const audio = audioRef.current
      if (audio && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => undefined)
    }
    window.addEventListener('pointerdown', resume)
    window.addEventListener('keydown', resume)
    return () => { window.removeEventListener('pointerdown', resume); window.removeEventListener('keydown', resume) }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReducedMotion(true)
      return
    }
    let elapsed = 0
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i < STEP_MS.length; i++) { elapsed += STEP_MS[i - 1]; timers.push(setTimeout(() => setStep(i), elapsed)) }
    timers.push(setTimeout(finish, TOTAL_MS))
    timers.push(setTimeout(finish, HARD_STOP_MS))
    return () => timers.forEach((t) => clearTimeout(t))
  }, [finish])

  useEffect(() => {
    if (reducedMotion || muted) return
    playSceneCue(step)
  }, [step, muted, reducedMotion, playSceneCue])

  useEffect(() => () => stopSound(), [stopSound])

  const Scene = scenes[Math.min(step, scenes.length - 1)]
  const StaticScene = scenes[0]

  return (
    <div role="dialog" aria-modal="true" aria-label={`${label} theme intro`} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)', color: '#fff' }}>
      <style>{`
        @keyframes ti-rise { from { transform: translateY(60px); } to { transform: translateY(-40px); } }
        @keyframes ti-fly { from { transform: translateX(-110px); } to { transform: translateX(110px); } }
        @keyframes ti-zoom { from { transform: scale(0.6); opacity: 0.6; } to { transform: scale(1.4); opacity: 1; } }
        @keyframes ti-twinkle { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes ti-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
        .ti-rise { animation: ti-rise 2.6s ease-out forwards; }
        .ti-fly { animation: ti-fly 3.9s linear forwards; }
        .ti-zoom { animation: ti-zoom 2s ease-in forwards; }
        .ti-twinkle { animation: ti-twinkle 1.6s ease-in-out infinite; }
        .ti-glow { animation: ti-glow 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ti-rise, .ti-fly, .ti-zoom, .ti-twinkle, .ti-glow { animation: none !important; }
        }
      `}</style>
      {!reducedMotion && (
        <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute intro sound' : 'Mute intro sound'} style={{ position: 'absolute', top: '1rem', left: '1rem', minHeight: '48px', minWidth: '48px', padding: '0 1.25rem', borderRadius: '9999px', border: '2px solid #fff', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      )}
      <button type="button" autoFocus onClick={finish} style={{ position: 'absolute', top: '1rem', right: '1rem', minHeight: '48px', minWidth: '48px', padding: '0 1.25rem', borderRadius: '9999px', border: '2px solid #fff', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
        Skip intro ×
      </button>
      {reducedMotion ? (
        <div style={{ textAlign: 'center', maxWidth: '22rem' }}>
          <StaticScene />
          <button type="button" onClick={finish} style={{ marginTop: '1.5rem', minHeight: '48px', padding: '0 1.5rem', borderRadius: '9999px', border: 'none', background: '#f97316', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
            Continue to EduPlay →
          </button>
        </div>
      ) : (
        <Scene />
      )}
    </div>
  )
}
