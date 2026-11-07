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
  BOUNCE_UP_LIVES,
  BOUNCE_UP_MAX_ROUNDS,
  BOUNCE_UP_POINTS_PER_PLATFORM,
  BOUNCE_UP_CORRECT_PER_ROUND,
  BOUNCE_UP_MAX_PER_ROUND,
  BOUNCE_UP_FIELD_WIDTH,
  BOUNCE_UP_VIEW_HEIGHT,
  BOUNCE_UP_GOAL_Y,
  BOUNCE_UP_PLATFORM_HALF_WIDTH,
  BOUNCE_UP_GOAL_HALF_WIDTH,
  BOUNCE_UP_START_HALF_WIDTH,
  bounceUpCameraY,
  newBounceUpGame,
  stepBounceUp,
  buildBounceUpRound,
  type BounceUpState,
  type BounceUpRound,
} from '@/lib/bounce-up'

/**
 * Bounce Up — EduPlay's own Doodle Jump-STYLE vertical jumper
 * (type 58).
 *
 * Doodle Jump-STYLE mechanic only: a little bouncer bounces
 * upward from platform to platform and must not fall. No
 * Doodle Jump name, no doodler, no Lima Sky art: the bouncer
 * is a plain smiling circle and the platforms are plain
 * rounded slabs with an answer written on each — all drawn
 * here, nothing copied. Sounds are the shared interactive Web
 * Audio system (synthesized, no assets) for correct / wrong /
 * win / lose, plus a small boing and crack of our own below —
 * a sine sweep up for every bounce, a low thud when a wrong
 * platform breaks. Sound is ON by default for this game; the
 * in-player toggle mutes it in one tap. Background music is
 * the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct platform. Each round's climb is 6 rows
 * of 2 platforms plus a star platform at the top: the round's
 * own answer on one platform in every row and on the star,
 * wrong answers borrowed from the game's other items on the
 * rest. No new save path was
 * needed: the save route already stores prompt/answer for
 * every type, and the adapter passes creator rows through
 * untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per CORRECT platform landed on (each
 *   correct platform scores only the first time it is landed
 *   on) and 10 points for the star platform at the top. A
 *   round has 6 correct platforms plus the star, so 70 points
 *   a round at most, score out of 70 x rounds.
 * - The bounce is automatic: every landing on a solid platform
 *   bounces the bouncer back up, high enough to reach the next
 *   row. The kid only steers left and right in the air.
 * - Landing on a WRONG platform breaks it: it cracks and the
 *   bouncer falls straight through it, no bounce, no points —
 *   but no life is lost yet. The bouncer can still land on a
 *   lower platform on the way down and keep climbing — and a
 *   broken platform never blocks the climb, because its row's
 *   other platform is still there to bounce from.
 * - Falling below the bottom of the screen (the camera has
 *   scrolled up past the bouncer) ends the round at once and
 *   costs 1 life. The start pad at the bottom always bounces
 *   and never breaks, so an early fall is always recoverable.
 * - Landing on the star platform at the top wins the round.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Bounce Up Complete!"). onComplete fires exactly
 *   once with the real score plus rounds won / total rounds
 *   and lives left.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - Pause via the shared PlayShell freezes the bounce, the
 *   steering, and the controls (the shell overlay covers the
 *   scene, and the game loop + control handlers all require
 *   status 'playing'). Reading How to Play mid-game also
 *   freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the breaking platforms, the streak, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, so any question list where
 *   every item has at least two different answers to borrow as
 *   wrong platforms plays. A question with fewer keeps the plain
 *   message — see convert.ts.
 *   Print: NOT printable (needs its bouncing, steering, and
 *   breaking platforms) — see print-worksheet.ts. Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface BounceUpGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Our own bounce boing + platform crack: synthesized Web
 *  Audio, no recording, no asset. The boing is a quick sine
 *  sweep up; the crack is a short low square thud. */
let bounceCtx: AudioContext | null = null
function bounceAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!bounceCtx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      bounceCtx = new AC()
    }
    if (bounceCtx.state === 'suspended') void bounceCtx.resume()
    return bounceCtx
  } catch {
    return null
  }
}
function playBoing(soundOn: boolean) {
  if (!soundOn) return
  const ctx = bounceAudioCtx()
  if (!ctx) return
  try {
    const t0 = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(280, t0)
    osc.frequency.exponentialRampToValueAtTime(620, t0 + 0.12)
    gain.gain.setValueAtTime(0.18, t0)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.15)
  } catch {
    /* sound is best-effort — a bounce still counts without it */
  }
}
function playCrack(soundOn: boolean) {
  if (!soundOn) return
  const ctx = bounceAudioCtx()
  if (!ctx) return
  try {
    const t0 = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(140, t0)
    osc.frequency.exponentialRampToValueAtTime(60, t0 + 0.12)
    gain.gain.setValueAtTime(0.2, t0)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.15)
  } catch {
    /* sound is best-effort — a break still counts without it */
  }
}

