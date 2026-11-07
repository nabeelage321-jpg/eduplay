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
  BRICK_BOUNCE_LIVES,
  BRICK_BOUNCE_MAX_ROUNDS,
  BRICK_BOUNCE_BALLS_PER_ROUND,
  BRICK_BOUNCE_CORRECT_BRICKS,
  BRICK_BOUNCE_POINTS_PER_BRICK,
  BRICK_BOUNCE_FIELD_WIDTH,
  BRICK_BOUNCE_FIELD_HEIGHT,
  BRICK_BOUNCE_PADDLE_Y,
  BRICK_BOUNCE_PADDLE_WIDTH,
  BRICK_BOUNCE_PADDLE_HEIGHT,
  BRICK_BOUNCE_PADDLE_STEP,
  BRICK_BOUNCE_BRICK_WIDTH,
  BRICK_BOUNCE_BRICK_HEIGHT,
  servedBallPosition,
  newBrickBounceGame,
  launchBall,
  movePaddle,
  stepBall,
  correctBricksLeft,
  buildBrickBounceRound,
  type BrickBounceState,
  type BrickBounceRound,
  type BrickBouncePoint,
} from '@/lib/brick-bounce'

/**
 * Brick Bounce — EduPlay's own Breakout-STYLE brick-breaker game
 * (type 52).
 *
 * Breakout-STYLE mechanic only: the kid slides a paddle along
 * the bottom and bounces a ball up to smash bricks. No Breakout
 * or Arkanoid name, no Atari or Taito art: the paddle is a plain
 * bar, the ball a plain circle, the bricks plain coloured blocks
 * with an answer written on them — all drawn here, nothing
 * copied. Sounds are the shared interactive Web Audio system
 * (synthesized, no assets). Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. Background music is
 * the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct brick. Each round's wall is 15 bricks
 * (5 x 3): the round's own answer on 3 of them, wrong answers
 * borrowed from the game's other items on the rest. No new save
 * path was needed: the save route already stores prompt/answer
 * for every type, and the adapter passes creator rows through
 * untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per CORRECT brick smashed (3 correct
 *   bricks per round, one round per question, up to 10 rounds,
 *   shuffled once per item content). Score out of 30 x rounds.
 * - 3 balls per round. The ball rests on the paddle; Space, a
 *   tap on the field, or the LAUNCH button sends it up.
 * - Smashing a CORRECT brick earns 10 points and the ball
 *   bounces on. Smashing all 3 correct bricks wins the round.
 * - Smashing a WRONG brick breaks it too — but it costs the
 *   ball at once: no points, the ball is lost. If balls are
 *   left, a fresh ball rests on the paddle; if not, the round
 *   ends and costs 1 life.
 * - A ball that falls past the paddle is lost the same way:
 *   one ball gone, fresh ball on the paddle if any are left.
 * - Spending all 3 balls without smashing every correct brick
 *   ends the round with no more points and costs 1 life.
 * - The paddle bounce angle follows where the ball struck the
 *   paddle: centre = straight up, edge = a sharp tilt — so
 *   aiming is a skill the kid can learn, not a guess.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Brick Bounce Complete!"). onComplete fires exactly
 *   once with the real score plus correct/total counts and lives
 *   left.
 * - Pause via the shared PlayShell freezes the ball and the
 *   controls (the shell overlay covers the field, and the ball
 *   loop + control handlers all require status 'playing').
 *   Reading How to Play mid-game also freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the wrong bricks, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, so any question list where
 *   every item has at least two different answers to borrow as
 *   wrong bricks plays. A question with fewer keeps the plain
 *   message — see convert.ts.
 *   Print: NOT printable (needs its paddle, ball, and bricks) —
 *   see print-worksheet.ts. Sitemap type list stays at 23 by
 *   decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface BrickBounceGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** A steady colour per answer, so the same answer always looks the same. */
function brickColour(answer: string): string {
  const palette = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf']
  const code = answer.charCodeAt(0) || 0
  return palette[code % palette.length]!
}

/** Field units -> percent of the scene box (the scene is 100 x 60). */
const px = (v: number) => `${v}%`
const py = (v: number) => `${(v / BRICK_BOUNCE_FIELD_HEIGHT) * 100}%`

