'use client'

import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, SCORE_PER_CORRECT, shuffleArray } from './shared'
import ScorePill from '@/components/game/ScorePill'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import type { ActivityItem } from '@/types'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  FLUTTER_FLIGHT_LIVES,
  FLUTTER_FLIGHT_ROUND_SECONDS,
  FLUTTER_FLIGHT_WARNING_SECONDS,
  FLUTTER_FLIGHT_TICK_MS,
  FLUTTER_FLIGHT_MAX_ROUNDS,
  FLUTTER_FLIGHT_BIRD_X,
  FLUTTER_FLIGHT_GROUND_Y,
  FLUTTER_FLIGHT_START_Y,
  FLUTTER_FLIGHT_GATE_WIDTH,
  FLUTTER_FLIGHT_GAP_HALF,
  stepBird,
  moveGate,
  gateCrossedBird,
  birdInGap,
  buildFlutterFlightRound,
  flutterFlightGateStartX,
  type FlutterFlightRound,
} from '@/lib/flutter-flight'

/**
 * Flutter Flight — EduPlay's own flap-and-fly game (type 43).
 *
 * Flappy-STYLE mechanic only: the kid taps to flap our own little
 * bird through the sky and flies it through the gate with the
 * correct answer. No Flappy Bird name, no copied bird, no copied
 * pipes: the bird is a friendly round bird drawn in SVG here (teal
 * body, white belly, orange beak), and the gates are plain green
 * columns drawn here in CSS, each carrying one answer on a badge
 * in its gap. Sounds are the shared interactive Web Audio system
 * (synthesized, no assets). Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. One tap = one flap,
 * so the flap sound plays per tap — the game's only per-action
 * sound. Background music is the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = correct answer gate. Distractors are the OTHER
 * items' answers (up to 3, shuffled), exactly like Quiz builds
 * options. If a question carries its own picture (imageUrl), the
 * picture shows above the question — it is part of the question,
 * never decoration, never invented. No new save path was needed:
 * the save route already stores prompt/answer for every type, and
 * the adapter passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per correct round, score out of 10 x rounds.
 * - One round (one sky) per question, up to 10 rounds, shuffled
 *   once per item content. The shown question sits above the sky.
 * - The bird stays at a fixed spot on the left; gates fly in from
 *   the right, one at a time. Tap the sky, click, or press Space
 *   to flap — one tap gives one upward push, and gravity pulls the
 *   bird down between flaps. The ceiling is safe (the bird slides
 *   along it); the ground is a crash.
 * - When a gate reaches the bird: inside the gap means the gate is
 *   passed. A CORRECT gate: +10, correct sound, score pop, then
 *   the next sky. A WRONG gate: -1 life, wrong sound, shake/red,
 *   and that gate is used up — the next gate flies in, so one
 *   wrong gate can never cost a second life. Outside the gap means
 *   the bird hit the gate: -1 life, wrong sound, the bird resets
 *   to mid-sky and the SAME gate flies in again to retry.
 *   Touching the ground is the same as hitting a gate: -1 life,
 *   bird resets, same gate retries. All gates look exactly the
 *   same until passed — no colour ever gives the answer away.
 * - 45 seconds per round. At 5 seconds left, one timer-warning
 *   sound. Time up: -1 life, "Time's up!", round skipped.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Flutter Flight Complete!"). onComplete fires exactly once
 *   with the real score plus correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the round timer, the
 *   bird, and the gates (the shell overlay covers the sky, and the
 *   timer effect + flight interval + flap handlers all require
 *   status 'playing'). Reading How to Play mid-game also freezes
 *   the timer and the bird.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the timer, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the sky is generated from the game's
 *   own items, one sky per question, gates are the correct
 *   answer plus wrong answers borrowed from the other items, so
 *   any plain question list with at least two distinct answers
 *   plays. A lone question with nothing to borrow keeps the plain
 *   message — see convert.ts. Print: NOT printable (needs its
 *   flying bird and moving gates) — see print-worksheet.ts. Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface FlutterFlightGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Our own bird: a friendly round bird drawn in SVG here. */
