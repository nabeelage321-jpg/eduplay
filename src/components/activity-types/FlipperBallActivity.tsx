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
  FLIPPER_BALL_LIVES,
  FLIPPER_BALL_MAX_ROUNDS,
  FLIPPER_BALL_POINTS_PER_HIT,
  FLIPPER_BALL_MAX_PER_ROUND,
  FLIPPER_BALL_BALLS_PER_ROUND,
  FLIPPER_BALL_FIELD_WIDTH,
  FLIPPER_BALL_FIELD_HEIGHT,
  FLIPPER_BALL_RADIUS,
  FLIPPER_BALL_BUMPERS,
  FLIPPER_BALL_TARGET_RADIUS,
  FLIPPER_BALL_LEFT_PIVOT,
  FLIPPER_BALL_RIGHT_PIVOT,
  FLIPPER_BALL_FLIPPER_LENGTH,
  newFlipperBallGame,
  launchBall,
  flip,
  stepBall,
  flipperAngle,
  buildFlipperBallRound,
  type FlipperBallState,
  type FlipperBallRound,
  type FlipperBallSide,
} from '@/lib/flipper-ball'

/**
 * Flipper Ball — EduPlay's own pinball-STYLE game (type 63).
 *
 * Pinball-STYLE mechanic only: two flippers at the bottom keep
 * a ball bouncing among bumpers and answer targets. No pinball
 * machine name, no trademarked game name, no copied art: the
 * table, flippers, ball, bumpers, and targets are plain shapes
 * drawn here. Sounds are the shared interactive Web Audio
 * system (synthesized, no assets) for correct / wrong / win /
 * lose, plus a small flip thwip, bumper boing, target ding, and
 * ball-save chime of our own below. Sound is ON by default for
 * this game; the in-player toggle mutes it in one tap.
 * Background music is the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct target's answer. Each round's table
 * holds 3 answer targets: the round's own answer on one,
 * wrong answers borrowed from the game's other items on the
 * other two. No new save path was needed: the save route
 * already stores prompt/answer for every type, and the
 * adapter passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per CORRECT target hit. One correct
 *   target per round, 10 rounds — score out of 10 x rounds.
 * - 3 balls per round. Space, a tap, or the DROP THE BALL
 *   button drops a ball in from the top; the flippers bat it
 *   while it is in play. Left flipper: ArrowLeft or A, or tap
 *   the left half of the table. Right flipper: ArrowRight or
 *   D, or tap the right half. Space flips both.
 * - Hit the CORRECT target and it lights up: +10 points, the
 *   round is won at once.
 * - Hit a WRONG target and it flashes red — the ball is lost
 *   at once, no points. A fresh ball drops in if any are left;
 *   if not, the round ends and costs 1 life.
 * - A ball that drains past the flippers is lost the same way
 *   — EXCEPT the first drain in every round is saved for free
 *   ("Ball saved!"), a fresh ball drops in and no ball is lost.
 * - Spending all 3 balls without hitting the correct target
 *   ends the round with no more points and costs 1 life.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Flipper Ball Complete!"). onComplete fires exactly
 *   once with the real score plus rounds won / total rounds
 *   and lives left.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - Pause via the shared PlayShell freezes the ball (the tick
 *   loop only runs while the shell status is 'playing').
 *   Reading How to Play mid-game also freezes the ball.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the ball save, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, so any question list where
 *   every item has at least two different answers to borrow as
 *   wrong targets plays. A question with fewer keeps the plain
 *   message — see convert.ts.
 *   Print: NOT printable (needs its flippers, bouncing ball,
 *   and targets) — see print-worksheet.ts. Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface FlipperBallGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Our own flip thwip + bumper boing + target ding + ball-save
 *  chime: synthesized Web Audio, no recording, no asset. */