/** World y (grows up) -> percent from the top of the scene box. */
function wy(y: number, camY: number): string {
  return `${((camY + BOUNCE_UP_VIEW_HEIGHT - y) / BOUNCE_UP_VIEW_HEIGHT) * 100}%`
}
/** World x -> percent from the left of the scene box. */
const wx = (v: number) => `${(v / BOUNCE_UP_FIELD_WIDTH) * 100}%`
/** World width -> percent of the scene box width. */
const ww = (v: number) => `${(v / BOUNCE_UP_FIELD_WIDTH) * 100}%`
/** World height -> percent of the scene box height. */
const wh = (v: number) => `${(v / BOUNCE_UP_VIEW_HEIGHT) * 100}%`

function BounceUpGame({ items, locale, onComplete, onProgress }: BounceUpGameProps) {
  const [rounds, setRounds] = useState<BounceUpRound[]>([])
  const [game, setGame] = useState<BounceUpState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(BOUNCE_UP_LIVES)
  const [score, setScore] = useState(0)
  const [roundsWon, setRoundsWon] = useState(0)
  const [platformsHit, setPlatformsHit] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  const sceneRef = useRef<HTMLDivElement | null>(null)
  // Steering: -1 left, 0 none, 1 right — from keys and from
  // the on-screen hold buttons / scene sides, combined.
  const keySteerRef = useRef(0)
  const buttonSteerRef = useRef(0)
  const steerRef = useRef(0)
  const updateSteer = useCallback(() => {
    steerRef.current = keySteerRef.current !== 0 ? keySteerRef.current : buttonSteerRef.current
  }, [])

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
    const shuffled = shuffleArray(usable).slice(0, BOUNCE_UP_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: BounceUpRound[] = []
    for (const item of shuffled) {
      const round = buildBounceUpRound(item.prompt, item.answer, allAnswers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newBounceUpGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(BOUNCE_UP_LIVES)
    setScore(0)
    setRoundsWon(0)
    setPlatformsHit(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    keySteerRef.current = 0
    buttonSteerRef.current = 0
    steerRef.current = 0
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(BOUNCE_UP_LIVES)
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

  // Finish sound once: win on Bounce Up Complete, lose on game over.
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
    const fresh = newBounceUpGame(round)
    gameRef.current = fresh
    setGame(fresh)
    keySteerRef.current = 0
    buttonSteerRef.current = 0
    steerRef.current = 0
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
    setTimeout(() => advanceFrom(from), 1400)
  }, [advanceFrom])

  /** Resolve a step event from the lib. */
  const resolveEvent = useCallback((next: BounceUpState) => {
    const event = next.lastEvent
    if (!event) return
    if (event.kind === 'landed-correct') {
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setPlatformsHit((p) => p + 1)
      setFeedback({
        type: 'correct',
        msg: `Right one! That platform said ${event.answer}! +${SCORE_PER_CORRECT} points — keep bouncing up!`,
      })
      return
    }
    if (event.kind === 'broke-wrong') {
      playCrack(readInteractiveSoundOn())
      setFeedback({
        type: 'wrong',
        msg: `That platform said ${event.answer} — the wrong one! It broke under you. Steer to a platform with the right answer.`,
      })
      return
    }
    if (event.kind === 'reached-top') {
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setPlatformsHit((p) => p + 1)
      setRoundsWon((r) => r + 1)
      roundsWonRef.current = roundsWonRef.current + 1
      setStreak((s) => s + 1)
      streakRef.current = streakRef.current + 1
      advancingRef.current = true
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `You reached the star! +${SCORE_PER_CORRECT} points — climb complete!`,
      })
      setTimeout(() => advanceFrom(from), 1200)
      return
    }
    if (event.kind === 'fell') {
      loseRound('You fell off the bottom of the screen!')
      return
    }
  }, [advanceFrom, loseRound])

  /** One clock tick: the bouncer bounces and steers. */
  const doTick = useCallback(() => {
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    const wasFalling = g.vy < 0
    const next = stepBounceUp(g, 0.03, steerRef.current)
    gameRef.current = next
    setGame(next)
    // A bounce is a falling bouncer leaving a platform upward.
    if (wasFalling && next.vy > 0 && next.status === 'playing') {
      playBoing(readInteractiveSoundOn())
    }
    if (next.lastEvent) resolveEvent(next)
  }, [resolveEvent])

  // Game loop: the bouncer bounces while the shell is playing,
  // How-to-Play is closed, and the game is not finished —
  // pause and How-to-Play both freeze it.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    if (!game || game.status !== 'playing') return
    const id = setInterval(() => { doTick() }, 30)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current, game?.status, doTick])

  // Keyboard: hold left/right arrows (A/D too) to steer.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        keySteerRef.current = -1
        updateSteer()
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        keySteerRef.current = 1
        updateSteer()
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (keySteerRef.current === -1) keySteerRef.current = 0
        updateSteer()
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (keySteerRef.current === 1) keySteerRef.current = 0
        updateSteer()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [shellStatus, showHowto, finished, updateSteer])

  /** Hold-to-steer from a button or a side of the scene. */
  const holdSteer = useCallback((dir: number) => {
    buttonSteerRef.current = dir
    updateSteer()
  }, [updateSteer])
  const releaseSteer = useCallback(() => {
    buttonSteerRef.current = 0
    updateSteer()
  }, [updateSteer])

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
      const fresh = newBounceUpGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setLives(BOUNCE_UP_LIVES)
    setScore(0)
    setRoundsWon(0)
    setPlatformsHit(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    completedRef.current = false
    advancingRef.current = false
    keySteerRef.current = 0
    buttonSteerRef.current = 0
    steerRef.current = 0
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no climb yet — it needs questions with at least two other different answers to bounce to.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">⬆️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Bounce Up</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Bounce up from platform to platform — and don&apos;t fall!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> your little bouncer bounces all by itself — you only steer it left and right in the air. Read the question at the top — for example, &ldquo;10−3 = ?&rdquo; — and steer onto the platforms that say 7. Each platform carries an answer, and the rows climb higher and higher. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> landing on a platform with the right answer earns {BOUNCE_UP_POINTS_PER_PLATFORM} points — one right-answer platform in every row ({BOUNCE_UP_CORRECT_PER_ROUND} in every climb), plus the star platform at the top, so {BOUNCE_UP_MAX_PER_ROUND} points a round at most and the game is scored out of {rounds.length * BOUNCE_UP_MAX_PER_ROUND} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}). A right-answer platform only pays the first time you land on it — bouncing on it again just bounces.</p>
          <p><strong>Objective:</strong> reach the star platform at the top of every climb without falling off the bottom of the screen — and keep your streak of climbs won in a row going!</p>
          <p><strong>Controls:</strong> hold the left or right arrow key (A and D work too) to steer in the air, hold the ◀ ▶ buttons under the scene, or hold the left or right side of the scene itself. The bounce is automatic — you never press anything to jump.</p>
          <p><strong>Lives:</strong> you start with {BOUNCE_UP_LIVES} lives. Falling below the bottom of the screen costs 1 life and ends the climb. The start pad at the bottom always bounces and never breaks, so an early fall is always recoverable — but once the screen has scrolled up, there is no floor to catch you.</p>
          <p><strong>Wrong platforms:</strong> landing on a platform with the wrong answer breaks it — it cracks and you fall straight through it. No points, and no life lost yet: you can still land on a lower platform on the way down and keep climbing. Only falling off the screen costs a life.</p>
          <p><strong>Rounds:</strong> one climb per question, in shuffled order. A fresh set of platforms climbs in every round, and the right answers sit in different places each time.</p>
          <p><strong>How you win and finish:</strong> reach the star at the top of every climb with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many right platforms you reached, and how many lives are left.</p>
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
          {won ? 'Bounce Up Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * BOUNCE_UP_MAX_PER_ROUND} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {platformsHit} of {rounds.length * (BOUNCE_UP_CORRECT_PER_ROUND + 1)} right platforms reached
          {` · ${roundsWon} of ${rounds.length} climbs finished`}
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

  const camY = bounceUpCameraY(game.highestY)
  // Platforms (and the start pad) inside — or just below — the
  // camera window are the ones the kid can see.
  const visiblePlatforms = game.round.platforms.filter(
    (p) => p.y >= camY - 8 && p.y <= camY + BOUNCE_UP_VIEW_HEIGHT + 4,
  )
  const climbPct = Math.min(100, Math.round((game.highestY / BOUNCE_UP_GOAL_Y) * 100))

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * BOUNCE_UP_MAX_PER_ROUND} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, BOUNCE_UP_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
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
          Steer in the air — bounce only on the platforms with the right answer!
        </p>
        {/* Climb progress: how high the bouncer has got toward the star. */}
        <div style={{ marginTop: '0.75rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span>Height {Math.max(0, Math.round(game.highestY))}</span>
            <span>⭐ Star at {BOUNCE_UP_GOAL_Y}</span>
          </div>
          <div style={{ height: '8px', borderRadius: '999px', background: 'var(--color-border)', overflow: 'hidden', marginTop: '0.25rem' }}>
            <div style={{ width: `${climbPct}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 200ms' }} />
          </div>
        </div>
      </div>

      {/* Climb scene: the camera window. Hold the left or right
          side to steer; the bounce is automatic. */}
      <div
        ref={sceneRef}
        role="application"
        aria-label={`Bounce Up round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. ${lives} lives left. Hold the left or right arrow key, the arrow buttons, or the left or right side of the scene to steer in the air. Bounce only on the platforms with the right answer — a wrong platform breaks.`}
        onPointerDown={(e) => {
          if (shellStatus !== 'playing' || showHowto || finished) return
          const rect = sceneRef.current?.getBoundingClientRect()
          if (!rect) return
          holdSteer(e.clientX - rect.left < rect.width / 2 ? -1 : 1)
        }}
        onPointerUp={releaseSteer}
        onPointerLeave={releaseSteer}
        onPointerCancel={releaseSteer}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '100 / 60',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none',
          background: 'linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 55%, #fef9c3 100%)',
        }}
      >
        {/* Start pad, while it is still in view. */}
        {camY <= 4 && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', left: wx(50 - BOUNCE_UP_START_HALF_WIDTH), top: wy(0, camY),
              width: ww(BOUNCE_UP_START_HALF_WIDTH * 2), height: wh(3.5),
              marginTop: '-1.75%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#92400e', borderRadius: '999px', border: '3px solid #78350f',
              color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem',
              boxSizing: 'border-box',
            }}
          >
            START
          </div>
        )}
        {/* Platforms in view. */}
        {visiblePlatforms.map((p) => {
          const half = p.goal ? BOUNCE_UP_GOAL_HALF_WIDTH : BOUNCE_UP_PLATFORM_HALF_WIDTH
          return (
            <div
              key={p.id}
              aria-label={p.goal ? `Star platform with ${p.answer}` : `Platform with ${p.answer}`}
              style={{
                position: 'absolute', left: wx(p.x - half), top: wy(p.y, camY),
                width: ww(half * 2), height: wh(3.5),
                marginTop: '-1.75%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: p.broken ? '#9ca3af' : p.goal ? '#facc15' : '#65a30d',
                borderRadius: '999px',
                border: p.broken ? '3px solid #6b7280' : p.goal ? '3px solid #a16207' : '3px solid #3f6212',
                color: p.broken ? '#4b5563' : '#fff',
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: p.goal ? '1.05rem' : '0.95rem', textAlign: 'center', boxSizing: 'border-box',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                opacity: p.broken ? 0.55 : 1,
                transform: p.broken ? 'rotate(-6deg)' : 'none',
              }}
            >
              {p.goal ? `⭐ ${p.answer}` : p.broken ? `✗ ${p.answer}` : p.answer}
            </div>
          )
        })}
        {/* The bouncer: a plain smiling circle, drawn here. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', left: wx(game.x), top: wy(game.y, camY),
            width: '44px', height: '44px', marginLeft: '-22px', marginTop: '-22px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 70%)',
            borderRadius: '50%', border: '3px solid #b45309',
            fontSize: '1.5rem', lineHeight: 1, boxSizing: 'border-box',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          }}
        >
          😊
        </div>
      </div>

      {/* Hold-to-steer buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center', marginTop: '0.75rem' }}>
        <button
          onPointerDown={() => holdSteer(-1)}
          onPointerUp={releaseSteer}
          onPointerLeave={releaseSteer}
          onPointerCancel={releaseSteer}
          disabled={game.status !== 'playing'}
          aria-label="Hold to steer left"
          style={{
            padding: '0.9rem 1.75rem', borderRadius: '999px', border: 'none',
            background: game.status === 'playing' ? 'var(--color-primary)' : 'var(--color-border)',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.5rem', cursor: 'pointer',
            boxShadow: 'var(--shadow-card)', userSelect: 'none', touchAction: 'none',
          }}
        >
          ◀
        </button>
        <button
          onPointerDown={() => holdSteer(1)}
          onPointerUp={releaseSteer}
          onPointerLeave={releaseSteer}
          onPointerCancel={releaseSteer}
          disabled={game.status !== 'playing'}
          aria-label="Hold to steer right"
          style={{
            padding: '0.9rem 1.75rem', borderRadius: '999px', border: 'none',
            background: game.status === 'playing' ? 'var(--color-primary)' : 'var(--color-border)',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.5rem', cursor: 'pointer',
            boxShadow: 'var(--shadow-card)', userSelect: 'none', touchAction: 'none',
          }}
        >
          ▶
        </button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Hold ◀ ▶, the arrow keys, or a side of the scene to steer — the bounce is automatic. One right-answer platform in every row plus the ⭐ star at the top; a wrong platform breaks under you, and falling off the bottom of the screen costs a life!
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

export default function BounceUpActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Bounce Up" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <BounceUpGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
