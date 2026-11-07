'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  INTERACTIVE_SOUND_EVENT,
  playEduSound,
  readInteractiveSoundOn,
  startGameMusic,
  stopGameMusic,
} from '@/lib/game-sound'

/**
 * PLAY SHELL (2026-11-03, first launch work after the one-click host).
 * The shared play pattern every game should eventually follow:
 * Start screen -> 3-2-1 countdown -> game with an elapsed-time header
 * + score + a Pause button that actually freezes play.
 *
 * This batch wires it into the QUIZ player only. Other players are
 * untouched; the next batch rolls this out type by type using the
 * exact integration point below:
 *   1. Wrap the player's rendered UI in <PlayShell title score finished>.
 *   2. Inside, read usePlayShellStatus() and freeze that player's own
 *      timers/timeouts while the status is 'paused' (and do not start
 *      them while it is 'idle', i.e. during Start/countdown).
 *   3. Lift the player's real score and finished flag up to the shell
 *      so the header shows the same score the end screen reports.
 *
 * Deliberately NOT in this batch: Top 10, FAQ, Similar games (a later
 * batch), any per-question timer (the shell timer is elapsed time
 * only), and any sound (the shell adds no audio, so the existing
 * device sound setting and default-muted behaviour are unchanged).
 * No scores, ratings, plays, or leaderboard entries are invented here:
 * the header shows only the wrapped player's real score, and the
 * timer shows only real elapsed seconds since the countdown ended.
 *
 * GAME FEEL (2026-11-07, build-list item 4): the shell now adds the
 * shared play feel — soft background music while playing (own
 * synthesized Web Audio, quiet, following the interactive sound
 * setting, so the visible mute button stops it), a soft tick with
 * each elapsed second, and click sounds on the Start/Pause/Resume
 * buttons. The shell timer was already visible in the header; the
 * tick is its sound, not a second timer. Music starts when play
 * begins (after the countdown), pauses with the game, and stops at
 * finish or unmount.
 */

export type PlayShellStatus = 'idle' | 'playing' | 'paused'

// Standalone players (not wrapped in a shell) read 'playing', so their
// behaviour is exactly as before.
const PlayShellStatusContext = createContext<PlayShellStatus>('playing')