let flipCtx: AudioContext | null = null
function flipAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!flipCtx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      flipCtx = new AC()
    }
    if (flipCtx.state === 'suspended') void flipCtx.resume()
    return flipCtx
  } catch {
    return null
  }
}
function playTone(soundOn: boolean, notes: { freq: number; at: number; dur: number; type: OscillatorType; vol: number }[]) {
  if (!soundOn) return
  const ctx = flipAudioCtx()
  if (!ctx) return
  try {
    const t0 = ctx.currentTime
    for (const n of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = n.type
      osc.frequency.setValueAtTime(n.freq, t0 + n.at)
      gain.gain.setValueAtTime(0.0001, t0 + n.at)
      gain.gain.exponentialRampToValueAtTime(n.vol, t0 + n.at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + n.at + n.dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t0 + n.at)
      osc.stop(t0 + n.at + n.dur + 0.05)
    }
  } catch {
    /* sound is best-effort — a flip still counts without it */
  }
}
/** A quick rising thwip as a flipper bats. */
function playFlipThwip(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 320, at: 0, dur: 0.1, type: 'sine', vol: 0.14 },
    { freq: 640, at: 0.05, dur: 0.12, type: 'sine', vol: 0.12 },
  ])
}
/** A springy two-note boing off a star bumper. */
function playBumperBoing(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 220, at: 0, dur: 0.12, type: 'triangle', vol: 0.16 },
    { freq: 440, at: 0.07, dur: 0.14, type: 'triangle', vol: 0.14 },
  ])
}
/** A bright ding when the right target lights up. */
function playTargetDing(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 880, at: 0, dur: 0.16, type: 'sine', vol: 0.18 },
    { freq: 1318, at: 0.1, dur: 0.28, type: 'sine', vol: 0.16 },
  ])
}
/** A warm rising chime when the ball save catches a drain. */
function playBallSaveChime(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 523, at: 0, dur: 0.16, type: 'sine', vol: 0.16 },
    { freq: 784, at: 0.12, dur: 0.26, type: 'sine', vol: 0.16 },
  ])
}

