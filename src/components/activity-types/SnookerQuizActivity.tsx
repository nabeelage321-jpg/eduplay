'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, shuffleArray } from './shared'
import ScorePill from '@/components/game/ScorePill'
import KidActionsBar from '@/components/game/KidActionsBar'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import type { ActivityItem } from '@/types'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  SNOOKER_QUIZ_LIVES,
  SNOOKER_QUIZ_MAX_ROUNDS,
  SNOOKER_QUIZ_RED_POINTS,
  SNOOKER_QUIZ_MAX_PER_ROUND,
  SNOOKER_QUIZ_COLOUR_BALLS,
  newSnookerQuizGame,
  potBall,
  resolvePot,
  pickColour,
  buildSnookerQuizRound,
  type SnookerQuizState,
  type SnookerQuizRound,
  type SnookerQuizBall,
} from '@/lib/snooker-quiz'

/**
 * Snooker Quiz — EduPlay's own snooker-THEMED quiz (type 65).
 *
 * A quiz game with a snooker theme, NOT a snooker simulation
 * and NOT a copy of any snooker game: four balls sit on a green
 * table, each holding an answer, and the kid pots the ball with
 * the right one. Potting the right ball is a RED (+10 points),
 * then a colour ball is offered for bonus points — yellow 2,
 * green 3, brown 4, blue 5, pink 6, black 7 — just like potting
 * a colour after a red in real snooker. The colour is a free
 * pick, a reward, never a second test: the red's points are
 * always kept, and the colour only adds. No rival's art, name,
 * wording, or audio is copied: the table, balls, and words are
 * drawn here from the public rules of snooker itself. Sounds
 * are the shared interactive Web Audio system (synthesized, no
 * assets) for correct / wrong / win / lose, plus a small soft
 * "pot" click of our own below. Sound is ON by default for
 * this game; the in-player toggle mutes it in one tap.
 * Background music is the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct ball's answer. Each round's table holds
 * 4 balls: the round's own answer on one, wrong answers
 * borrowed from the game's other items on the other three. No
 * new save path was needed: the save route already stores
 * prompt/answer for every type, and the adapter passes creator
 * rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per RED potted, plus 2–7 bonus points
 *   for the colour ball picked after a red — 17 points a round
 *   at most and the game is scored out of 17 x rounds.
 * - Tap (or click) a ball to pot it — or press 1, 2, 3, or 4
 *   for the first, second, third, or fourth ball. The cue ball
 *   rolls to the ball you tapped.
 * - Pot the RIGHT ball and it drops into the pocket: +10
 *   points, the round is won, and then you pick any colour
 *   ball for bonus points — black is worth 7! A colour pick
 *   is a reward, never a test: it can only add points.
 * - Pot a WRONG ball and it is a MISS: no points, the round
 *   ends at once and costs 1 life. One pot per round, so a
 *   miss is the round lost, not a retry.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win ("Snooker Quiz Complete!"). onComplete fires
 *   exactly once with the real score plus rounds won / total
 *   rounds and lives left.
 * - If a question carries its own picture (imageUrl), the
 *   picture shows above the question — it is part of the
 *   question, never decoration, never invented.
 * - Pause via the shared PlayShell blocks new pots and holds
 *   a rolling cue ball until play resumes (the shell overlay
 *   covers the scene, and the pot handlers all require status
 *   'playing'). Reading How to Play mid-game also blocks pots.
 * - Kid actions: one hint per round (pockets ONE wrong ball),
 *   skip (0 points, move on, no life lost), and see the answer
 *   (reveals the right ball, 0 points).
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the
 *   play page shows the instructions first, so this page is
 *   never shown automatically at start; it explains how to
 *   play, how scores are given, the objective, the controls,
 *   the lives, the miss, the colour bonus, the streak, the
 *   rounds, and how you win/finish — with a "Back to game"
 *   button. The same page is re-readable mid-game from the
 *   "How to play" button, and returning from it resumes the
 *   game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the
 *   game's own items, one round per question, so any question
 *   list where every item has at least three different answers
 *   to borrow as wrong balls plays. A question with fewer keeps
 *   the plain message — see convert.ts.
 *   Print: NOT printable (needs its green table, rolling cue
 *   ball, and colour pick) — see print-worksheet.ts. Sitemap
 *   type list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface SnookerQuizGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean, total?: number) => void
}

/** Our own soft "pot" click + colour chime: synthesized Web
 *  Audio, no recording, no asset. */