function BirdArt({ tiltDeg }: { tiltDeg: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width="48"
      height="48"
      aria-hidden="true"
      style={{ transform: `rotate(${tiltDeg}deg)`, display: 'block' }}
    >
      <ellipse cx="24" cy="26" rx="17" ry="15" fill="#14b8a6" />
      <ellipse cx="24" cy="32" rx="11" ry="8" fill="#f0fdfa" />
      <ellipse cx="17" cy="26" rx="7" ry="5" fill="#0d9488" />
      <circle cx="31" cy="20" r="4.5" fill="#fff" />
      <circle cx="32.5" cy="20.5" r="2.2" fill="#134e4a" />
      <path d="M39 24 L47 27 L39 30 Z" fill="#f97316" />
      <path d="M10 16 Q6 10 12 8" stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function FlutterFlightGame({ items, locale, onComplete, onProgress }: FlutterFlightGameProps) {
  const [rounds, setRounds] = useState<FlutterFlightRound[]>([])
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [birdY, setBirdY] = useState(FLUTTER_FLIGHT_START_Y)
  const [birdVy, setBirdVy] = useState(0)
  const [gateX, setGateX] = useState(flutterFlightGateStartX())
  const [gateIndex, setGateIndex] = useState(0)
  const [lives, setLives] = useState(FLUTTER_FLIGHT_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(FLUTTER_FLIGHT_ROUND_SECONDS)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  const [respawning, setRespawning] = useState(false)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()

  useEffect(() => {
    if (feedback) playEduSound(feedback.type, readInteractiveSoundOn())
  }, [feedback])

  // Build rounds once per content fingerprint.
  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}\u0000${i.imageUrl ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    const usable = items.filter((i) => i.prompt && i.answer)
    const shuffled = shuffleArray(usable).slice(0, FLUTTER_FLIGHT_MAX_ROUNDS)
    const built: FlutterFlightRound[] = []
    for (const item of shuffled) {
      const others = shuffleArray(usable.filter((o) => o !== item).map((o) => o.answer)).slice(0, 3)
      const answers = shuffleArray([
        { answer: item.answer, isCorrect: true },
        ...others.map((a) => ({ answer: a, isCorrect: false })),
      ])
      const round = buildFlutterFlightRound(item.prompt, answers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setBirdY(FLUTTER_FLIGHT_START_Y)
    setBirdVy(0)
    setGateX(flutterFlightGateStartX())
    setGateIndex(0)
    setLives(FLUTTER_FLIGHT_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(FLUTTER_FLIGHT_ROUND_SECONDS)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setRespawning(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(FLUTTER_FLIGHT_LIVES)
  const correctRef = useRef(0)
  const birdYRef = useRef(FLUTTER_FLIGHT_START_Y)
  const birdVyRef = useRef(0)
  const gateXRef = useRef(flutterFlightGateStartX())
  const gateIndexRef = useRef(0)
  const flapRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  const respawningRef = useRef(false)
  const warnedRoundRef = useRef(-1)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { correctRef.current = correctCount })
  useEffect(() => { birdYRef.current = birdY })
  useEffect(() => { birdVyRef.current = birdVy })
  useEffect(() => { gateXRef.current = gateX })
  useEffect(() => { gateIndexRef.current = gateIndex })
  useEffect(() => { onProgress(score, finished) }, [score, finished, onProgress])

  const finishGame = useCallback((didWin: boolean) => {
    setWon(didWin)
    setFinished(true)
    if (!completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(scoreRef.current, {
        correctCount: correctRef.current,
        totalCount: rounds.length,
        livesLeft: livesRef.current,
      })
    }
  }, [rounds.length])

  // Finish sound once: win on Flutter Flight Complete, lose on game over.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

  /** Reset the bird and the current gate after a crash, so the kid retries the same gate. */
  const resetBirdAndGate = useCallback(() => {
    setBirdY(FLUTTER_FLIGHT_START_Y)
    birdYRef.current = FLUTTER_FLIGHT_START_Y
    setBirdVy(0)
    birdVyRef.current = 0
    setGateX(flutterFlightGateStartX())
    gateXRef.current = flutterFlightGateStartX()
    setFeedback(null)
    setRespawning(false)
    respawningRef.current = false
  }, [])

  /** Advance after the current round ends. `lostLife` already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setFeedback(null)
    if (livesRef.current <= 0) {
      finishGame(false)
      return
    }
    if (from + 1 >= rounds.length) {
      finishGame(true)
      return
    }
    setCurrent(from + 1)
    setBirdY(FLUTTER_FLIGHT_START_Y)
    birdYRef.current = FLUTTER_FLIGHT_START_Y
    setBirdVy(0)
    birdVyRef.current = 0
    setGateX(flutterFlightGateStartX())
    gateXRef.current = flutterFlightGateStartX()
    setGateIndex(0)
    gateIndexRef.current = 0
    setTimeLeft(FLUTTER_FLIGHT_ROUND_SECONDS)
    setRespawning(false)
    respawningRef.current = false
    warnedRoundRef.current = -1
  }, [rounds, finishGame])

  /** Time up on a round: -1 life, round skipped. */
  const handleTimeUp = useCallback(() => {
    if (advancingRef.current) return
    advancingRef.current = true
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setFeedback({ type: 'wrong', msg: "Time's up! You lost a life." })
    const from = current
    setTimeout(() => advanceFrom(from), 1400)
  }, [current, advanceFrom])

  /** Hit a gate or the ground: -1 life, bird resets, same gate retries. */
  const handleCrash = useCallback((kind: 'pipe' | 'ground') => {
    if (advancingRef.current || respawningRef.current) return
    respawningRef.current = true
    setRespawning(true)
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setFeedback({
      type: 'wrong',
      msg: kind === 'pipe'
        ? 'You hit the gate! You lost a life — flap through the gap next time.'
        : 'You touched the ground! You lost a life — keep flapping to stay up.',
    })
    if (livesRef.current <= 0) {
      advancingRef.current = true
      const from = current
      setTimeout(() => advanceFrom(from), 1400)
      return
    }
    setTimeout(() => resetBirdAndGate(), 1000)
  }, [current, advanceFrom, resetBirdAndGate])

  // Round timer: ticks only while the shell is playing, the
  // How-to-Play page is closed, and the game is not finished.
  // Pause and How-to-Play both freeze it; it never drains away
  // while the player cannot flap.
  const currentRef = useRef(current)
  useEffect(() => { currentRef.current = current }, [current])
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => setTimeLeft((t) => (t > 1 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current])

  useEffect(() => {
    if (timeLeft !== 0 || shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    handleTimeUp()
  }, [timeLeft, shellStatus, showHowto, finished, rounds.length, handleTimeUp])

  // Timer warning: one short warning when 5 seconds remain.
  useEffect(() => {
    if (timeLeft !== FLUTTER_FLIGHT_WARNING_SECONDS || shellStatus !== 'playing' || showHowto || finished) return
    if (warnedRoundRef.current === current) return
    warnedRoundRef.current = current
    playEduSound('timerWarning', readInteractiveSoundOn())
  }, [timeLeft, shellStatus, showHowto, finished, current])

  // The flight loop: gravity, flaps, and the gate, every 50 ms,
  // only while the shell is playing, How-to-Play is closed, the
  // game is not finished, and nobody is respawning or advancing.
  const roundsRef = useRef(rounds)
  useEffect(() => { roundsRef.current = rounds }, [rounds])
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => {
      if (advancingRef.current || respawningRef.current) return
      const round = roundsRef.current[currentRef.current]
      if (!round) return
      const dt = FLUTTER_FLIGHT_TICK_MS / 1000
      const flapped = flapRef.current
      flapRef.current = false
      const step = stepBird(birdYRef.current, birdVyRef.current, dt, flapped)
      if (step.hitGround) {
        setBirdY(step.y)
        birdYRef.current = step.y
        setBirdVy(0)
        birdVyRef.current = 0
        handleCrash('ground')
        return
      }
      setBirdY(step.y)
      birdYRef.current = step.y
      setBirdVy(step.vy)
      birdVyRef.current = step.vy
      const prevX = gateXRef.current
      const nextX = moveGate(prevX, dt)
      setGateX(nextX)
      gateXRef.current = nextX
      if (!gateCrossedBird(prevX, nextX)) return
      const gate = round.gates[gateIndexRef.current]
      if (!gate) return
      if (!birdInGap(step.y, gate.gapCenter)) {
        handleCrash('pipe')
        return
      }
      if (gate.isCorrect) {
        advancingRef.current = true
        setScore((s) => s + SCORE_PER_CORRECT)
        scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
        setCorrectCount((c) => c + 1)
        correctRef.current = correctRef.current + 1
        setFeedback({ type: 'correct', msg: `Correct! +${SCORE_PER_CORRECT} points — you flew through the ${gate.answer} gate!` })
        const from = currentRef.current
        setTimeout(() => advanceFrom(from), 1200)
        return
      }
      // Wrong gate: -1 life, the gate is used up, the next gate
      // flies in. The correct gate is always still in the queue,
      // so the round can never run out of gates.
      setLives((l) => Math.max(0, l - 1))
      livesRef.current = Math.max(0, livesRef.current - 1)
      setFeedback({ type: 'wrong', msg: `Wrong gate! That was ${gate.answer} — you lost a life. Fly through the right answer next.` })
      if (livesRef.current <= 0) {
        advancingRef.current = true
        const from = currentRef.current
        setTimeout(() => advanceFrom(from), 1400)
        return
      }
      const nextIndex = gateIndexRef.current + 1
      setGateIndex(nextIndex)
      gateIndexRef.current = nextIndex
      setGateX(flutterFlightGateStartX())
      gateXRef.current = flutterFlightGateStartX()
    }, FLUTTER_FLIGHT_TICK_MS)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, handleCrash, advanceFrom])

  function flap() {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || respawningRef.current) return
    flapRef.current = true
    playEduSound('jump', readInteractiveSoundOn())
  }

  function startPlaying() {
    playEduSound('click', readInteractiveSoundOn())
    completedRef.current = false
    setShowHowto(false)
    setStarted(true)
  }

  // Keyboard: Space flaps. Guarded by the same rules as tapping.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'Space' && e.key !== ' ') return
      if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || respawningRef.current) return
      e.preventDefault()
      flap()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // flap reads refs; re-subscribe on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellStatus, showHowto, finished, current, rounds, respawning])

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setBirdY(FLUTTER_FLIGHT_START_Y)
    birdYRef.current = FLUTTER_FLIGHT_START_Y
    setBirdVy(0)
    birdVyRef.current = 0
    setGateX(flutterFlightGateStartX())
    gateXRef.current = flutterFlightGateStartX()
    setGateIndex(0)
    gateIndexRef.current = 0
    setLives(FLUTTER_FLIGHT_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(FLUTTER_FLIGHT_ROUND_SECONDS)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setRespawning(false)
    completedRef.current = false
    advancingRef.current = false
    respawningRef.current = false
    warnedRoundRef.current = -1
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no questions to fly through yet.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🐦</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Flutter Flight</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Flap your bird through the gate with the right answer.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each sky asks one question. Green gates fly in from the right, each with an answer on a badge in its gap. Your bird stays on the left — flap to keep it in the air and steer it through the gap of the gate with the correct answer. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> each sky you finish by flying through the right gate earns {SCORE_PER_CORRECT} points. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'sky' : 'skies'}). Wrong gates, gate hits, ground touches, and time-ups earn no points.</p>
          <p><strong>Objective:</strong> fly through the correct gate in every sky without running out of lives.</p>
          <p><strong>Controls:</strong> tap the sky, click it, or press Space — one tap is one flap, and one flap is one push up. Gravity pulls your bird down between flaps, so keep tapping gently to stay level. The top of the sky is safe, but the ground at the bottom is not, and the green gates are solid except for their gaps.</p>
          <p><strong>Lives:</strong> you start with {FLUTTER_FLIGHT_LIVES} lives. Flying through a wrong gate costs 1 life, and that gate is used up so it can never cost a second life — the next gate flies in. Hitting a gate or touching the ground costs 1 life, and your bird starts again in the middle of the sky to retry the same gate. A sky you run out of time on also costs 1 life.</p>
          <p><strong>Timer:</strong> {FLUTTER_FLIGHT_ROUND_SECONDS} seconds per sky. You hear one warning when 5 seconds are left. The timer pauses when you pause the game or re-read this page — and your bird waits too.</p>
          <p><strong>Rounds:</strong> one sky per question, in shuffled order.</p>
          <p><strong>How you win and finish:</strong> finish every sky with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many skies you got right, and how many lives are left.</p>
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
          {won ? 'Flutter Flight Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} skies correct
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

  const round = rounds[current]
  if (!round) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  const gate = round.gates[gateIndex] ?? round.gates[0]
  const gapTop = gate ? gate.gapCenter - FLUTTER_FLIGHT_GAP_HALF : 0.33
  const gapBottom = gate ? gate.gapCenter + FLUTTER_FLIGHT_GAP_HALF : 0.67
  const tiltDeg = Math.max(-25, Math.min(35, birdVy * 22))
  const flapBtn: CSSProperties = {
    width: '100%', padding: '0.9rem', borderRadius: 'var(--radius-lg)', border: 'none',
    background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)',
    fontSize: '1.1rem', cursor: 'pointer', marginTop: '0.75rem',
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, FLUTTER_FLIGHT_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite" style={{ color: timeLeft <= FLUTTER_FLIGHT_WARNING_SECONDS ? 'var(--color-danger)' : undefined }}>⏱ {timeLeft}s</span>
        <span aria-live="polite">Sky {current + 1} of {rounds.length}</span>
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
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
          Flap to stay up — fly through the gate with the right answer.
        </p>
      </div>

      {/* The sky: tap it to flap. Gates fly in from the right. */}
      <motion.div animate={{ x: feedback?.type === 'wrong' ? [0, -10, 10, -6, 6, 0] : 0 }} transition={{ duration: 0.4 }}>
        <div
          role="application"
          aria-label={`Sky ${current + 1} of ${rounds.length} for question: ${round.prompt}. Tap the sky or press Space to flap.`}
          onPointerDown={flap}
          style={{
            position: 'relative', height: '340px', borderRadius: 'var(--radius-lg)',
            overflow: 'hidden', maxWidth: '480px', margin: '0 auto', touchAction: 'none',
            userSelect: 'none', cursor: 'pointer',
            background: 'linear-gradient(180deg, #7dd3fc 0%, #bae6fd 62%, #e0f2fe 100%)',
            border: '2px solid var(--color-border)',
          }}
        >
          {/* Decorative clouds — scenery only, never part of the question. */}
          <div aria-hidden="true" style={{ position: 'absolute', top: '12%', left: '8%', width: '70px', height: '22px', borderRadius: '999px', background: 'rgba(255,255,255,0.85)' }} />
          <div aria-hidden="true" style={{ position: 'absolute', top: '28%', left: '58%', width: '54px', height: '18px', borderRadius: '999px', background: 'rgba(255,255,255,0.7)' }} />
          <div aria-hidden="true" style={{ position: 'absolute', top: '6%', left: '72%', width: '44px', height: '15px', borderRadius: '999px', background: 'rgba(255,255,255,0.6)' }} />

          {/* The gate: two green columns with a gap, answer badge in the gap. */}
          {gate && gateX > -0.2 && gateX < 1.2 && (
            <>
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', top: 0, height: `${gapTop * 100}%`,
                  left: `${(gateX - FLUTTER_FLIGHT_GATE_WIDTH / 2) * 100}%`,
                  width: `${FLUTTER_FLIGHT_GATE_WIDTH * 100}%`,
                  background: '#22c55e', border: '2px solid #15803d', borderTop: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', top: `${gapBottom * 100}%`, bottom: `${(1 - FLUTTER_FLIGHT_GROUND_Y) * 100}%`,
                  left: `${(gateX - FLUTTER_FLIGHT_GATE_WIDTH / 2) * 100}%`,
                  width: `${FLUTTER_FLIGHT_GATE_WIDTH * 100}%`,
                  background: '#22c55e', border: '2px solid #15803d', borderBottom: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div
                aria-label={`Gate: ${gate.answer}`}
                style={{
                  position: 'absolute', top: `${gate.gapCenter * 100}%`, left: `${gateX * 100}%`,
                  transform: 'translate(-50%, -50%)', zIndex: 2,
                  background: '#fff', color: '#0f172a', fontWeight: 800, fontSize: '1rem',
                  padding: '0.3rem 0.7rem', borderRadius: '999px', border: '2px solid #15803d',
                  whiteSpace: 'nowrap', maxWidth: '30%', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {gate.answer}
              </div>
            </>
          )}

          {/* The bird. */}
          <div
            role="img"
            aria-label="Your bird"
            style={{
              position: 'absolute', zIndex: 3,
              left: `calc(${FLUTTER_FLIGHT_BIRD_X * 100}% - 24px)`,
              top: `calc(${birdY * 100}% - 24px)`,
              width: '48px', height: '48px', pointerEvents: 'none',
            }}
          >
            <BirdArt tiltDeg={tiltDeg} />
          </div>

          {/* The ground. */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              height: `${(1 - FLUTTER_FLIGHT_GROUND_Y) * 100}%`,
              background: '#65a30d', borderTop: '2px solid #3f6212',
            }}
          />
        </div>
      </motion.div>

      <button type="button" onClick={flap} style={flapBtn} aria-label="Flap your wings">
        🪽 FLAP!
      </button>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Tap the sky or press Space to flap. One tap, one flap!
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

export default function FlutterFlightActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Flutter Flight" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <FlutterFlightGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
