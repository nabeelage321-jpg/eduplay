'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, SCORE_PER_CORRECT, shuffleArray } from './shared'
import ScorePill from '@/components/game/ScorePill'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import type { ActivityItem } from '@/types'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  PATTERN_ECHO_MAX_ROUNDS,
  PATTERN_ECHO_POINTS_PER_ROUND,
  PATTERN_ECHO_MAX_PER_ROUND,
  PATTERN_ECHO_PADS,
  PATTERN_ECHO_START_LENGTH,
  PATTERN_ECHO_MAX_LENGTH,
  patternLengthForRound,
  newPatternEchoGame,
  tapGate,
  startRepeat,
  tapPad,
  buildPatternEchoRound,
  type PatternEchoState,
  type PatternEchoRound,
} from '@/lib/pattern-echo'

/**
 * Pattern Echo — EduPlay's own memory-sequence game (type 61).
 *
 * Four coloured pads light up in a pattern, each with its own
 * tone, and the kid taps the pads back in the same order. Each
 * round the pattern grows by one step. No rival's name, art, or
 * audio is copied: the name is EduPlay's own, the pads are Ruby,
 * Sunny, Leafy, and Sky — plain coloured shapes drawn here with
 * own tones — and no trademarked game name is used. Sounds are
 * the shared interactive Web Audio system (synthesized, no
 * assets) for correct / win, plus one own tone per pad below.
 * Sound is ON by default for this game; the in-player toggle
 * mutes it in one tap. Background music is the shared PlayShell
 * loop (music note ~0.12 / bass ~0.08).
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct pad's answer. Each round's four pads
 * hold the round's own answer on one pad and wrong answers
 * borrowed from the game's other items on the other three.
 * No new save path was needed: the save route already stores
 * prompt/answer for every type, and the adapter passes creator
 * rows through untouched.
 *
 * Rules (exact):
 * - 10 points per pattern repeated exactly, 10 rounds — score
 *   out of 10 x rounds.
 * - GATE: before the pattern shows, tap the pad holding the
 *   right answer to the round's question. A wrong pad at the
 *   gate just wobbles — try again, nothing is lost. Answering
 *   correctly reveals the pattern.
 * - WATCH: the pads light up in order, each with its own tone.
 *   Then repeat the pattern by tapping the pads in the same
 *   order — tap (or click) a pad, or press 1, 2, 3, or 4.
 * - A WRONG tap while repeating is never harsh: no life is
 *   lost (there are no lives to lose in this game) and no
 *   points are lost — the pattern simply plays again from the
 *   start and you try again.
 * - The pattern starts at 3 steps and grows by one step every
 *   round, up to 8 steps. All rounds done = win ("Pattern Echo
 *   Complete!"). onComplete fires exactly once with the real
 *   score plus rounds won / total rounds.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - Pause via the shared PlayShell blocks new taps and holds the
 *   pattern playback until play resumes (the playback timers
 *   only advance while the shell status is 'playing'). Reading
 *   How to Play mid-game also blocks taps and playback.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the pattern
 *   growing, and the gentle wrong tap — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, so any question list where
 *   every item has at least three different answers to borrow as
 *   wrong pads plays. A question with fewer keeps the plain
 *   message — see convert.ts.
 *   Print: NOT printable (needs its lighting pads, tones, and
 *   pattern playback) — see print-worksheet.ts. Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface PatternEchoGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** One own tone per pad, so the pattern is hearable:
 *  synthesized Web Audio, no recording, no asset. */
let echoCtx: AudioContext | null = null
function echoAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!echoCtx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      echoCtx = new AC()
    }
    if (echoCtx.state === 'suspended') void echoCtx.resume()
    return echoCtx
  } catch {
    return null
  }
}
function playPadTone(soundOn: boolean, padIndex: number) {
  if (!soundOn) return
  const pad = PATTERN_ECHO_PADS[padIndex]
  if (!pad) return
  const ctx = echoAudioCtx()
  if (!ctx) return
  try {
    const t0 = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(pad.freq, t0)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.5)
  } catch {
    /* sound is best-effort — a tap still counts without it */
  }
}
/** A soft low note for a gentle wrong tap — never a blast. */
function playSoftOops(soundOn: boolean) {
  if (!soundOn) return
  const ctx = echoAudioCtx()
  if (!ctx) return
  try {
    const t0 = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(196, t0)
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.35)
  } catch {
    /* sound is best-effort */
  }
}