function BrickBounceGame({ items, locale, onComplete, onProgress }: BrickBounceGameProps) {
  const [rounds, setRounds] = useState<BrickBounceRound[]>([])
  const [game, setGame] = useState<BrickBounceState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(BRICK_BOUNCE_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
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
    const shuffled = shuffleArray(usable).slice(0, BRICK_BOUNCE_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: BrickBounceRound[] = []
    for (const item of shuffled) {
      const round = buildBrickBounceRound(item.prompt, item.answer, allAnswers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newBrickBounceGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(BRICK_BOUNCE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(BRICK_BOUNCE_LIVES)
  const correctRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { correctRef.current = correctCount })
  useEffect(() => { onProgress(score, finished) }, [score, finished, onProgress])

  const finishGame = useCallback((didWin: boolean) => {
    setWon(didWin)
    setFinished(true)
    if (!completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(scoreRef.current, {
        correctCount: correctRef.current,
        totalCount: rounds.length * BRICK_BOUNCE_CORRECT_BRICKS,
        livesLeft: livesRef.current,
      })
    }
  }, [rounds.length])

  // Finish sound once: win on Brick Bounce Complete, lose on game over.
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
    const fresh = newBrickBounceGame(round)
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
    advancingRef.current = true
    const from = currentRef.current
    setFeedback({
      type: 'wrong',
      msg: livesRef.current <= 0 ? `${msg} — and you are out of lives.` : msg,
    })
    setTimeout(() => advanceFrom(from), 1400)
  }, [advanceFrom])

  /** Resolve a ball event from the physics step. */
  const resolveEvent = useCallback((next: BrickBounceState) => {
    const event = next.lastEvent
    if (!event) return
    if (event.kind === 'hit-correct') {
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      if (next.status === 'won') {
        advancingRef.current = true
        const from = currentRef.current
        setFeedback({
          type: 'correct',
          msg: `All the ${event.answer} bricks are smashed! +${SCORE_PER_CORRECT} points — round won!`,
        })
        setTimeout(() => advanceFrom(from), 1200)
      } else {
        setFeedback({
          type: 'correct',
          msg: `Smashed a ${event.answer} brick! +${SCORE_PER_CORRECT} points — ${event.correctLeft} ${event.correctLeft === 1 ? 'brick' : 'bricks'} with the right answer left.`,
        })
      }
      return
    }
    // A wrong brick or a fall costs the ball.
    playEduSound('wrong', readInteractiveSoundOn())
    if (next.status === 'out') {
      if (event.kind === 'hit-wrong') {
        loseRound(`That brick had ${event.answer} — the wrong one, and that was your last ball.`)
      } else {
        loseRound('The ball fell past the paddle — and that was your last ball.')
      }
    } else if (event.kind === 'hit-wrong') {
      setFeedback({
        type: 'wrong',
        msg: `That brick had ${event.answer} — wrong brick! It cost you the ball. ${event.ballsLeft} ${event.ballsLeft === 1 ? 'ball' : 'balls'} left — read the bricks before you aim.`,
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
    const x = ((clientX - rect.left) / rect.width) * BRICK_BOUNCE_FIELD_WIDTH
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
    const next = movePaddle(g, g.paddleX + dir * BRICK_BOUNCE_PADDLE_STEP)
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
      if (key === 'arrowleft') { e.preventDefault(); stepPaddleRef.current(-1) }
      else if (key === 'arrowright') { e.preventDefault(); stepPaddleRef.current(1) }
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
      const fresh = newBrickBounceGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setLives(BRICK_BOUNCE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    completedRef.current = false
    advancingRef.current = false
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no wall yet — it needs questions with at least two other different answers to smash at.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🧱</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Brick Bounce</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Slide the paddle, bounce the ball, and smash the bricks with the right answer!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> a wall of bricks hangs above you, and every brick has an answer on it. Read the question at the top — for example, &ldquo;10−3 = ?&rdquo; — then smash the bricks that say the right answer, 7. Slide the paddle along the bottom to bounce the ball up into the wall. Where the ball hits the paddle decides where it goes next: hit it in the middle and it goes straight up, hit it near the edge and it tilts away. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> smashing a brick with the right answer earns {BRICK_BOUNCE_POINTS_PER_BRICK} points. Each round has {BRICK_BOUNCE_CORRECT_BRICKS} right-answer bricks, so the game is scored out of {rounds.length * BRICK_BOUNCE_CORRECT_BRICKS * BRICK_BOUNCE_POINTS_PER_BRICK} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}).</p>
          <p><strong>Objective:</strong> smash every right-answer brick in every round without running out of lives.</p>
          <p><strong>Controls:</strong> move your mouse or drag your finger across the field to slide the paddle — or use the left/right arrow keys. Press Space, tap the field, or press the LAUNCH button to send the ball up. The ◀ ▶ buttons slide the paddle too.</p>
          <p><strong>Lives:</strong> you start with {BRICK_BOUNCE_LIVES} lives. A ball that falls past the paddle is lost, but costs no life — if you still have balls left, a fresh ball rests on the paddle. If you spend all {BRICK_BOUNCE_BALLS_PER_ROUND} balls in a round without smashing every right-answer brick, you lose 1 life and the round ends.</p>
          <p><strong>Wrong bricks:</strong> a wrong brick breaks just like a right one — but it costs you the ball at once, and earns no points! A wrong brick is a trap. Read the answers on the bricks before you aim the ball at them.</p>
          <p><strong>Rounds:</strong> one round per question, in shuffled order. You get {BRICK_BOUNCE_BALLS_PER_ROUND} balls in every round.</p>
          <p><strong>How you win and finish:</strong> smash every right-answer brick in every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many right-answer bricks you smashed, and how many lives are left.</p>
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
          {won ? 'Brick Bounce Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * BRICK_BOUNCE_CORRECT_BRICKS * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length * BRICK_BOUNCE_CORRECT_BRICKS} right-answer bricks smashed
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
  const ballPos: BrickBouncePoint = game.ball
    ? { x: game.ball.x, y: game.ball.y }
    : servedBallPosition(game.paddleX)
  const correctLeft = correctBricksLeft(game)

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * BRICK_BOUNCE_CORRECT_BRICKS * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, BRICK_BOUNCE_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite">⚪ {game.ballsLeft} {game.ballsLeft === 1 ? 'ball' : 'balls'} left</span>
        <span aria-live="polite">🧱 {correctLeft} right {correctLeft === 1 ? 'brick' : 'bricks'} left</span>
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
          Smash the bricks with the right answer — wrong bricks cost you the ball!
        </p>
      </div>

      {/* The field: brick wall above, paddle and ball below. */}
      <div
        ref={sceneRef}
        role="application"
        aria-label={`Brick Bounce round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. ${correctLeft} right-answer bricks left, ${game.ballsLeft} balls left, ${lives} lives left. Move the mouse or drag to slide the paddle, press Space or tap to launch the ball.`}
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
          background: 'linear-gradient(to bottom, #1e293b 0%, #334155 55%, #0f172a 100%)',
        }}
      >
        {/* Bricks */}
        {round.bricks.map((brick) => {
          if (brick.smashed) return null
          return (
            <div
              key={brick.id}
              aria-label={`Brick with ${brick.answer}`}
              style={{
                position: 'absolute', left: px(brick.x), top: py(brick.y),
                width: px(BRICK_BOUNCE_BRICK_WIDTH), height: py(BRICK_BOUNCE_BRICK_HEIGHT),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: brickColour(brick.answer), borderRadius: '4px',
                border: '2px solid rgba(255,255,255,0.45)', boxSizing: 'border-box',
                color: '#1e293b', fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '1rem', overflow: 'hidden',
              }}
            >
              {brick.answer}
            </div>
          )
        })}
        {/* Paddle */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: px(game.paddleX - BRICK_BOUNCE_PADDLE_WIDTH / 2),
            top: py(BRICK_BOUNCE_PADDLE_Y),
            width: px(BRICK_BOUNCE_PADDLE_WIDTH),
            height: py(BRICK_BOUNCE_PADDLE_HEIGHT),
            background: '#f97316', borderRadius: '999px',
            border: '2px solid #fff7ed', boxSizing: 'border-box',
          }}
        />
        {/* Ball */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', left: px(ballPos.x), top: py(ballPos.y),
            width: '20px', height: '20px', marginLeft: '-10px', marginTop: '-10px',
            borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ffffff, #fbbf24)',
            border: '2px solid #92400e', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Paddle buttons + launch */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => stepPaddleRef.current(-1)}
          aria-label="Slide the paddle left"
          style={{
            padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          ◀
        </button>
        <button
          onClick={() => doLaunch()}
          disabled={game.status !== 'serving'}
          aria-label="Launch the ball"
          style={{
            padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: game.status === 'serving' ? 'var(--color-primary)' : 'var(--color-border)',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          🚀 LAUNCH
        </button>
        <button
          onClick={() => stepPaddleRef.current(1)}
          aria-label="Slide the paddle right"
          style={{
            padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          ▶
        </button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Move the mouse or drag to slide the paddle — or use ← →. Press Space, tap the field, or LAUNCH to send the ball up. A wrong brick costs you the ball!
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

export default function BrickBounceActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Brick Bounce" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <BrickBounceGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