function FlipperBallGame({ items, locale, onComplete, onProgress }: FlipperBallGameProps) {
  const [rounds, setRounds] = useState<FlipperBallRound[]>([])
  const [game, setGame] = useState<FlipperBallState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(FLIPPER_BALL_LIVES)
  const [score, setScore] = useState(0)
  const [roundsWon, setRoundsWon] = useState(0)
  const [targetsHit, setTargetsHit] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()
  const shellStatusRef = useRef(shellStatus)
  useEffect(() => { shellStatusRef.current = shellStatus }, [shellStatus])

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
    const shuffled = shuffleArray(usable).slice(0, FLIPPER_BALL_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: FlipperBallRound[] = []
    for (const item of shuffled) {
      const round = buildFlipperBallRound(item.prompt, item.answer, allAnswers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newFlipperBallGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(FLIPPER_BALL_LIVES)
    setScore(0)
    setRoundsWon(0)
    setTargetsHit(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(FLIPPER_BALL_LIVES)
  const roundsWonRef = useRef(0)
  const streakRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
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
        livesLeft: livesRef.current,
      })
    }
  }, [rounds.length])

  // Finish sound once: win on Flipper Ball Complete, lose on game over.
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
  useEffect(() => {
    const round = rounds[current]
    if (!round) return
    const fresh = newFlipperBallGame(round)
    gameRef.current = fresh
    setGame(fresh)
  }, [current, rounds])

  /** Advance after the current round ends. Lives already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setFeedback(null)
    if (livesRef.current <= 0) {
      finishGame(false)
      return
    }
    if (from + 1 >= roundsRef.current.length) {
      finishGame(true)
      return
    }
    setCurrent(from + 1)
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
    setTimeout(() => advanceFrom(from), 1600)
  }, [advanceFrom])

  /** Resolve a ball event from the physics step. */
  const resolveEvent = useCallback((next: FlipperBallState) => {
    const event = next.lastEvent
    if (!event) return
    if (event.kind === 'hit-correct') {
      playTargetDing(readInteractiveSoundOn())
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setTargetsHit((c) => c + 1)
      setRoundsWon((r) => r + 1)
      roundsWonRef.current = roundsWonRef.current + 1
      setStreak((s) => s + 1)
      streakRef.current = streakRef.current + 1
      advancingRef.current = true
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `Bullseye! The ${event.answer} target lit up! +${SCORE_PER_CORRECT} points — round won!`,
      })
      setTimeout(() => advanceFrom(from), 1600)
      return
    }
    if (event.kind === 'hit-wrong') {
      playEduSound('wrong', readInteractiveSoundOn())
      if (next.status === 'out') {
        loseRound(`That target had ${event.answer} — the wrong one, and that was your last ball.`)
      } else {
        setFeedback({
          type: 'wrong',
          msg: `That target had ${event.answer} — wrong target! It cost you the ball. ${event.ballsLeft} ${event.ballsLeft === 1 ? 'ball' : 'balls'} left — read the targets before you flip.`,
        })
      }
      return
    }
    if (event.kind === 'ball-saved') {
      playBallSaveChime(readInteractiveSoundOn())
      setFeedback({
        type: 'correct',
        msg: 'Ball saved! The save caught your ball — a fresh ball drops in, no ball lost.',
      })
      return
    }
    if (event.kind === 'ball-lost') {
      playEduSound('wrong', readInteractiveSoundOn())
      if (next.status === 'out') {
        loseRound('The ball drained past the flippers — and that was your last ball.')
      } else {
        setFeedback({
          type: 'wrong',
          msg: `The ball drained past the flippers! ${event.ballsLeft} ${event.ballsLeft === 1 ? 'ball' : 'balls'} left — flip a little earlier next time.`,
        })
      }
      return
    }
    if (event.kind === 'bump') {
      playBumperBoing(readInteractiveSoundOn())
    }
  }, [advanceFrom, loseRound])

  /** One ball tick: the ball moves one step. */
  const doTick = useCallback(() => {
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    const next = stepBall(g, 0.03)
    gameRef.current = next
    setGame(next)
    if (next.lastEvent) resolveEvent(next)
  }, [resolveEvent])

  // Ball loop: the ball moves while the shell is playing,
  // How-to-Play is closed, and the game is not finished — pause
  // and How-to-Play both freeze the ball.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    if (!game || game.status !== 'playing') return
    const id = setInterval(() => { doTick() }, 30)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current, game?.status, doTick])

  /** Drop a fresh ball in from the top. */
  const doLaunch = useCallback(() => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'serving') return
    setFeedback(null)
    playEduSound('jump', readInteractiveSoundOn())
    const next = launchBall(g)
    gameRef.current = next
    setGame(next)
  }, [finished, shellStatus, showHowto])

  const doLaunchRef = useRef(doLaunch)
  useEffect(() => { doLaunchRef.current = doLaunch }, [doLaunch])

  /** Bat one flipper. */
  const doFlip = useCallback((side: FlipperBallSide) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g) return
    playFlipThwip(readInteractiveSoundOn())
    const next = flip(g, side)
    gameRef.current = next
    setGame(next)
  }, [finished, shellStatus, showHowto])

  const doFlipRef = useRef(doFlip)
  useEffect(() => { doFlipRef.current = doFlip }, [doFlip])

  // Keyboard: left / A bats the left flipper, right / D bats the
  // right flipper, Space drops the ball in (or flips both).
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      if (key === 'arrowleft' || key === 'a') { e.preventDefault(); doFlipRef.current('left') }
      else if (key === 'arrowright' || key === 'd') { e.preventDefault(); doFlipRef.current('right') }
      else if (key === ' ') {
        e.preventDefault()
        if (!e.repeat) {
          const g = gameRef.current
          if (g && g.status === 'serving') doLaunchRef.current()
          else { doFlipRef.current('left'); doFlipRef.current('right') }
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shellStatus, showHowto, finished])

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
      const fresh = newFlipperBallGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setLives(FLIPPER_BALL_LIVES)
    setScore(0)
    setRoundsWon(0)
    setTargetsHit(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    completedRef.current = false
    advancingRef.current = false
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no table yet — it needs questions with at least two other different answers to flip at.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🎱</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Flipper Ball</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Work the flippers, keep the ball bouncing, and light up the target with the right answer!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> a ball drops in from the top of the table. Work the two flippers at the bottom to keep it bouncing among the bumpers and the three answer targets. Read the question at the top — for example, &ldquo;2+6 = ?&rdquo; — and bat the ball into the target that says 8. The star bumpers in the middle just bounce the ball around for fun — they never score. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> hitting the target with the right answer earns {FLIPPER_BALL_POINTS_PER_HIT} points and wins the round — one correct target per round, so {FLIPPER_BALL_MAX_PER_ROUND} points a round at most and the game is scored out of {rounds.length * FLIPPER_BALL_MAX_PER_ROUND} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}).</p>
          <p><strong>Objective:</strong> light up the right target in every round without running out of balls or lives.</p>
          <p><strong>Controls:</strong> Left arrow or A bats the left flipper, Right arrow or D bats the right flipper, or tap the left or right half of the table — the ◀ ▶ buttons under the table work too. Space drops the ball in, and flips both flippers while a ball is in play.</p>
          <p><strong>Lives:</strong> you start with {FLIPPER_BALL_LIVES} lives. Spending all {FLIPPER_BALL_BALLS_PER_ROUND} balls in a round without hitting the right target costs 1 life and ends the round.</p>
          <p><strong>Ball save:</strong> the first time a ball drains past the flippers in a round, the save catches it for free — a fresh ball drops in and no ball is lost. After the save is used, a drain costs a ball.</p>
          <p><strong>Wrong target:</strong> hitting a target with the wrong answer flashes it red and costs you the ball at once — no points. Read the targets before you flip!</p>
          <p><strong>Rounds:</strong> one table per question, in shuffled order. A fresh set of targets waits in every round, and the right answer sits on a different target each time.</p>
          <p><strong>How you win and finish:</strong> light up the right target in every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many targets you lit up, and how many lives are left.</p>
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
          {won ? 'Flipper Ball Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * FLIPPER_BALL_MAX_PER_ROUND} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {targetsHit} of {rounds.length} targets lit up
          {` · ${roundsWon} of ${rounds.length} rounds won`}
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
  if (!round || !game) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  const canPlay = shellStatus === 'playing' && !showHowto && !finished
  const leftAngleDeg = (flipperAngle('left', game.leftFlip) * 180) / Math.PI
  const rightAngleDeg = (flipperAngle('right', game.rightFlip) * 180) / Math.PI
  const flipperLenPct = (FLIPPER_BALL_FLIPPER_LENGTH / FLIPPER_BALL_FIELD_WIDTH) * 100
  const ballXPct = game.ball ? (game.ball.x / FLIPPER_BALL_FIELD_WIDTH) * 100 : 50
  const ballYPct = game.ball ? (game.ball.y / FLIPPER_BALL_FIELD_HEIGHT) * 100 : 0

  /** Tap the table: serving drops the ball in, playing bats the
   *  flipper on the half that was tapped. */
  function onTablePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!canPlay || advancingRef.current) return
    if (game?.status === 'serving') {
      doLaunch()
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    doFlip(x < 0.5 ? 'left' : 'right')
  }

  // NOTE: `game` is narrowed non-null in the render body below by the
  // Loading guard, but not inside this handler closure (TS18047), so
  // the serving check guards null here.

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * FLIPPER_BALL_MAX_PER_ROUND} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, FLIPPER_BALL_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        {streak >= 2 && (
          <span aria-live="polite" style={{ color: '#ea580c', fontWeight: 700 }}>🔥 streak x{streak}</span>
        )}
        <span aria-live="polite">Round {current + 1} of {rounds.length}</span>
        <span aria-live="polite">🎱 {game.ballsLeft} {game.ballsLeft === 1 ? 'ball' : 'balls'} left</span>
        <span aria-live="polite">{game.saveUsed ? '🛟 save used' : '🛟 ball save ready'}</span>
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
          Bat the ball into the target with the right answer — the star bumpers just bounce it around for fun!
        </p>
      </div>

      {/* The pinball table. */}
      <div
        role="application"
        aria-label={`Flipper Ball round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. ${lives} lives left, ${game.ballsLeft} balls left${game.saveUsed ? ', ball save used' : ', ball save ready'}. Tap the left or right half of the table to bat that flipper, or use the arrow keys. Bat the ball into the target with the right answer.`}
        onPointerDown={onTablePointerDown}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '100 / 62',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none',
          background: 'linear-gradient(to bottom, #1e1b4b 0%, #312e81 45%, #7c3aed 100%)',
        }}
      >
        {/* Answer targets. */}
        {round.targets.map((t) => {
          const hitCorrect = t.hit && t.correct
          const hitWrong = t.hit && !t.correct
          const sizePct = ((FLIPPER_BALL_TARGET_RADIUS * 2) / FLIPPER_BALL_FIELD_WIDTH) * 100
          return (
            <div
              key={t.id}
              style={{
                position: 'absolute',
                left: `${(t.x / FLIPPER_BALL_FIELD_WIDTH) * 100}%`,
                top: `${(t.y / FLIPPER_BALL_FIELD_HEIGHT) * 100}%`,
                width: `${sizePct}%`,
                aspectRatio: '1 / 1',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                border: `3px solid ${hitWrong ? '#ef4444' : hitCorrect ? '#22c55e' : '#fbbf24'}`,
                background: hitWrong ? '#fca5a5' : hitCorrect ? '#86efac' : '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(251,191,36,0.6)',
                zIndex: 1,
              }}
            >
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 'clamp(0.8rem, 3.2vw, 1.15rem)', color: '#1e1b4b',
                lineHeight: 1, textAlign: 'center', padding: '0.1rem',
                overflow: 'hidden',
              }}>
                {hitCorrect ? '⭐' : hitWrong ? '✖' : t.answer}
              </span>
            </div>
          )
        })}

        {/* Plain star bumpers: bounce only, never score. */}
        {FLIPPER_BALL_BUMPERS.map((b, i) => (
          <div
            key={`bumper-${i}`}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${(b.x / FLIPPER_BALL_FIELD_WIDTH) * 100}%`,
              top: `${(b.y / FLIPPER_BALL_FIELD_HEIGHT) * 100}%`,
              width: `${((b.r * 2) / FLIPPER_BALL_FIELD_WIDTH) * 100}%`,
              aspectRatio: '1 / 1',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #fde68a, #f59e0b)',
              border: '2px solid #b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(0.7rem, 2.4vw, 1rem)',
              boxShadow: '0 0 10px rgba(245,158,11,0.7)',
              zIndex: 1,
            }}
          >
            ⭐
          </div>
        ))}

        {/* The ball. */}
        {game.ball && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${ballXPct}%`,
              top: `${ballYPct}%`,
              width: `${((FLIPPER_BALL_RADIUS * 2) / FLIPPER_BALL_FIELD_WIDTH) * 100}%`,
              aspectRatio: '1 / 1',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #fff, #cbd5e1 60%, #94a3b8)',
              border: '2px solid #475569',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
              zIndex: 3,
            }}
          />
        )}

        {/* The flippers. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${(FLIPPER_BALL_LEFT_PIVOT.x / FLIPPER_BALL_FIELD_WIDTH) * 100}%`,
            top: `${(FLIPPER_BALL_LEFT_PIVOT.y / FLIPPER_BALL_FIELD_HEIGHT) * 100}%`,
            width: `${flipperLenPct}%`,
            height: '10px',
            marginTop: '-5px',
            borderRadius: '999px',
            background: 'linear-gradient(to bottom, #fca5a5, #ef4444)',
            border: '2px solid #991b1b',
            transformOrigin: 'left center',
            transform: `rotate(${leftAngleDeg}deg)`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            zIndex: 2,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${(FLIPPER_BALL_RIGHT_PIVOT.x / FLIPPER_BALL_FIELD_WIDTH) * 100}%`,
            top: `${(FLIPPER_BALL_RIGHT_PIVOT.y / FLIPPER_BALL_FIELD_HEIGHT) * 100}%`,
            width: `${flipperLenPct}%`,
            height: '10px',
            marginTop: '-5px',
            borderRadius: '999px',
            background: 'linear-gradient(to bottom, #93c5fd, #3b82f6)',
            border: '2px solid #1e40af',
            transformOrigin: 'left center',
            transform: `rotate(${rightAngleDeg}deg)`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            zIndex: 2,
          }}
        />
        {/* The drain gap between the flippers. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '42%',
            bottom: 0,
            width: '16%',
            height: '10px',
            background: 'rgba(0,0,0,0.35)',
            borderRadius: '999px 999px 0 0',
            zIndex: 1,
          }}
        />
      </div>

      {/* Flipper + launch controls under the table. */}
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onPointerDown={() => doFlip('left')}
          disabled={!canPlay}
          aria-label="Bat the left flipper"
          style={{
            padding: '0.8rem 1.4rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: '#ef4444', color: '#fff', fontFamily: 'var(--font-display)',
            fontSize: '1.1rem', cursor: canPlay ? 'pointer' : 'default', opacity: canPlay ? 1 : 0.5,
          }}
        >
          ◀ Left flipper
        </button>
        {game.status === 'serving' ? (
          <button
            type="button"
            onClick={doLaunch}
            disabled={!canPlay}
            style={{
              padding: '0.8rem 1.4rem', borderRadius: 'var(--radius-lg)', border: 'none',
              background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)',
              fontSize: '1.1rem', cursor: canPlay ? 'pointer' : 'default', opacity: canPlay ? 1 : 0.5,
            }}
          >
            🎱 Drop the ball
          </button>
        ) : (
          <button
            type="button"
            onPointerDown={() => { doFlip('left'); doFlip('right') }}
            disabled={!canPlay}
            aria-label="Flip both flippers"
            style={{
              padding: '0.8rem 1.4rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
              background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)',
              fontSize: '1.1rem', cursor: canPlay ? 'pointer' : 'default', opacity: canPlay ? 1 : 0.5,
            }}
          >
            Flip both
          </button>
        )}
        <button
          type="button"
          onPointerDown={() => doFlip('right')}
          disabled={!canPlay}
          aria-label="Bat the right flipper"
          style={{
            padding: '0.8rem 1.4rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: '#3b82f6', color: '#fff', fontFamily: 'var(--font-display)',
            fontSize: '1.1rem', cursor: canPlay ? 'pointer' : 'default', opacity: canPlay ? 1 : 0.5,
          }}
        >
          Right flipper ▶
        </button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Tap the left or right half of the table (or ◀ ▶ buttons, or arrow keys) to flip — bat the ball into the target with the right answer for +{FLIPPER_BALL_POINTS_PER_HIT} points! A wrong target costs the ball; the first drain each round is saved for free!
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

export default function FlipperBallActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Flipper Ball" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <FlipperBallGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
