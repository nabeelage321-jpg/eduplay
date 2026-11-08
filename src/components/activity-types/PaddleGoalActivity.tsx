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
  PADDLE_GOAL_LIVES,
  PADDLE_GOAL_MAX_ROUNDS,
  PADDLE_GOAL_BALLS_PER_ROUND,
  PADDLE_GOAL_POINTS_PER_GOAL,
  PADDLE_GOAL_MAX_PER_ROUND,
  PADDLE_GOAL_FIELD_WIDTH,
  PADDLE_GOAL_FIELD_HEIGHT,
  PADDLE_GOAL_PADDLE_Y,
  PADDLE_GOAL_PADDLE_WIDTH,
  PADDLE_GOAL_PADDLE_HEIGHT,
  PADDLE_GOAL_PADDLE_STEP,
  PADDLE_GOAL_GOAL_WIDTH,
  servedBallPosition,
  newPaddleGoalGame,
  launchBall,
  movePaddle,
  stepBall,
  buildPaddleGoalRound,
  type PaddleGoalState,
  type PaddleGoalRound,
  type PaddleGoalPoint,
} from '@/lib/paddle-goal'

/**
 * Paddle Goal — EduPlay's own arcade paddle game (type 60).
 *
 * Paddle-and-ball mechanic only: the kid slides a paddle along
 * the bottom and bounces a ball up into the goal mouth with the
 * right answer. No Breakout, Arkanoid, Pong, or other game's
 * name or art: the paddle is a plain bar, the ball a plain
 * circle, the goals plain open mouths in the top wall with an
 * answer written on each — all drawn here, nothing copied.
 * Sounds are the shared interactive Web Audio system
 * (synthesized, no assets) for correct / wrong / win / lose,
 * plus a small goal cheer, paddle bounce tick, and wrong-goal
 * thud of our own below. Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. Background music is
 * the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct goal. Each round's top wall has 3 goal
 * mouths: the round's own answer on one, wrong answers borrowed
 * from the game's other items on the other two. No new save
 * path was needed: the save route already stores prompt/answer
 * for every type, and the adapter passes creator rows through
 * untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per CORRECT goal scored (one goal per
 *   round, one round per question, up to 10 rounds, shuffled
 *   once per item content). Score out of 10 x rounds.
 * - 3 balls per round. The ball rests on the paddle; Space, a
 *   tap on the field, or the LAUNCH button sends it up.
 * - Scoring in the CORRECT goal earns 10 points and wins the
 *   round at once.
 * - Scoring in a WRONG goal swallows the ball — no points, the
 *   ball is lost at once. If balls are left, a fresh ball rests
 *   on the paddle; if not, the round ends and costs 1 life.
 *   A wrong goal is a trap: read the answers before you aim.
 * - A ball that falls past the paddle is lost the same way:
 *   one ball gone, fresh ball on the paddle if any are left.
 * - Spending all 3 balls without scoring the correct goal ends
 *   the round with no more points and costs 1 life.
 * - The paddle bounce angle follows where the ball struck the
 *   paddle: centre = straight up, edge = a sharp tilt — so
 *   aiming is a skill the kid can learn, not a guess. A ball
 *   that reaches the top between the goals bounces back down
 *   off the wall, so the kid keeps rallying until the ball
 *   finds a mouth.
 * - No timer — take your time to aim the ball at the right goal.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Paddle Goal Complete!"). onComplete fires exactly
 *   once with the real score plus correct/total counts and lives
 *   left.
 * - Pause via the shared PlayShell freezes the ball and the
 *   controls (the shell overlay covers the field, and the ball
 *   loop + control handlers all require status 'playing').
 *   Reading How to Play mid-game also freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the wrong goals, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, so any question list where
 *   every item has at least two different answers to borrow as
 *   wrong goals plays. A question with fewer keeps the plain
 *   message — see convert.ts.
 *   Print: NOT printable (needs its paddle, bouncing ball, and
 *   goal mouths) — see print-worksheet.ts. Sitemap type list
 *   stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface PaddleGoalGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Our own goal cheer + paddle tick + wrong-goal thud:
 *  synthesized Web Audio, no recording, no asset. */
