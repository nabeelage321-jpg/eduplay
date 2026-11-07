'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, SCORE_PER_CORRECT } from './shared'
import ScorePill from '@/components/game/ScorePill'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  NUMBER_MERGE_LIVES,
  NUMBER_MERGE_MAX_ROUNDS,
  NUMBER_MERGE_POINTS_PER_TARGET,
  NUMBER_MERGE_ROWS,
  NUMBER_MERGE_COLS,
  NUMBER_MERGE_TARGETS,
  numberMergeTargetForRound,
  newNumberMergeRound,
  slideNumberMerge,
  type NumberMergeDirection,
  type NumberMergeState,
} from '@/lib/number-merge'

/**
 * Number Merge — EduPlay's own 2048-STYLE sliding-merge game
 * (type 57).
 *
 * 2048-STYLE mechanic only: slide numbered tiles on a 4x4
 * board and two equal tiles merge into their sum. No 2048
 * name, no 2048 tiles, no Gabriele Cirulli art: the tiles are
 * plain rounded squares with numbers drawn here in our own
 * colours. Sounds are the shared interactive Web Audio system
 * (synthesized, no assets) for correct / wrong / win / lose,
 * plus four small sounds of our own below — a slide swish, a
 * merge chime, a target fanfare, and a low thud for a stuck
 * board — all synthesized sine tones, no recordings. Sound is
 * ON by default for this game; the in-player toggle mutes it
 * in one tap. Background music is the shared PlayShell loop.
 *
 * Data: the board IS the question — no text question is asked
 * and no game item is needed to play, so a game with no items
 * still plays. The numbers on the tiles are the maths, and
 * every merge shows its own equation in the merge feed
 * ("4 + 4 = 8"). No new save path was needed: the save route
 * already stores prompt/answer for every type, and the adapter
 * passes creator rows through untouched. Convert TO Number
 * Merge always works — the board makes its own numbers — see
 * convert.ts.
 *
 * Rules (exact):
 * - 3 lives. 10 points per TARGET REACHED (one target per
 *   round, up to 10 rounds). Score out of 10 x rounds.
 * - The board is 4 x 4 = 16 squares. Each round has a target
 *   number, doubling every round: 8, 16, 32, 64, 128, 256,
 *   512, 1024, 2048, 4096. Making a tile equal to the target
 *   clears the board and wins the round.
 * - Each round starts with six tiles whose values add up to
 *   exactly the target — two of target/4 and four of target/8
 *   (round 1, target 8: four 2s) — placed on random squares.
 *   A classic board starts with two 2s, so a late target like
 *   2048 would take hundreds of slides and a kid would never
 *   finish 10 rounds; the seeded start keeps every round a
 *   few minutes long at any target. The round is still won
 *   only by sliding and merging, and every slide still spawns
 *   a new 2 (usually) or 4, which can help or clog the board.
 * - A slide moves every tile as far as it goes; two equal
 *   tiles that meet merge into their sum. A tile merged in a
 *   slide cannot merge again in the same slide: [4, 4, 4, 4]
 *   slides to [8, 8], never [16]. A slide that moves nothing
 *   spawns nothing and costs nothing.
 * - After a slide that moved, one new tile spawns on a random
 *   empty square: a 2 nine times in ten, a 4 one time in ten.
 * - The target cannot be overshot: making a bigger tile needs
 *   two target tiles first, and the first one already wins
 *   the round. The seed never contains the target or anything
 *   bigger, and spawns are only 2 or 4.
 * - A board that is full with no two equal neighbours in any
 *   direction is STUCK — no slide can change it. A stuck
 *   board ends the round at once and costs 1 life, and the
 *   round restarts with a fresh seeded board and the same
 *   target.
 * - The streak counts rounds won in a row; losing a round
 *   resets it to 0.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win ("Number Merge Complete!"). onComplete fires
 *   exactly once with the real score plus correct/total counts
 *   and lives left.
 * - Pause via the shared PlayShell freezes the controls (the
 *   shell overlay covers the board, and the control handlers
 *   all require status 'playing'). Reading How to Play
 *   mid-game also freezes them. There is no clock in this
 *   game, so nothing falls or moves while paused.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the stuck board, the streak, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE for any game — the board makes its own numbers, so any item list converts, and the game's items are kept but not needed for play. A game with no items still plays.
 *   Print: NOT printable (needs its sliding tiles and merging) — see print-worksheet.ts. Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are fixed by
 * the target ladder, never built from items and never rebuilt
 * on render, so play-page timer ticks can never reshuffle a
 * game in progress. onComplete fires exactly once per finished
 * game.
 */