function PatternEchoGame({ items, locale, onComplete, onProgress }: PatternEchoGameProps) {
  const [rounds, setRounds] = useState<PatternEchoRound[]>([])
  const [game, setGame] = useState<PatternEchoState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [roundsWon, setRoundsWon] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  /** The pad lit up right now during pattern playback (or a tap). */
  const [litPad, setLitPad] = useState<number | null>(null)
  /** Watch playback position: -1 = about to start, else the step lit. */
  const [watchStep, setWatchStep] = useState(-1)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()
  const shellStatusRef = useRef(shellStatus)
  useEffect(() => { shellStatusRef.current = shellStatus }, [shellStatus])

  // Build rounds once per content fingerprint.
  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}\u0000${i.imageUrl ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    const usable = items.filter((i) => i.prompt && i.answer)
    const shuffled = shuffleArray(usable).slice(0, PATTERN_ECHO_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: PatternEchoRound[] = []
    for (const item of shuffled) {
      const round = buildPatternEchoRound(item.prompt, item.answer, allAnswers, built.length, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newPatternEchoGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setScore(0)
    setRoundsWon(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setLitPad(null)
    setWatchStep(-1)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const roundsWonRef = useRef(0)
  const streakRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { roundsWonRef.current = roundsWon })
  useEffect(() => { streakRef.current = streak })
  useEffect(() => { onProgress(score, finished) }, [score, finished, onProgress])

  const finishGame = useCallback((didWin: boolean) => {
    setWon(didWin)
    setFinished(true)
    if (!completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(scoreRef.current, {
        correctCount: roundsWonRef.current,
        totalCount: rounds.length,
      })
    }
  }, [rounds.length])

  // Finish sound once: win on Pattern Echo Complete.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

  // A fresh round whenever the round changes.
  const roundsRef = useRef(rounds)
  useEffect(() => { roundsRef.current = rounds }, [rounds])
  const currentRef = useRef(current)
  useEffect(() => { currentRef.current = current }, [current])
  const gameRef = useRef(game)
  useEffect(() => { gameRef.current = game }, [game])
  const watchStepRef = useRef(watchStep)
  useEffect(() => { watchStepRef.current = watchStep }, [watchStep])
  useEffect(() => {
    const round = rounds[current]
    if (!round) return
    const fresh = newPatternEchoGame(round)
    gameRef.current = fresh
    setGame(fresh)
    setLitPad(null)
    watchStepRef.current = -1
    setWatchStep(-1)
  }, [current, rounds])

  // Reset the watch playback whenever a round enters the watch phase.
  const prevPhaseRef = useRef<string | null>(null)
  useEffect(() => {
    const phase = game?.phase ?? null
    if (phase === 'watch' && prevPhaseRef.current !== 'watch') {
      watchStepRef.current = -1
      setWatchStep(-1)
      setLitPad(null)
    }
    prevPhaseRef.current = phase
  }, [game?.phase])

  /** Advance after the current round ends. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setFeedback(null)
    if (from + 1 >= roundsRef.current.length) {
      finishGame(true)
      return
    }
    setCurrent(from + 1)
  }, [finishGame])

  /** The pattern finished playing — the kid's turn to repeat it. */
  const beginRepeat = useCallback(() => {
    const g = gameRef.current
    if (!g || g.phase !== 'watch') return
    const next = startRepeat(g)
    gameRef.current = next
    setGame(next)
    setFeedback({ type: 'correct', msg: 'Your turn — tap the pads in the same order!' })
  }, [])

  // Pattern playback: one pad lights (and sounds) per tick, only
  // while the shell is playing and How to Play is closed. Pausing
  // holds the pattern where it is — the step is kept, so resuming
  // continues from the same step, never restarts it.
  useEffect(() => {
    if (!game || game.phase !== 'watch') return
    if (shellStatus !== 'playing' || showHowto) return
    const step = watchStep
    const t = setTimeout(() => {
      const g = gameRef.current
      if (!g || g.phase !== 'watch') return
      if (shellStatusRef.current !== 'playing' || showHowto) return
      const next = watchStepRef.current + 1
      if (next < g.round.pattern.length) {
        watchStepRef.current = next
        setWatchStep(next)
        const padIdx = g.round.pattern[next]!
        setLitPad(padIdx)
        playPadTone(readInteractiveSoundOn(), padIdx)
        setTimeout(() => setLitPad((cur) => (cur === padIdx ? null : cur)), 450)
      } else {
        watchStepRef.current = -1
        setWatchStep(-1)
        setLitPad(null)
        beginRepeat()
      }
    }, step === -1 ? 800 : 650)
    return () => clearTimeout(t)
  }, [game, watchStep, shellStatus, showHowto, beginRepeat])

  /** Tap a pad at the gate: the right answer reveals the pattern. */
  const tapGatePad = useCallback((padIndex: number) => {
    if (shellStatusRef.current !== 'playing' || showHowto || finished) return
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g) return
    const next = tapGate(g, padIndex)
    if (next === g) return
    playPadTone(readInteractiveSoundOn(), padIndex)
    gameRef.current = next
    setGame(next)
    const event = next.lastEvent
    if (!event) return
    if (event.kind === 'gate-correct') {
      setFeedback({ type: 'correct', msg: `That's right — ${event.answer}! Now watch the pattern…` })
    } else if (event.kind === 'gate-wrong') {
      playSoftOops(readInteractiveSoundOn())
      setFeedback({ type: 'wrong', msg: `Not that one — ${event.answer} isn't the answer. Try another pad!` })
    }
  }, [showHowto, finished])

  /** Tap a pad while repeating the pattern. */
  const tapRepeatPad = useCallback((padIndex: number) => {
    if (shellStatusRef.current !== 'playing' || showHowto || finished) return
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g) return
    const next = tapPad(g, padIndex)
    if (next === g) return
    playPadTone(readInteractiveSoundOn(), padIndex)
    setLitPad(padIndex)
    setTimeout(() => setLitPad((cur) => (cur === padIndex ? null : cur)), 300)
    gameRef.current = next
    setGame(next)
    const event = next.lastEvent
    if (!event) return
    if (event.kind === 'echo-correct') {
      setFeedback(null)
    } else if (event.kind === 'echo-wrong') {
      playSoftOops(readInteractiveSoundOn())
      setFeedback({ type: 'wrong', msg: 'Oops — that pad wasn\'t next. Watch the pattern again, then try once more!' })
    } else if (event.kind === 'round-won') {
      playEduSound('correct', readInteractiveSoundOn())
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setRoundsWon((r) => r + 1)
      roundsWonRef.current = roundsWonRef.current + 1
      setStreak((s) => s + 1)
      streakRef.current = streakRef.current + 1
      advancingRef.current = true
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `You echoed it! +${SCORE_PER_CORRECT} points — the pattern is yours!`,
      })
      setTimeout(() => advanceFrom(from), 1600)
    }
  }, [showHowto, finished, advanceFrom])

  // Keyboard: 1, 2, 3, or 4 taps the first, second, third, or fourth pad.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      const idx = ['1', '2', '3', '4'].indexOf(e.key)
      if (idx < 0) return
      const g = gameRef.current
      if (!g) return
      e.preventDefault()
      if (g.phase === 'gate') tapGatePad(idx)
      else if (g.phase === 'repeat') tapRepeatPad(idx)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shellStatus, showHowto, finished, tapGatePad, tapRepeatPad])

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
    const first = roundsRef.current[0]
    if (first) {
      const fresh = newPatternEchoGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setScore(0)
    setRoundsWon(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setLitPad(null)
    watchStepRef.current = -1
    setWatchStep(-1)
    completedRef.current = false
    advancingRef.current = false
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no pattern yet — it needs questions with at least three other different answers to echo.
      </div>
    )
  }

  // ---- How to Play: FIRST, before play, and re-readable mid-game. ----
  if (showHowto) {
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', color: 'var(--color-text-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-end', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Sound <InteractiveSoundToggle />
        </div>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🎵</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Pattern Echo</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Watch the pads light up in a pattern, then tap them back in the same order!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> first, read the question at the top — for example, &ldquo;2+6 = ?&rdquo; — and tap the pad holding the right answer (8). Answering correctly reveals the pattern: the four pads light up one by one, each with its own sound — Ruby is low, Sunny a little higher, Leafy higher still, and Sky the highest. Watch and listen, then tap the pads back in the same order. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> repeating a round&apos;s pattern exactly earns {PATTERN_ECHO_POINTS_PER_ROUND} points — one pattern per round, so {PATTERN_ECHO_MAX_PER_ROUND} points a round at most and the game is scored out of {rounds.length * PATTERN_ECHO_MAX_PER_ROUND} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}).</p>
          <p><strong>Objective:</strong> echo every pattern, exactly as it played — and listen as the patterns grow longer!</p>
          <p><strong>Controls:</strong> tap (or click) a pad, or press 1, 2, 3, or 4 for the first, second, third, or fourth pad.</p>
          <p><strong>The pattern grows:</strong> the first round&apos;s pattern is {PATTERN_ECHO_START_LENGTH} steps, then one step longer every round — 4, 5, 6, 7 — up to {PATTERN_ECHO_MAX_LENGTH} steps.</p>
          <p><strong>A wrong tap is never harsh:</strong> there are no lives to lose in this game. Tap the wrong pad and the pattern simply plays again from the start — no points lost, no round lost. Just watch once more and try again.</p>
          <p><strong>Rounds:</strong> one pattern per question, in shuffled order. A fresh pattern waits in every round, and the right answer sits on a different pad each time.</p>
          <p><strong>How you win and finish:</strong> echo every round&apos;s pattern and you win. The end screen shows your score and how many patterns you echoed.</p>
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
          {won ? 'Pattern Echo Complete!' : 'Pattern Echo Complete!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * PATTERN_ECHO_MAX_PER_ROUND} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {roundsWon} of {rounds.length} patterns echoed
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

  const round = rounds[current]
  if (!round || !game) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  const canTap = (game.phase === 'gate' || game.phase === 'repeat') && shellStatus === 'playing' && !showHowto && !finished
  const phaseHint =
    game.phase === 'gate'
      ? 'Tap the pad holding the right answer to reveal the pattern!'
      : game.phase === 'watch'
        ? 'Watch and listen — the pattern is playing…'
        : game.phase === 'repeat'
          ? 'Your turn — tap the pads in the same order!'
          : 'You echoed it!'
  const stepsDone = game.phase === 'watch' ? Math.max(0, watchStep + 1) : game.progress

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * PATTERN_ECHO_MAX_PER_ROUND} />
        {streak >= 2 && (
          <span aria-live="polite" style={{ color: '#ea580c', fontWeight: 700 }}>🔥 streak x{streak}</span>
        )}
        <span aria-live="polite">Round {current + 1} of {rounds.length}</span>
        <span aria-live="polite">Pattern: {round.pattern.length} steps</span>
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
        <p style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', margin: 0 }}>
          {round.prompt}
        </p>
        {round.imageUrl && (
          <figure style={{ margin: '0.75rem 0 0' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={round.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: 'var(--radius)' }} />
            {round.imageCredit && (
              <figcaption style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {round.imageCredit}
              </figcaption>
            )}
          </figure>
        )}
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem', marginBottom: 0 }}>
          {phaseHint}
        </p>
        {/* Pattern progress dots — filled as each step plays or is repeated. */}
        <div aria-hidden="true" style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginTop: '0.6rem' }}>
          {round.pattern.map((_, i) => (
            <span
              key={i}
              style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: i < stepsDone ? 'var(--color-primary)' : 'var(--color-border)',
                display: 'inline-block',
              }}
            />
          ))}
        </div>
      </div>

      {/* The four echo pads: Ruby, Sunny, Leafy, Sky. */}
      <div
        role="application"
        aria-label={`Pattern Echo round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. Pattern: ${round.pattern.length} steps. ${game.phase === 'gate' ? 'Tap the pad holding the right answer to reveal the pattern.' : game.phase === 'watch' ? 'Watch the pattern play.' : game.phase === 'repeat' ? `Your turn — repeat the pattern. ${game.progress} of ${round.pattern.length} steps done.` : 'Round done.'} Tap a pad, or press 1, 2, 3, or 4.`}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          userSelect: 'none',
        }}
      >
        {round.pads.map((spot) => {
          const isLit = litPad === spot.padIndex
          return (
            <motion.button
              key={spot.padIndex}
              type="button"
              onClick={() => {
                if (game.phase === 'gate') tapGatePad(spot.padIndex)
                else if (game.phase === 'repeat') tapRepeatPad(spot.padIndex)
              }}
              disabled={!canTap}
              aria-label={`${spot.pad.name} pad, holding ${spot.answer}. ${game.phase === 'gate' ? 'Tap to answer.' : game.phase === 'repeat' ? 'Tap to repeat the pattern.' : ''}`}
              animate={isLit ? { scale: 1.06 } : { scale: 1 }}
              transition={{ duration: 0.15 }}
              style={{
                minHeight: '118px',
                borderRadius: 'var(--radius-lg)',
                border: `4px solid ${isLit ? spot.pad.color : 'var(--color-border)'}`,
                background: isLit ? spot.pad.color : '#fff',
                color: isLit ? '#fff' : 'var(--color-text-primary)',
                cursor: canTap ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem',
                boxShadow: isLit ? '0 4px 16px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.15)',
                padding: '0.75rem',
                opacity: game.phase === 'watch' && !isLit ? 0.85 : 1,
              }}
            >
              <span style={{ fontSize: '2rem', lineHeight: 1 }} aria-hidden="true">{spot.pad.emoji}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1 }}>
                {spot.pad.name}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2,
                  background: isLit ? 'rgba(255,255,255,0.25)' : spot.pad.color, color: '#fff',
                  borderRadius: '999px', padding: '0.25rem 0.7rem', maxWidth: '100%',
                  overflowWrap: 'break-word',
                }}
              >
                {spot.answer}
              </span>
            </motion.button>
          )
        })}
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Tap a pad (or press 1, 2, 3, or 4) — each pad has its own sound! A wrong tap just replays the pattern, so listen and try again.
        {game.mistakes > 0 && ` ${game.mistakes} ${game.mistakes === 1 ? 'replay' : 'replays'} so far this round.`}
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

export default function PatternEchoActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Pattern Echo" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <PatternEchoGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