let goalCtx: AudioContext | null = null
function goalAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!goalCtx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      goalCtx = new AC()
    }
    if (goalCtx.state === 'suspended') void goalCtx.resume()
    return goalCtx
  } catch {
    return null
  }
}
function playTone(soundOn: boolean, notes: { freq: number; at: number; dur: number; type: OscillatorType; vol: number }[]) {
  if (!soundOn) return
  const ctx = goalAudioCtx()
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
    /* sound is best-effort — a goal still counts without it */
  }
}
/** Three rising notes when the ball finds the right goal. */
function playGoalCheer(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 523, at: 0, dur: 0.16, type: 'sine', vol: 0.18 },
    { freq: 659, at: 0.1, dur: 0.16, type: 'sine', vol: 0.18 },
    { freq: 784, at: 0.2, dur: 0.3, type: 'sine', vol: 0.2 },
  ])
}
/** A soft tick when the ball bounces off the paddle. */
function playPaddleTick(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 700, at: 0, dur: 0.08, type: 'triangle', vol: 0.08 },
  ])
}
/** A low thud when the ball is swallowed by a wrong goal. */
function playWrongGoalThud(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 220, at: 0, dur: 0.2, type: 'triangle', vol: 0.18 },
    { freq: 140, at: 0.1, dur: 0.25, type: 'triangle', vol: 0.16 },
  ])
}

/** A steady colour per answer, so the same answer always looks the same. */
function goalColour(answer: string): string {
  const palette = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf']
  const code = answer.charCodeAt(0) || 0
  return palette[code % palette.length]!
}

/** Field units -> percent of the scene box (the scene is 100 x 60). */
const px = (v: number) => `${v}%`
const py = (v: number) => `${(v / PADDLE_GOAL_FIELD_HEIGHT) * 100}%`