interface NumberMergeGameProps {
  items: ActivityProps['items']
  theme: ActivityProps['theme']
  locale: ActivityProps['locale']
  onComplete: ActivityProps['onComplete']
  onProgress: (score: number, finished: boolean) => void
}

/** Our own tile colours, by value — plain squares, drawn here. */
function tileColours(value: number): { bg: string; fg: string } {
  const ramp: Record<number, { bg: string; fg: string }> = {
    2: { bg: '#e8f4fd', fg: '#0f172a' },
    4: { bg: '#cdeafe', fg: '#0f172a' },
    8: { bg: '#93c5fd', fg: '#0f172a' },
    16: { bg: '#60a5fa', fg: '#ffffff' },
    32: { bg: '#34d399', fg: '#052e16' },
    64: { bg: '#22c55e', fg: '#ffffff' },
    128: { bg: '#fbbf24', fg: '#451a03' },
    256: { bg: '#f59e0b', fg: '#ffffff' },
    512: { bg: '#f97316', fg: '#ffffff' },
    1024: { bg: '#ef4444', fg: '#ffffff' },
    2048: { bg: '#dc2626', fg: '#ffffff' },
    4096: { bg: '#7c3aed', fg: '#ffffff' },
  }
  return ramp[value] ?? { bg: '#111827', fg: '#ffffff' }
}

/** Our own merge sounds: synthesized sine tones, no recording,
 *  no asset. A slide is a short swish down, a merge is a
 *  two-note chime up, a target is a four-note fanfare, a stuck
 *  board is a low thud. */
let mergeCtx: AudioContext | null = null
function playMergeSound(
  soundOn: boolean,
  kind: 'slide' | 'merge' | 'fanfare' | 'thud',
) {
  if (!soundOn || typeof window === 'undefined') return
  try {
    if (!mergeCtx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      mergeCtx = new AC()
    }
    if (mergeCtx.state === 'suspended') void mergeCtx.resume()
    const t0 = mergeCtx.currentTime
    const tone = (freq: number, start: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) => {
      const osc = mergeCtx!.createOscillator()
      const gain = mergeCtx!.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, start)
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur)
      gain.gain.setValueAtTime(vol, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
      osc.connect(gain)
      gain.connect(mergeCtx!.destination)
      osc.start(start)
      osc.stop(start + dur + 0.02)
    }
    if (kind === 'slide') {
      tone(320, t0, 0.09, 'sine', 0.1, 200)
    } else if (kind === 'merge') {
      tone(660, t0, 0.08, 'sine', 0.16)
      tone(880, t0 + 0.07, 0.1, 'sine', 0.16)
    } else if (kind === 'fanfare') {
      ;[523, 659, 784, 1047].forEach((f, i) => tone(f, t0 + i * 0.09, 0.14, 'sine', 0.18))
    } else {
      tone(150, t0, 0.3, 'sine', 0.25, 50)
    }
  } catch {
    /* sound is best-effort — a slide still counts without it */
  }
}

/** One round's target, as the banner shows it. */
function targetHint(target: number): string {
  return `Merge two ${target / 2}s — slide the tiles together.`
}