export function usePlayShellStatus(): PlayShellStatus {
  return useContext(PlayShellStatusContext)
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface PlayShellProps {
  // The game type's own name only (e.g. "Quiz") — never invented content.
  title: string
  // The wrapped player's real score, kept in sync by the player itself.
  score: number
  finished: boolean
  // Optional: report the shell's elapsed seconds up to a host (e.g. the
  // play page) so it can use the shell's time as the SINGLE elapsed
  // time instead of running its own load-time timer alongside it.
  // The shell's elapsed starts at 0 when play begins (after the
  // countdown) — countdown seconds are deliberately NOT counted.
  onElapsed?: (seconds: number) => void
  children: ReactNode
}

type Phase = 'start' | 'countdown' | 'playing' | 'paused'

const COUNTDOWN_SECONDS = 3
const COUNTDOWN_STEP_MS = 1000

export default function PlayShell({ title, score, finished, onElapsed, children }: PlayShellProps) {
  const [phase, setPhase] = useState<Phase>('start')
  const [count, setCount] = useState(COUNTDOWN_SECONDS)
  const [elapsed, setElapsed] = useState(0)
  // GAME FEEL: the interactive sound setting (default ON) drives the
  // music, the tick, and the button clicks. The visible mute button
  // (the header InteractiveSoundToggle on the play page) dispatches
  // this event, so muting stops the music immediately.
  const [soundOn, setSoundOn] = useState<boolean>(() => readInteractiveSoundOn())
  useEffect(() => {
    setSoundOn(readInteractiveSoundOn())
    const sync = (e: Event) => {
      const detail = (e as CustomEvent<{ on?: boolean }>).detail
      if (typeof detail?.on === 'boolean') setSoundOn(detail.on)
    }
    window.addEventListener(INTERACTIVE_SOUND_EVENT, sync)
    return () => window.removeEventListener(INTERACTIVE_SOUND_EVENT, sync)
  }, [])

  // GAME FEEL: music runs only while the game is actually playing —
  // not on the Start screen, not during the countdown, not while
  // paused, and never after finish. Stops on unmount too.
  useEffect(() => {
    if (phase === 'playing' && !finished && soundOn) startGameMusic()
    else stopGameMusic()
    return () => stopGameMusic()
  }, [phase, finished, soundOn])

  // GAME FEEL: one soft tick per elapsed second while playing — the
  // sound of the visible header timer. Very quiet by design.
  useEffect(() => {
    if (phase === 'playing' && !finished && soundOn && elapsed > 0) playEduSound('tick', true)
  }, [elapsed, phase, finished, soundOn])

  // Countdown: 3, then 2, then 1, one second each, then play starts.
  useEffect(() => {
    if (phase !== 'countdown') return
    const id = setTimeout(() => {
      if (count <= 1) setPhase('playing')
      else setCount((c) => c - 1)
    }, COUNTDOWN_STEP_MS)
    return () => clearTimeout(id)
  }, [phase, count])

  // Elapsed timer: real seconds since play started, counting up.
  // It runs only while playing and stops at finish; pausing stops it
  // because the phase leaves 'playing'. It is 0 throughout the
  // Start screen and the countdown: the interval only starts once
  // the phase becomes 'playing', so pre-start seconds are never
  // counted (this was the 2026-11-03 timer fix — the seconds seen
  // on the Start screen came from the play page's own load-time
  // timer, not from this shell; that page timer is now disabled
  // for Quiz, see the play page).
  useEffect(() => {
    if (phase !== 'playing' || finished) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [phase, finished])

  // Report elapsed up whenever it changes (and once on finish, when
  // the value is final). The host uses this as its single elapsed
  // time; reporting the same value twice is a no-op for the host.
  useEffect(() => {
    onElapsed?.(elapsed)
  }, [elapsed, finished, onElapsed])

  const status: PlayShellStatus =
    phase === 'playing' ? 'playing' : phase === 'paused' ? 'paused' : 'idle'

  if (phase === 'start') {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-primary)' }}>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>
          {title}
        </h2>
        <button
          onClick={() => { playEduSound('click', soundOn); setCount(COUNTDOWN_SECONDS); setPhase('countdown') }}
          style={{
            background: 'var(--color-primary)', color: '#fff', border: 'none',
            borderRadius: 'var(--radius)', padding: '0.875rem 2.5rem',
            fontSize: '1.125rem', fontFamily: 'var(--font-display)', cursor: 'pointer',
          }}
        >
          Start
        </button>
      </div>
    )
  }

  if (phase === 'countdown') {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-primary)' }}>
        <div aria-live="polite" style={{ fontSize: '4rem', fontFamily: 'var(--font-display)' }}>
          {count}
        </div>
      </div>
    )
  }

  // Playing, paused, or finished: header + game, with a pause overlay
  // that covers the game while paused so no answer can be tapped.
  return (
    <PlayShellStatusContext.Provider value={status}>
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.5rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem',
        }}>
          <span aria-label={`Elapsed time ${formatElapsed(elapsed)}`}>⏱ {formatElapsed(elapsed)}</span>
          <span>Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong></span>
          {!finished && phase === 'playing' && (
            <button
              onClick={() => { playEduSound('click', soundOn); setPhase('paused') }}
              style={{
                background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                padding: '0.375rem 0.875rem', cursor: 'pointer', fontSize: '0.9rem',
              }}
            >
              Pause
            </button>
          )}
          {!finished && phase === 'paused' && (
            // One Resume control only (the overlay button below): a
            // second one here would duplicate the action and confuse
            // both players and automated checks.
            <span>Paused</span>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          {children}
          {phase === 'paused' && !finished && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem',
              background: 'rgba(0, 0, 0, 0.55)', color: '#fff', borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)' }}>Paused</div>
              <button
                onClick={() => { playEduSound('click', soundOn); setPhase('playing') }}
                style={{
                  background: 'var(--color-primary)', color: '#fff', border: 'none',
                  borderRadius: 'var(--radius)', padding: '0.75rem 2rem',
                  fontSize: '1rem', fontFamily: 'var(--font-display)', cursor: 'pointer',
                }}
              >
                Resume
              </button>
            </div>
          )}
        </div>
      </div>
    </PlayShellStatusContext.Provider>
  )
}