let potCtx: AudioContext | null = null
function potAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!potCtx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      potCtx = new AC()
    }
    if (potCtx.state === 'suspended') void potCtx.resume()
    return potCtx
  } catch {
    return null
  }
}
function playTone(soundOn: boolean, notes: { freq: number; at: number; dur: number; type: OscillatorType; vol: number }[]) {
  if (!soundOn) return
  const ctx = potAudioCtx()
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
    /* sound is best-effort — a pot still counts without it */
  }
}
/** A soft wooden click, like a ball dropping into a pocket. */
function playPotClick(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 240, at: 0, dur: 0.1, type: 'triangle', vol: 0.2 },
    { freq: 120, at: 0.05, dur: 0.14, type: 'triangle', vol: 0.16 },
  ])
}
/** Two rising notes when a colour ball is potted for bonus. */
function playColourChime(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 660, at: 0, dur: 0.16, type: 'sine', vol: 0.16 },
    { freq: 880, at: 0.1, dur: 0.24, type: 'sine', vol: 0.16 },
  ])
}

/** One snooker ball, drawn here: a plain coloured circle with a
 *  soft shine — own art, nothing copied. */
function SnookerBall({ hex, size = 40, label }: { hex: string; size?: number; label?: string }) {
  return (
    <div
      aria-hidden="true"
      title={label}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 32% 30%, #ffffff88 0%, ${hex} 45%, #00000055 100%)`,
        border: '2px solid rgba(0,0,0,0.35)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        flexShrink: 0,
      }}
    />
  )
}

/** The white cue ball, drawn here. */
function CueBall({ size = 34 }: { size?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 32% 30%, #ffffff 0%, #e5e7eb 60%, #9ca3af 100%)',
        border: '2px solid rgba(0,0,0,0.35)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        flexShrink: 0,
      }}
    />
  )
}