function NumberMergeGame({ locale, onComplete, onProgress }: NumberMergeGameProps) {
  const [game, setGame] = useState<NumberMergeState>(() =>
    newNumberMergeRound(numberMergeTargetForRound(0)),
  )
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(NUMBER_MERGE_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  // Swipe bookkeeping: where the finger went down on the board.
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()

  useEffect(() => {
    if (feedback) playEduSound(feedback.type, readInteractiveSoundOn())
  }, [feedback])

  const scoreRef = useRef(0)
  const livesRef = useRef(NUMBER_MERGE_LIVES)
  const correctRef = useRef(0)
  const streakRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { correctRef.current = correctCount })
  useEffect(() => { streakRef.current = streak })
  useEffect(() => { onProgress(score, finished) }, [score, finished, onProgress])

  const finishGame = useCallback((didWin: boolean) => {
    setWon(didWin)
    setFinished(true)
    if (!completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(scoreRef.current, {
        correctCount: correctRef.current,
        totalCount: NUMBER_MERGE_MAX_ROUNDS,
        livesLeft: livesRef.current,
      })
    }
  }, [])

  // Finish sound once: win on Number Merge Complete, lose on game over.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

  // A fresh seeded board whenever the round changes.
  const gameRef = useRef(game)
  useEffect(() => { gameRef.current = game }, [game])
  const currentRef = useRef(current)
  useEffect(() => { currentRef.current = current }, [current])
  useEffect(() => {
    const fresh = newNumberMergeRound(numberMergeTargetForRound(current))
    gameRef.current = fresh
    setGame(fresh)
  }, [current])

  /** Advance after the current round ends. Lives already applied.
   *  A won round moves to the next target; a lost round replays
   *  the same target with a fresh seeded board. */
  const advanceFrom = useCallback((from: number, roundWon: boolean) => {
    advancingRef.current = false
    setFeedback(null)
    if (livesRef.current <= 0) {
      finishGame(false)
      return
    }
    if (roundWon) {
      if (from + 1 >= NUMBER_MERGE_MAX_ROUNDS) {
        finishGame(true)
        return
      }
      setCurrent(from + 1)
      return
    }
    const fresh = newNumberMergeRound(numberMergeTargetForRound(from))
    gameRef.current = fresh
    setGame(fresh)
  }, [finishGame])

  /** Lose one life and end the round. */
  const loseRound = useCallback((msg: string) => {
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setStreak(0)
    streakRef.current = 0
    advancingRef.current = true
    const from = currentRef.current
    setFeedback({
      type: 'wrong',
      msg: livesRef.current <= 0 ? `${msg} — and you are out of lives.` : msg,
    })
    setTimeout(() => advanceFrom(from, false), 1800)
  }, [advanceFrom])

  /** Resolve a slide from the lib. */
  const resolveEvent = useCallback((next: NumberMergeState) => {
    const event = next.lastEvent
    if (!event) return
    if (event.kind === 'no-move') return
    if (event.kind === 'slid') {
      if (event.merges.length > 0) {
        playMergeSound(readInteractiveSoundOn(), 'merge')
      } else {
        playMergeSound(readInteractiveSoundOn(), 'slide')
      }
      return
    }
    if (event.kind === 'target-reached') {
      playMergeSound(readInteractiveSoundOn(), 'fanfare')
      setScore((s) => s + NUMBER_MERGE_POINTS_PER_TARGET)
      scoreRef.current = scoreRef.current + NUMBER_MERGE_POINTS_PER_TARGET
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      setStreak((s) => s + 1)
      streakRef.current = streakRef.current + 1
      advancingRef.current = true
      const from = currentRef.current
      const made = event.merges.find((m) => m.to === next.target)
      setFeedback({
        type: 'correct',
        msg: made
          ? `You made ${next.target}! ${made.from} + ${made.from} = ${made.to} — +${NUMBER_MERGE_POINTS_PER_TARGET} points!`
          : `You made ${next.target}! +${NUMBER_MERGE_POINTS_PER_TARGET} points!`,
      })
      setTimeout(() => advanceFrom(from, true), 1400)
      return
    }
    if (event.kind === 'board-full') {
      playMergeSound(readInteractiveSoundOn(), 'thud')
      loseRound('Board full — no tiles can move or merge.')
      return
    }
  }, [advanceFrom, loseRound])

  /** Apply a lib state and resolve its event. */
  const applyState = useCallback((next: NumberMergeState) => {
    gameRef.current = next
    setGame(next)
    resolveEvent(next)
  }, [resolveEvent])

  /** Slide the board one way: arrow keys, swipe, or the pad. */
  const doSlide = useCallback((direction: NumberMergeDirection) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    setFeedback(null)
    applyState(slideNumberMerge(g, direction))
  }, [advancingRef, finished, shellStatus, showHowto, applyState])

  // Keyboard: arrows and WASD slide the board.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      let direction: NumberMergeDirection | null = null
      if (e.key === 'ArrowUp' || key === 'w') direction = 'up'
      else if (e.key === 'ArrowDown' || key === 's') direction = 'down'
      else if (e.key === 'ArrowLeft' || key === 'a') direction = 'left'
      else if (e.key === 'ArrowRight' || key === 'd') direction = 'right'
      if (!direction) return
      e.preventDefault()
      doSlide(direction)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [shellStatus, showHowto, finished, doSlide])

  function startPlaying() {
    playEduSound('click', readInteractiveSoundOn())
    completedRef.current = false
    setShowHowto(false)
    setStarted(true)
  }

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    const fresh = newNumberMergeRound(numberMergeTargetForRound(0))
    gameRef.current = fresh
    setGame(fresh)
    setLives(NUMBER_MERGE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    completedRef.current = false
    advancingRef.current = false
  }

  // ---- How to Play: FIRST, before play, and re-readable mid-game. ----
  if (showHowto) {
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', color: 'var(--color-text-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-end', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Sound <InteractiveSoundToggle />
        </div>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🔢</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Number Merge</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Slide the numbered tiles — two equal tiles merge into their sum. Make the target number to clear the board!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> the board is {NUMBER_MERGE_ROWS} squares by {NUMBER_MERGE_COLS} squares. Each round gives you a target number — round 1 is 8, then 16, 32, 64, and so on, doubling every round. Slide all the tiles one way and two equal tiles that meet merge into their sum: 4 + 4 = 8. Every merge shows its own sum under the board, so you always see the maths you just did. Each round starts with six tiles that add up to exactly the target, so every round is winnable in a few minutes — even the big targets.</p>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius)', background: '#cdeafe', color: '#0f172a', fontFamily: 'var(--font-display)', fontWeight: 700 }}>4</span>
            <span aria-hidden="true">+</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius)', background: '#cdeafe', color: '#0f172a', fontFamily: 'var(--font-display)', fontWeight: 700 }}>4</span>
            <span aria-hidden="true">→</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius)', background: '#93c5fd', color: '#0f172a', fontFamily: 'var(--font-display)', fontWeight: 700 }}>8</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Slide two 4s together and they become an 8.</span>
          </p>
          <p><strong>How scores are given:</strong> making the target number earns {NUMBER_MERGE_POINTS_PER_TARGET} points — one target per round, so the game is scored out of {NUMBER_MERGE_MAX_ROUNDS * NUMBER_MERGE_POINTS_PER_TARGET} ({NUMBER_MERGE_MAX_ROUNDS} targets). Merging smaller tiles earns no points on its own — only the target does.</p>
          <p><strong>Objective:</strong> make every round&apos;s target — 8, then 16, then 32, all the way to 4096 — without running out of lives, and keep your streak of rounds won in a row going!</p>
          <p><strong>Controls:</strong> swipe the board, or press the arrow keys (W A S D works too), or tap the arrow buttons under the board. A slide that moves nothing does nothing — no new tile appears and no life is lost — so just slide another way. A tile that merges in one slide cannot merge again in that same slide: four 4s in a row slide to two 8s, never one 16.</p>
          <p><strong>Lives:</strong> you start with {NUMBER_MERGE_LIVES} lives. A board that is full with no two equal neighbours is stuck — no slide can change it — and that ends the round at once and costs 1 life. The round then restarts with a fresh board and the same target, so a stuck board never ends the game on its own.</p>
          <p><strong>Stuck board:</strong> watch the board fill up — every slide adds a new 2 (usually) or 4 to a random empty square. Keep equal tiles near each other so they can merge and free space, and never let the board fill with tiles that have no equal neighbour.</p>
          <p><strong>Rounds:</strong> one target per round, doubling every round: {NUMBER_MERGE_TARGETS.join(', ')}. A fresh board is laid in every round, and a round you lose is replayed with the same target, not skipped.</p>
          <p><strong>How you win and finish:</strong> make every target with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many targets you made, and how many lives are left.</p>
        </div>
        <button
          onClick={startPlaying}
          style={{
            marginTop: '1.25rem', width: '100%', padding: '0.9rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)',
            fontSize: '1.05rem', cursor: 'pointer',
          }}
        >
          {started ? 'Back to game' : 'Skip instructions — start playing'}
        </button>
        {!started && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.6rem' }}>
            You can re-read this page any time from the &ldquo;How to play&rdquo; button during the game.
          </p>
        )}
      </div>
    )
  }

  // ---- End screen ----
  if (finished) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">{won ? '🏆' : '💔'}</div>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
          {won ? 'Number Merge Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={NUMBER_MERGE_MAX_ROUNDS * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {NUMBER_MERGE_MAX_ROUNDS} targets made
          {` · ${lives} ${lives === 1 ? 'life' : 'lives'} left`}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
          <InteractiveSoundToggle />
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowHowto(true)}
            style={{
              padding: '0.8rem 1.25rem', borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            How to play
          </button>
          <button
            onClick={playAgain}
            style={{
              padding: '0.8rem 1.5rem', borderRadius: 'var(--radius-lg)',
              border: 'none', background: 'var(--color-primary)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Play again
          </button>
        </div>
      </motion.div>
    )
  }

  const target = numberMergeTargetForRound(current)
  const lastMerges = game.lastMerges

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={NUMBER_MERGE_MAX_ROUNDS * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, NUMBER_MERGE_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        {streak >= 2 && (
          <span aria-live="polite" style={{ color: '#ea580c', fontWeight: 700 }}>🔥 streak x{streak}</span>
        )}
        <span aria-live="polite">Round {current + 1} of {NUMBER_MERGE_MAX_ROUNDS}</span>
        <button
          onClick={() => setShowHowto(true)}
          style={{
            padding: '0.35rem 0.7rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          How to play
        </button>
        <InteractiveSoundToggle />
      </div>

      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1rem',
        color: 'var(--color-text-primary)', textAlign: 'center', boxShadow: 'var(--shadow-card)',
      }}>
        <p style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: 0 }}>
          Make {target}!
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem', marginBottom: 0 }}>
          {targetHint(target)}
        </p>
      </div>

      {/* The board: 4 x 4 tiles. Swipe it, or use the keys or the pad. */}
      <div
        role="grid"
        aria-label={`Number Merge board, round ${current + 1} of ${NUMBER_MERGE_MAX_ROUNDS}. Make ${target}. ${lives} lives left.`}
        onTouchStart={(e) => {
          const touch = e.touches[0]
          if (touch) swipeStartRef.current = { x: touch.clientX, y: touch.clientY }
        }}
        onTouchEnd={(e) => {
          const start = swipeStartRef.current
          swipeStartRef.current = null
          if (!start) return
          const touch = e.changedTouches[0]
          if (!touch) return
          const dx = touch.clientX - start.x
          const dy = touch.clientY - start.y
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
          if (Math.abs(dx) > Math.abs(dy)) {
            doSlide(dx > 0 ? 'right' : 'left')
          } else {
            doSlide(dy > 0 ? 'down' : 'up')
          }
        }}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${NUMBER_MERGE_COLS}, 1fr)`,
          gap: '6px',
          width: '100%',
          maxWidth: '420px',
          margin: '0 auto',
          userSelect: 'none',
          touchAction: 'pan-y',
          background: '#cbd5e1',
          padding: '6px',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {game.board.map((value, i) => {
          const colours = value === null ? { bg: '#e2e8f0', fg: '#0f172a' } : tileColours(value)
          const digits = value === null ? 0 : String(value).length
          return (
            <div
              key={i}
              role="gridcell"
              aria-label={
                value === null
                  ? `Square ${i + 1}: empty`
                  : `Square ${i + 1}: ${value}`
              }
              style={{
                aspectRatio: '1 / 1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: digits >= 4 ? '1.05rem' : digits === 3 ? '1.3rem' : '1.6rem',
                borderRadius: 'var(--radius)',
                background: colours.bg,
                color: colours.fg,
                padding: 0,
                boxSizing: 'border-box',
              }}
            >
              {value ?? ''}
            </div>
          )
        })}
      </div>

      {/* Merge feed: the sum of every merge in the last slide. */}
      <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: '0.75rem', minHeight: '1.4rem' }} aria-live="polite">
        {lastMerges.length > 0
          ? lastMerges.map((m) => `${m.from} + ${m.from} = ${m.to} ✓`).join(' · ')
          : game.moves === 0
            ? 'Slide the tiles — two equal tiles merge into their sum.'
            : 'No merge that time — slide another way.'}
      </p>

      {/* Arrow pad for mouse and touch users who do not swipe. */}
      <div
        role="group"
        aria-label="Slide the board"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 3rem)',
          gridTemplateRows: 'repeat(2, 3rem)',
          gap: '0.4rem',
          justifyContent: 'center',
          marginTop: '0.5rem',
        }}
      >
        <span />
        <button onClick={() => doSlide('up')} aria-label="Slide up"
          style={{ padding: 0, borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '1.25rem', cursor: 'pointer' }}>▲</button>
        <span />
        <button onClick={() => doSlide('left')} aria-label="Slide left"
          style={{ padding: 0, borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '1.25rem', cursor: 'pointer' }}>◀</button>
        <button onClick={() => doSlide('down')} aria-label="Slide down"
          style={{ padding: 0, borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '1.25rem', cursor: 'pointer' }}>▼</button>
        <button onClick={() => doSlide('right')} aria-label="Slide right"
          style={{ padding: 0, borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '1.25rem', cursor: 'pointer' }}>▶</button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
        Swipe the board, use the arrow keys (W A S D works too), or tap the arrows above. Every slide adds a new 2 or 4 — keep equal tiles together so they can merge.
      </p>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              marginTop: '1rem', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem',
            }}>
            {feedback.type === 'correct' ? '⭐ ' : '❌ '}{feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function NumberMergeActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Number Merge" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <NumberMergeGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