function PaddleGoalGame({ items, locale, onComplete, onProgress }: PaddleGoalGameProps) {
  const [rounds, setRounds] = useState<PaddleGoalRound[]>([])
  const [game, setGame] = useState<PaddleGoalState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(PADDLE_GOAL_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  const sceneRef = useRef<HTMLDivElement | null>(null)

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
    const shuffled = shuffleArray(usable).slice(0, PADDLE_GOAL_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: PaddleGoalRound[] = []
    for (const item of shuffled) {
      const round = buildPaddleGoalRound(item.prompt, item.answer, allAnswers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newPaddleGoalGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(PADDLE_GOAL_LIVES)
    setScore(0)
    setCorrectCount(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(PADDLE_GOAL_LIVES)
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
        totalCount: rounds.length,
        livesLeft: livesRef.current,
      })
    }
  }, [rounds.length])

  // Finish sound once: win on Paddle Goal Complete, lose on game over.
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
    const fresh = newPaddleGoalGame(round)
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

  /** Lose one life and end the round (out of balls). */
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
    setTimeout(() => advanceFrom(from), 1400)
  }, [advanceFrom])

  /** Resolve a ball event from the physics step. */
  const resolveEvent = useCallback((next: PaddleGoalState) => {
    const event = next.lastEvent
    if (!event) return
    if (event.kind === 'goal') {
      playGoalCheer(readInteractiveSoundOn())
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      setStreak((s) => s + 1)
      streakRef.current = streakRef.current + 1
      advancingRef.current = true
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `GOAL! The ball went into the ${event.answer} goal! +${SCORE_PER_CORRECT} points — round won!`,
      })
      setTimeout(() => advanceFrom(from), 1400)
      return
    }
    // A wrong goal or a fall costs the ball.
    if (event.kind === 'wrong-goal') {
      playWrongGoalThud(readInteractiveSoundOn())
    }
    playEduSound('wrong', readInteractiveSoundOn())
    if (next.status === 'out') {
      if (event.kind === 'wrong-goal') {
        loseRound(`That goal had ${event.answer} — the wrong one, and that was your last ball.`)
      } else {
        loseRound('The ball fell past the paddle — and that was your last ball.')
      }
    } else if (event.kind === 'wrong-goal') {
      setFeedback({
        type: 'wrong',
        msg: `That goal had ${event.answer} — wrong goal! It swallowed the ball. ${event.ballsLeft} ${event.ballsLeft === 1 ? 'ball' : 'balls'} left — read the goals before you aim.`,
      })
    } else {
      setFeedback({
        type: 'wrong',
        msg: `The ball fell past the paddle! ${event.ballsLeft} ${event.ballsLeft === 1 ? 'ball' : 'balls'} left — slide the paddle under it.`,
      })
    }
  }, [advanceFrom, loseRound])

  /** One ball tick: the ball moves one step. */
  const doTick = useCallback(() => {
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    const wasFalling = g.ball ? g.ball.vy > 0 : false
    const wasAbovePaddle = g.ball ? g.ball.y < PADDLE_GOAL_PADDLE_Y - 2 : false
    const next = stepBall(g, 0.03)
    gameRef.current = next
    setGame(next)
    // A paddle bounce is a falling ball that is now rising.
    if (wasFalling && wasAbovePaddle && next.ball && next.ball.vy < 0 && next.status === 'playing') {
      playPaddleTick(readInteractiveSoundOn())
    }
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

  /** Launch the served ball. */
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

  /** Slide the paddle to a pointer x inside the scene, in field units. */
  const slidePaddleTo = useCallback((clientX: number) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const el = sceneRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width === 0) return
    const x = ((clientX - rect.left) / rect.width) * PADDLE_GOAL_FIELD_WIDTH
    const g = gameRef.current
    if (!g) return
    const next = movePaddle(g, x)
    gameRef.current = next
    setGame(next)
  }, [finished, shellStatus, showHowto])

  const slidePaddleToRef = useRef(slidePaddleTo)
  useEffect(() => { slidePaddleToRef.current = slidePaddleTo }, [slidePaddleTo])

  /** Step the paddle left or right with the arrow keys. */
  const stepPaddle = useCallback((dir: -1 | 1) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g) return
    const next = movePaddle(g, g.paddleX + dir * PADDLE_GOAL_PADDLE_STEP)
    gameRef.current = next
    setGame(next)
  }, [finished, shellStatus, showHowto])

  const stepPaddleRef = useRef(stepPaddle)
  useEffect(() => { stepPaddleRef.current = stepPaddle }, [stepPaddle])

  // Keyboard: left/right slide the paddle, Space launches the ball.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      if (key === 'arrowleft' || key === 'a') { e.preventDefault(); stepPaddleRef.current(-1) }
      else if (key === 'arrowright' || key === 'd') { e.preventDefault(); stepPaddleRef.current(1) }
      else if (key === ' ') {
        e.preventDefault()
        if (!e.repeat) doLaunchRef.current()
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
      const fresh = newPaddleGoalGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setLives(PADDLE_GOAL_LIVES)
    setScore(0)
    setCorrectCount(0)
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
        This game has no goals yet — it needs questions with at least two other different answers to aim at.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">⚽</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Paddle Goal</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Slide the paddle, bounce the ball, and score in the goal with the right answer!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> three goal mouths open across the top of the field, and every goal has an answer on it. Read the question at the top — for example, &ldquo;10−3 = ?&rdquo; — then bounce the ball up into the goal that says the right answer, 7. Slide the paddle along the bottom to keep the ball up. Where the ball hits the paddle decides where it goes next: hit it in the middle and it goes straight up, hit it near the edge and it tilts away. A ball that reaches the top between the goals bounces back down off the wall, so you keep rallying until the ball finds a mouth. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> scoring in the goal with the right answer earns {PADDLE_GOAL_POINTS_PER_GOAL} points — one goal per round, so {PADDLE_GOAL_MAX_PER_ROUND} points a round at most and the game is scored out of {rounds.length * PADDLE_GOAL_MAX_PER_ROUND} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}).</p>
          <p><strong>Objective:</strong> score in the right-answer goal in every round without running out of lives.</p>
          <p><strong>Controls:</strong> move your mouse or drag your finger across the field to slide the paddle — or use the left/right arrow keys (A and D work too). Press Space, tap the field, or press the LAUNCH button to send the ball up. The ◀ ▶ buttons slide the paddle too.</p>
          <p><strong>Lives:</strong> you start with {PADDLE_GOAL_LIVES} lives. A ball that falls past the paddle is lost, but costs no life — if you still have balls left, a fresh ball rests on the paddle. If you spend all {PADDLE_GOAL_BALLS_PER_ROUND} balls in a round without scoring the right goal, you lose 1 life and the round ends.</p>
          <p><strong>Wrong goals:</strong> a wrong goal swallows the ball just like a right one — but it costs you the ball at once, and earns no points! A wrong goal is a trap. Read the answers on the goals before you aim the ball at them.</p>
          <p><strong>Rounds:</strong> one round per question, in shuffled order. You get {PADDLE_GOAL_BALLS_PER_ROUND} balls in every round.</p>
          <p><strong>How you win and finish:</strong> score the right-answer goal in every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many right-answer goals you scored, and how many lives are left.</p>
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
          {won ? 'Paddle Goal Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * PADDLE_GOAL_MAX_PER_ROUND} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} right-answer goals scored
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

  // Ball position: resting on the paddle while serving, flying while playing.
  const ballPos: PaddleGoalPoint = game.ball
    ? { x: game.ball.x, y: game.ball.y }
    : servedBallPosition(game.paddleX)
  const scoredGoal = game.status === 'won'
    ? round.goals.find((g) => g.correct) ?? null
    : null

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * PADDLE_GOAL_MAX_PER_ROUND} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, PADDLE_GOAL_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite">⚪ {game.ballsLeft} {game.ballsLeft === 1 ? 'ball' : 'balls'} left</span>
        {streak >= 2 && (
          <span aria-live="polite" style={{ color: '#ea580c', fontWeight: 700 }}>🔥 streak x{streak}</span>
        )}
        <span aria-live="polite">Round {current + 1} of {rounds.length}</span>
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
          Bounce the ball into the goal with the right answer — wrong goals swallow the ball!
        </p>
      </div>

      {/* The field: goal mouths across the top, paddle and ball below. */}
      <div
        ref={sceneRef}
        role="application"
        aria-label={`Paddle Goal round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. ${game.ballsLeft} balls left, ${lives} lives left. Move the mouse or drag to slide the paddle, press Space or tap to launch the ball into the goal with the right answer.`}
        onPointerMove={(e) => slidePaddleToRef.current(e.clientX)}
        onPointerDown={(e) => {
          slidePaddleToRef.current(e.clientX)
          if (gameRef.current?.status === 'serving') doLaunchRef.current()
        }}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '100 / 60',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none',
          background: 'linear-gradient(to bottom, #dcfce7 0%, #bbf7d0 45%, #4ade80 100%)',
        }}
      >
        {/* Goal mouths across the top wall. */}
        {round.goals.map((goal) => {
          const isScored = scoredGoal?.id === goal.id
          return (
            <div
              key={goal.id}
              aria-label={`Goal with ${goal.answer}`}
              style={{
                position: 'absolute', left: px(goal.x), top: 0,
                width: px(PADDLE_GOAL_GOAL_WIDTH), height: py(9),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isScored ? '#facc15' : '#fff',
                border: `3px solid ${isScored ? '#eab308' : goalColour(goal.answer)}`,
                borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                boxSizing: 'border-box',
                color: '#14532d', fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '1.05rem', overflow: 'hidden',
              }}
            >
              {isScored ? '⭐ ' : '🥅 '}{goal.answer}
            </div>
          )
        })}
        {/* Solid wall segments between the goals. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: px(4), height: py(9), background: '#166534' }} />
        <div aria-hidden="true" style={{ position: 'absolute', left: px(24), top: 0, width: px(16), height: py(9), background: '#166534' }} />
        <div aria-hidden="true" style={{ position: 'absolute', left: px(60), top: 0, width: px(16), height: py(9), background: '#166534' }} />
        <div aria-hidden="true" style={{ position: 'absolute', left: px(96), top: 0, width: px(4), height: py(9), background: '#166534' }} />
        {/* Grass decoration — decoration only, never content. */}
        <span aria-hidden="true" style={{ position: 'absolute', left: '8%', top: '62%', fontSize: '1.1rem' }}>🌱</span>
        <span aria-hidden="true" style={{ position: 'absolute', left: '88%', top: '58%', fontSize: '1.1rem' }}>🌼</span>
        <span aria-hidden="true" style={{ position: 'absolute', left: '46%', top: '70%', fontSize: '1rem' }}>☘️</span>
        {/* Paddle */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: px(game.paddleX - PADDLE_GOAL_PADDLE_WIDTH / 2),
            top: py(PADDLE_GOAL_PADDLE_Y),
            width: px(PADDLE_GOAL_PADDLE_WIDTH),
            height: py(PADDLE_GOAL_PADDLE_HEIGHT),
            background: '#f97316', borderRadius: '999px',
            border: '2px solid #fff7ed', boxSizing: 'border-box',
          }}
        />
        {/* Ball */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: px(ballPos.x - 1.2),
            top: py(ballPos.y - 1.2),
            width: px(2.4),
            height: py(2.4),
            background: '#fff', borderRadius: '50%',
            border: '2px solid #14532d', boxSizing: 'border-box',
            boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
          }}
        />
        {/* Goal flash when the round is won. */}
        {scoredGoal && (
          <motion.div
            aria-hidden="true"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              position: 'absolute', left: px(scoredGoal.x + PADDLE_GOAL_GOAL_WIDTH / 2), top: py(14),
              marginLeft: '-18px', marginTop: '-18px', fontSize: '2rem', lineHeight: 1,
            }}
          >
            ⚽
          </motion.div>
        )}
      </div>

      {/* Paddle buttons + launch. */}
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', alignItems: 'center' }}>
        <button
          type="button"
          aria-label="Slide paddle left"
          onClick={() => stepPaddleRef.current(-1)}
          style={{
            flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', cursor: 'pointer',
          }}
        >
          ◀
        </button>
        <button
          type="button"
          onClick={() => doLaunchRef.current()}
          disabled={game.status !== 'serving'}
          style={{
            flex: 2, padding: '0.7rem', borderRadius: 'var(--radius-lg)',
            border: 'none', background: game.status === 'serving' ? 'var(--color-primary)' : 'var(--color-border)',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: game.status === 'serving' ? 'pointer' : 'default',
          }}
        >
          {game.status === 'serving' ? '🚀 LAUNCH' : 'Ball in play…'}
        </button>
        <button
          type="button"
          aria-label="Slide paddle right"
          onClick={() => stepPaddleRef.current(1)}
          style={{
            flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', cursor: 'pointer',
          }}
        >
          ▶
        </button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Slide the paddle under the ball — hit it in the middle to go straight up, near the edge to tilt it toward a goal!
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

export default function PaddleGoalActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Paddle Goal" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <PaddleGoalGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