function SnookerQuizGame({ items, locale, onComplete, onProgress }: SnookerQuizGameProps) {
  const [rounds, setRounds] = useState<SnookerQuizRound[]>([])
  const [game, setGame] = useState<SnookerQuizState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(SNOOKER_QUIZ_LIVES)
  const [score, setScore] = useState(0)
  const [roundsWon, setRoundsWon] = useState(0)
  const [redsPotted, setRedsPotted] = useState(0)
  const [coloursPotted, setColoursPotted] = useState(0)
  const [colourBonus, setColourBonus] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  const [hiddenBallId, setHiddenBallId] = useState<string | null>(null)
  const [answerRevealed, setAnswerRevealed] = useState(false)

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
    const shuffled = shuffleArray(usable).slice(0, SNOOKER_QUIZ_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: SnookerQuizRound[] = []
    for (const item of shuffled) {
      const round = buildSnookerQuizRound(item.prompt, item.answer, allAnswers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newSnookerQuizGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(SNOOKER_QUIZ_LIVES)
    setScore(0)
    setRoundsWon(0)
    setRedsPotted(0)
    setColoursPotted(0)
    setColourBonus(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setHiddenBallId(null)
    setAnswerRevealed(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(SNOOKER_QUIZ_LIVES)
  const roundsWonRef = useRef(0)
  const streakRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { roundsWonRef.current = roundsWon })
  useEffect(() => { streakRef.current = streak })
  useEffect(() => { onProgress(score, finished, rounds.length * SNOOKER_QUIZ_MAX_PER_ROUND) }, [score, finished, rounds.length, onProgress])
  useEffect(() => () => { if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current) }, [])

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

  // Finish sound once: win on Snooker Quiz Complete, lose on game over.
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
    const fresh = newSnookerQuizGame(round)
    gameRef.current = fresh
    setGame(fresh)
  }, [current, rounds])

  /** Advance after the current round ends. Lives already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setFeedback(null)
    setHiddenBallId(null)
    setAnswerRevealed(false)
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
    advanceTimeoutRef.current = setTimeout(() => advanceFrom(from), 1600)
  }, [advanceFrom])

  /** Settle a rolling cue ball once it reaches the ball. */
  const resolveRoll = useCallback(() => {
    // A paused game holds the cue ball until play resumes.
    if (shellStatusRef.current !== 'playing' || showHowto) {
      setTimeout(resolveRoll, 200)
      return
    }
    const g = gameRef.current
    if (!g || g.phase !== 'rolling') return
    const next = resolvePot(g)
    gameRef.current = next
    setGame(next)
    const event = next.lastEvent
    if (!event) return
    if (event.kind === 'potted-red') {
      playPotClick(readInteractiveSoundOn())
      setScore((s) => s + SNOOKER_QUIZ_RED_POINTS)
      scoreRef.current = scoreRef.current + SNOOKER_QUIZ_RED_POINTS
      setRedsPotted((r) => r + 1)
      setRoundsWon((r) => r + 1)
      roundsWonRef.current = roundsWonRef.current + 1
      setStreak((s) => s + 1)
      streakRef.current = streakRef.current + 1
      setFeedback({
        type: 'correct',
        msg: `Red potted! It was holding ${event.answer}! +${SNOOKER_QUIZ_RED_POINTS} points — now pick a colour ball for bonus points!`,
      })
      return
    }
    if (event.kind === 'missed') {
      loseRound(`Miss! That ball was holding ${event.answer} — the wrong one — and it stayed on the table.`)
    }
  }, [loseRound, showHowto])

  /** Pot a ball: the cue ball rolls to it. */
  const potBallAt = useCallback((ballId: string) => {
    if (shellStatusRef.current !== 'playing' || showHowto || finished || answerRevealed) return
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g) return
    const next = potBall(g, ballId)
    if (next === g) return
    playEduSound('click', readInteractiveSoundOn())
    gameRef.current = next
    setGame(next)
    // The cue ball takes half a second to reach the ball.
    setTimeout(resolveRoll, 500)
  }, [showHowto, finished, answerRevealed, resolveRoll])

  /** Pick a colour ball after potting a red — bonus points only. */
  const pickColourBall = useCallback((colourId: string) => {
    if (shellStatusRef.current !== 'playing' || showHowto || finished) return
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g) return
    const next = pickColour(g, colourId)
    if (next === g) return
    const event = next.lastEvent
    if (!event || event.kind !== 'colour-potted') return
    playColourChime(readInteractiveSoundOn())
    setScore((s) => s + event.bonus)
    scoreRef.current = scoreRef.current + event.bonus
    setColoursPotted((c) => c + 1)
    setColourBonus((b) => b + event.bonus)
    gameRef.current = next
    setGame(next)
    advancingRef.current = true
    const from = currentRef.current
    setFeedback({
      type: 'correct',
      msg: `${event.colourName} potted! +${event.bonus} bonus points!`,
    })
    advanceTimeoutRef.current = setTimeout(() => advanceFrom(from), 1600)
  }, [showHowto, finished, advanceFrom])

  // Keyboard: 1–4 pots a ball while aiming; 1–6 picks a colour
  // ball after a red is potted.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      const g = gameRef.current
      if (!g) return
      if (g.phase === 'aim') {
        const idx = ['1', '2', '3', '4'].indexOf(e.key)
        if (idx < 0) return
        const ball = g.round.balls[idx]
        if (!ball || ball.id === hiddenBallId) return
        e.preventDefault()
        potBallAt(ball.id)
      } else if (g.phase === 'colour') {
        const idx = ['1', '2', '3', '4', '5', '6'].indexOf(e.key)
        if (idx < 0) return
        const colour = SNOOKER_QUIZ_COLOUR_BALLS[idx]
        if (!colour) return
        e.preventDefault()
        pickColourBall(colour.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shellStatus, showHowto, finished, potBallAt, pickColourBall, hiddenBallId])

  // Kid actions: hint pockets one wrong ball, skip moves on with
  // 0 points and no life lost, see-the-answer reveals the right
  // ball for 0 points.
  function useHint() {
    if (showHowto || finished || shellStatus !== 'playing' || answerRevealed) return
    const g = gameRef.current
    if (!g || g.phase !== 'aim' || hiddenBallId) return
    const wrong = g.round.balls.find((b) => !b.correct)
    if (!wrong) return
    playEduSound('click', readInteractiveSoundOn())
    setHiddenBallId(wrong.id)
  }
  function skipRound() {
    if (showHowto || finished || shellStatus !== 'playing' || answerRevealed) return
    const g = gameRef.current
    if (!g || g.phase !== 'aim') return
    playEduSound('click', readInteractiveSoundOn())
    advancingRef.current = true
    const from = currentRef.current
    setFeedback({ type: 'wrong', msg: 'Skipped — 0 points' })
    advanceTimeoutRef.current = setTimeout(() => advanceFrom(from), 1200)
  }
  function revealAnswer() {
    if (showHowto || finished || shellStatus !== 'playing' || answerRevealed) return
    const g = gameRef.current
    if (!g || g.phase !== 'aim') return
    playEduSound('click', readInteractiveSoundOn())
    setAnswerRevealed(true)
    const correct = g.round.balls.find((b) => b.correct)
    setFeedback({
      type: 'correct',
      msg: correct
        ? `The correct answer is "${correct.answer}" — the ${correct.colourName} ball.`
        : 'The correct answer is shown on the table.',
    })
  }
  function gotItNext() {
    if (!answerRevealed) return
    playEduSound('click', readInteractiveSoundOn())
    advancingRef.current = true
    const from = currentRef.current
    setFeedback(null)
    setAnswerRevealed(false)
    setHiddenBallId(null)
    if (from + 1 >= roundsRef.current.length) {
      finishGame(true)
      return
    }
    setCurrent(from + 1)
  }

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
      const fresh = newSnookerQuizGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setLives(SNOOKER_QUIZ_LIVES)
    setScore(0)
    setRoundsWon(0)
    setRedsPotted(0)
    setColoursPotted(0)
    setColourBonus(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setHiddenBallId(null)
    setAnswerRevealed(false)
    completedRef.current = false
    advancingRef.current = false
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no balls on the table yet — it needs questions with at least three other different answers to pot.
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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Snooker Quiz</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Pot the ball with the right answer — then pick a colour ball for bonus points!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> four balls sit on the green snooker table, and each one holds an answer. Read the question at the top — for example, &ldquo;2+6 = ?&rdquo; — and pot the ball holding 8. Tap (or click) the ball, or press 1, 2, 3, or 4. The white cue ball rolls to the ball you tapped. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> potting the ball with the right answer is a RED and earns {SNOOKER_QUIZ_RED_POINTS} points. Then you pick any colour ball for bonus points — yellow 2, green 3, brown 4, blue 5, pink 6, black 7 — so {SNOOKER_QUIZ_MAX_PER_ROUND} points a round at most and the game is scored out of {rounds.length * SNOOKER_QUIZ_MAX_PER_ROUND} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}). The colour pick is a reward, never a test: it can only add points, and your red&rsquo;s points are always kept.</p>
          <p><strong>Objective:</strong> pot the right ball in every round — and pick the black ball (worth 7) whenever you can for the biggest bonus!</p>
          <p><strong>Controls:</strong> tap (or click) a ball to pot it, or press 1, 2, 3, or 4 for the first, second, third, or fourth ball. After a red, tap a colour ball — or press 1 to 6 — to pot it for bonus points. You get one pot per round — choose carefully!</p>
          <p><strong>Lives:</strong> you start with {SNOOKER_QUIZ_LIVES} lives. Potting a wrong ball is a miss: it costs 1 life and ends the round.</p>
          <p><strong>Missing:</strong> pot a ball with the wrong answer and it is a miss — no points, the ball stays on the table, and the round ends. There is only one pot per round, so a miss is the round lost, not a retry.</p>
          <p><strong>Rounds:</strong> one table per question, in shuffled order. A fresh set of balls waits in every round, and the right answer sits on a different coloured ball each time.</p>
          <p><strong>How you win and finish:</strong> pot the right ball in every round with at least one life left and you win. Reach 0 lives and the game ends — your score, your reds, and your colours still count. The end screen shows your score, how many reds and colours you potted, and how many lives are left.</p>
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
          {won ? 'Snooker Quiz Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SNOOKER_QUIZ_MAX_PER_ROUND} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          🔴 {redsPotted} of {rounds.length} reds potted
          {` · 🎱 ${coloursPotted} colours potted (+${colourBonus} bonus)`}
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

  const target = game.targetId
    ? round.balls.find((b) => b.id === game.targetId) ?? null
    : null
  const canPot = game.phase === 'aim' && shellStatus === 'playing' && !showHowto && !finished && !answerRevealed
  const inColourPhase = game.phase === 'colour'
  const revealedBall = answerRevealed ? round.balls.find((b) => b.correct) ?? null : null

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SNOOKER_QUIZ_MAX_PER_ROUND} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, SNOOKER_QUIZ_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
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
          {inColourPhase
            ? 'Red potted! Now pick a colour ball for bonus points — black is worth 7!'
            : 'Pot the ball holding the right answer!'}
        </p>
      </div>

      {/* Kid actions: hint, skip, see the answer — only while aiming. */}
      <KidActionsBar
        onHint={game.phase === 'aim' && !hiddenBallId && !answerRevealed ? useHint : undefined}
        onSkip={game.phase === 'aim' && !answerRevealed ? skipRound : undefined}
        onShowAnswer={game.phase === 'aim' && !answerRevealed ? revealAnswer : undefined}
        hintUsed={hiddenBallId !== null}
        answerShown={answerRevealed}
      />

      {/* The green snooker table: four balls, each holding an answer. */}
      <div
        role="application"
        aria-label={`Snooker Quiz round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. ${lives} lives left. Tap a ball to pot it, or press 1, 2, 3, or 4. Pot the ball holding the right answer — a wrong ball is a miss and costs a life.`}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '100 / 62',
          borderRadius: 'var(--radius-lg)',
          border: '10px solid #78350f',
          overflow: 'hidden',
          userSelect: 'none',
          background: 'linear-gradient(to bottom, #22c55e 0%, #15803d 55%, #166534 100%)',
          boxSizing: 'border-box',
          marginTop: '0.75rem',
        }}
      >
        {/* Six pockets — decoration only, never content. */}
        {[
          { left: '2%', top: '3%' }, { left: '48%', top: '2%' }, { left: '94%', top: '3%' },
          { left: '2%', top: '88%' }, { left: '48%', top: '89%' }, { left: '94%', top: '88%' },
        ].map((p, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: 'absolute', left: p.left, top: p.top, width: '26px', height: '26px',
              marginLeft: '-13px', marginTop: '-13px', borderRadius: '50%',
              background: '#111827', border: '2px solid #78350f',
            }}
          />
        ))}

        {round.balls.map((b: SnookerQuizBall, i: number) => {
          if (b.id === hiddenBallId) return <span key={b.id} aria-hidden="true" />
          const isTarget = target?.id === b.id
          const isPotted = (game.phase === 'colour' || game.phase === 'potted') && isTarget
          const isMissed = game.phase === 'missed' && isTarget
          const isRevealed = revealedBall?.id === b.id
          return (
            <motion.button
              key={b.id}
              type="button"
              onClick={() => potBallAt(b.id)}
              disabled={!canPot}
              aria-label={`${b.colourName} ball, holding ${b.answer}. Tap to pot the ${b.colourName} ball.`}
              animate={
                isMissed
                  ? { x: [0, -8, 8, -6, 6, 0], y: [0, -6, 0] }
                  : isPotted
                    ? { scale: [1, 1.15, 0.25], y: [0, -10, 0], opacity: [1, 1, 0] }
                    : { y: [0, -4, 0] }
              }
              transition={
                isMissed
                  ? { duration: 0.6 }
                  : isPotted
                    ? { duration: 0.7 }
                    : { duration: 1.8 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }
              }
              style={{
                position: 'absolute',
                left: `${b.x}%`,
                top: `${b.y}%`,
                marginLeft: '-52px',
                marginTop: '-52px',
                width: '104px',
                height: '104px',
                borderRadius: '50%',
                border: `4px solid ${isRevealed ? '#facc15' : isMissed ? '#9ca3af' : b.hex}`,
                background: isMissed ? '#e5e7eb' : '#fff',
                cursor: canPot ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.2rem',
                boxShadow: '0 3px 10px rgba(0,0,0,0.35)',
                opacity: isMissed ? 0.75 : 1,
                padding: 0,
              }}
            >
              <SnookerBall hex={b.hex} size={34} label={b.colourName} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-text-primary)', lineHeight: 1 }}>
                {b.colourName}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1,
                  background: isMissed ? '#9ca3af' : b.hex, color: '#fff',
                  borderRadius: '999px', padding: '0.2rem 0.6rem',
                }}
              >
                {b.answer}
              </span>
            </motion.button>
          )
        })}

        {/* The rolling cue ball: from the bottom of the table to the tapped ball. */}
        {game.phase === 'rolling' && target && (
          <motion.div
            aria-hidden="true"
            initial={{ left: '50%', top: '88%' }}
            animate={{ left: `${target.x}%`, top: `${target.y}%` }}
            transition={{ duration: 0.45, ease: 'easeIn' }}
            style={{ position: 'absolute', marginLeft: '-17px', marginTop: '-17px', zIndex: 2 }}
          >
            <CueBall size={34} />
          </motion.div>
        )}

        {/* The cue ball, waiting at the bottom of the table. */}
        {game.phase === 'aim' && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', left: '50%', top: '88%',
              marginLeft: '-17px', marginTop: '-17px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}
          >
            <CueBall size={34} />
          </div>
        )}
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Tap a ball (or press 1, 2, 3, or 4) to pot it — one pot per round! Pot the right one for +{SNOOKER_QUIZ_RED_POINTS} points and a colour bonus; a wrong one is a miss and costs a life!
      </p>

      {/* Colour balls: pick one for bonus points after a red. */}
      {inColourPhase && (
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            background: 'var(--color-surface)', border: '2px solid var(--color-primary)',
            borderRadius: 'var(--radius-lg)', padding: '0.75rem 1rem', marginTop: '0.75rem',
            color: 'var(--color-text-primary)',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontFamily: 'var(--font-display)', fontSize: '0.95rem', textAlign: 'center' }}>
            🎱 Pick a colour ball for bonus points!
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {SNOOKER_QUIZ_COLOUR_BALLS.map((colour, i) => (
              <button
                key={colour.id}
                type="button"
                onClick={() => pickColourBall(colour.id)}
                aria-label={`${colour.name} ball, worth ${colour.points} bonus points. Tap to pot it.`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                  padding: '0.5rem 0.6rem', borderRadius: 'var(--radius)',
                  border: `2px solid ${colour.hex}`, background: '#fff', cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                }}
              >
                <SnookerBall hex={colour.hex} size={30} label={colour.name} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
                  {colour.name}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: colour.hex, lineHeight: 1 }}>
                  +{colour.points} {i === 0 ? '(press 1)' : `(press ${i + 1})`}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Reds and colours potted so far. */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '0.75rem 1rem', marginTop: '0.75rem',
        color: 'var(--color-text-primary)', textAlign: 'center', fontSize: '0.95rem',
      }}>
        🔴 Reds potted: {redsPotted} · 🎱 Colours potted: {coloursPotted} (+{colourBonus} bonus)
      </div>

      {answerRevealed && (
        <button
          onClick={gotItNext}
          style={{
            marginTop: '0.75rem', width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)',
            fontSize: '1.05rem', cursor: 'pointer',
          }}
        >
          Got it — next round →
        </button>
      )}

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

export default function SnookerQuizActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellTotal, setShellTotal] = useState<number | undefined>(undefined)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Snooker Quiz" score={shellScore} finished={shellFinished} totalScore={shellTotal} onElapsed={handleElapsed} autoStart={autoStart}>
      <SnookerQuizGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f, t) => { setShellScore(s); setShellFinished(f); if (typeof t === 'number') setShellTotal(t) }}
      />
    </PlayShell>
  )
}
