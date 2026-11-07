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
  SLINGSHOT_AIM_LIVES,
  SLINGSHOT_AIM_MAX_ROUNDS,
  SLINGSHOT_AIM_PROJECTILES_PER_ROUND,
  SLINGSHOT_AIM_FIELD_WIDTH,
  SLINGSHOT_AIM_FIELD_HEIGHT,
  SLINGSHOT_AIM_GROUND_Y,
  SLINGSHOT_AIM_ANCHOR,
  SLINGSHOT_AIM_TOWER_WIDTH,
  SLINGSHOT_AIM_TOWER_HEIGHT,
  SLINGSHOT_AIM_TOWER_BLOCKS,
  aimFromDrag,
  velocityFromAnglePower,
  trajectoryPoints,
  newSlingshotAimGame,
  launchStone,
  stepProjectile,
  buildSlingshotAimRound,
  type SlingshotAimState,
  type SlingshotAimRound,
  type SlingshotAimPoint,
  type SlingshotAimVelocity,
} from '@/lib/slingshot-aim'

/**
 * Slingshot Aim — EduPlay's own Angry Birds-STYLE slingshot game
 * (type 51).
 *
 * Angry Birds-STYLE mechanic only: the kid drags back on a
 * slingshot and releases to launch a plain stone at towers.
 * No Angry Birds name, no bird or pig characters, no Rovio art:
 * the stone is a plain grey ball, the towers are plain coloured
 * blocks with an answer written on them, the slingshot is two
 * plain posts with a band — all drawn here, nothing copied.
 * Sounds are the shared interactive Web Audio system
 * (synthesized, no assets). Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. Background music is
 * the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct tower. Each round's three towers are the
 * round's own answer plus two wrong answers borrowed from the
 * game's other items. No new save path was needed: the save route
 * already stores prompt/answer for every type, and the adapter
 * passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per correct tower knocked down (one round
 *   per question, up to 10 rounds, shuffled once per item
 *   content). Score out of 10 x rounds.
 * - 3 stones per round. Drag back on the slingshot to aim — the
 *   further back, the harder the launch — and release to fire
 *   (mouse or touch). Dotted preview shows where the stone will
 *   fly. Arrow keys aim instead: up/down changes the angle,
 *   left/right changes the power, Space fires.
 * - Hitting the CORRECT tower knocks it down: +10, round won.
 * - Hitting a WRONG tower knocks that tower down but wastes the
 *   stone: no points, no life lost, the round goes on with the
 *   stones that are left. A knocked-down tower stays down — a
 *   later stone flies straight through where it stood.
 * - A stone that lands on the ground or flies off the field is a
 *   miss: the stone is wasted, no life lost.
 * - Spending all 3 stones without knocking down the correct
 *   tower ends the round with no points and costs 1 life.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Slingshot Aim Complete!"). onComplete fires exactly
 *   once with the real score plus correct/total counts and lives
 *   left.
 * - Pause via the shared PlayShell freezes the flight and the
 *   controls (the shell overlay covers the field, and the flight
 *   loop + control handlers all require status 'playing').
 *   Reading How to Play mid-game also freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the wrong towers, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, so any question list where
 *   every item has at least two different answers to borrow as
 *   wrong towers plays. A question with fewer keeps the plain
 *   message — see convert.ts.
 *   Print: NOT printable (needs its slingshot, flight, and towers) —
 *   see print-worksheet.ts. Sitemap type list stays at 23 by
 *   decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface SlingshotAimGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** A steady colour per tower, so the same answer always looks the same. */
function towerColour(answer: string): string {
  const palette = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf']
  const code = answer.charCodeAt(0) || 0
  return palette[code % palette.length]!
}

/** Field units -> percent of the scene box (the scene is 100 x 60). */
const px = (v: number) => `${v}%`
const py = (v: number) => `${(v / SLINGSHOT_AIM_FIELD_HEIGHT) * 100}%`

function SlingshotAimGame({ items, locale, onComplete, onProgress }: SlingshotAimGameProps) {
  const [rounds, setRounds] = useState<SlingshotAimRound[]>([])
  const [game, setGame] = useState<SlingshotAimState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(SLINGSHOT_AIM_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  // The drag in progress, in field units (null when not dragging).
  const [dragPoint, setDragPoint] = useState<SlingshotAimPoint | null>(null)
  const [dragging, setDragging] = useState(false)
  // Keyboard aim: angle above the horizontal, power 0–1.
  const [kbAngle, setKbAngle] = useState(45)
  const [kbPower, setKbPower] = useState(0.8)
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
    const shuffled = shuffleArray(usable).slice(0, SLINGSHOT_AIM_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: SlingshotAimRound[] = []
    for (const item of shuffled) {
      const round = buildSlingshotAimRound(item.prompt, item.answer, allAnswers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newSlingshotAimGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(SLINGSHOT_AIM_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setDragPoint(null)
    setDragging(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(SLINGSHOT_AIM_LIVES)
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
        totalCount: rounds.length,
        livesLeft: livesRef.current,
      })
    }
  }, [rounds.length])

  // Finish sound once: win on Slingshot Aim Complete, lose on game over.
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
    const fresh = newSlingshotAimGame(round)
    gameRef.current = fresh
    setGame(fresh)
    setDragPoint(null)
    setDragging(false)
  }, [current, rounds])

  /** Advance after the current round ends. Lives already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setFeedback(null)
    setDragPoint(null)
    setDragging(false)
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

  /** Lose one life and end the round (out of stones). */
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

  /** Resolve a finished flight: a correct tower wins, a wrong
   *  tower or a miss just spends the stone. */
  const resolveFlightEnd = useCallback((next: SlingshotAimState) => {
    const result = next.lastFlightResult
    if (!result) return
    if (result.kind === 'hit-correct') {
      advancingRef.current = true
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `Tower down! +${SCORE_PER_CORRECT} points — ${result.answer} is right!`,
      })
      setTimeout(() => advanceFrom(from), 1200)
      return
    }
    if (result.kind === 'hit-wrong') {
      playEduSound('wrong', readInteractiveSoundOn())
      if (next.status === 'out') {
        loseRound(`That tower had ${result.answer} — the wrong one, and that was your last stone.`)
      } else {
        setFeedback({
          type: 'wrong',
          msg: `That tower had ${result.answer} — wrong tower! The stone is wasted, but you still have ${next.projectilesLeft} ${next.projectilesLeft === 1 ? 'stone' : 'stones'} left.`,
        })
      }
      return
    }
    // Miss: the stone landed or flew away.
    playEduSound('wrong', readInteractiveSoundOn())
    if (next.status === 'out') {
      loseRound('That stone missed everything — and that was your last stone.')
    } else {
      setFeedback({
        type: 'wrong',
        msg: `Missed! You still have ${next.projectilesLeft} ${next.projectilesLeft === 1 ? 'stone' : 'stones'} left — watch the dotted path and try again.`,
      })
    }
  }, [advanceFrom, loseRound])

  /** One flight tick: the stone flies one step. */
  const doTick = useCallback(() => {
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g || g.status !== 'flying') return
    const next = stepProjectile(g, 0.03)
    gameRef.current = next
    setGame(next)
    if (next.status !== 'flying') resolveFlightEnd(next)
  }, [resolveFlightEnd])

  // Flight loop: the stone flies while the shell is playing,
  // How-to-Play is closed, and the game is not finished — pause
  // and How-to-Play both freeze the flight.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    if (!game || game.status !== 'flying') return
    const id = setInterval(() => { doTick() }, 30)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current, game?.status, doTick])

  /** Fire a stone with this velocity. */
  const doLaunch = useCallback((velocity: SlingshotAimVelocity) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'aiming') return
    setFeedback(null)
    setDragPoint(null)
    setDragging(false)
    playEduSound('jump', readInteractiveSoundOn())
    const next = launchStone(g, velocity)
    gameRef.current = next
    setGame(next)
  }, [finished, shellStatus, showHowto])

  const doLaunchRef = useRef(doLaunch)
  useEffect(() => { doLaunchRef.current = doLaunch }, [doLaunch])

  /** Pointer position inside the scene, in field units. */
  const pointFromEvent = useCallback((e: React.PointerEvent): SlingshotAimPoint | null => {
    const el = sceneRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return {
      x: ((e.clientX - rect.left) / rect.width) * SLINGSHOT_AIM_FIELD_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * SLINGSHOT_AIM_FIELD_HEIGHT,
    }
  }, [])

  /** Start a drag only when the kid grabs near the slingshot. */
  const onScenePointerDown = useCallback((e: React.PointerEvent) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'aiming') return
    const p = pointFromEvent(e)
    if (!p) return
    const near =
      Math.hypot(p.x - SLINGSHOT_AIM_ANCHOR.x, p.y - SLINGSHOT_AIM_ANCHOR.y) <= 14
    if (!near) return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setDragging(true)
    setDragPoint(p)
  }, [finished, shellStatus, showHowto, pointFromEvent])

  const onScenePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    const p = pointFromEvent(e)
    if (p) setDragPoint(p)
  }, [dragging, pointFromEvent])

  const onScenePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    const p = pointFromEvent(e)
    setDragging(false)
    setDragPoint(null)
    if (!p) return
    const velocity = aimFromDrag(SLINGSHOT_AIM_ANCHOR, p)
    if (!velocity) return
    doLaunchRef.current(velocity)
  }, [dragging, pointFromEvent])

  // Keyboard aim: up/down changes the angle, left/right changes
  // the power, Space fires with the shown angle and power.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      if (key === 'arrowup') { e.preventDefault(); setKbAngle((a) => Math.min(80, a + 5)) }
      else if (key === 'arrowdown') { e.preventDefault(); setKbAngle((a) => Math.max(10, a - 5)) }
      else if (key === 'arrowright') { e.preventDefault(); setKbPower((p) => Math.min(1, +(p + 0.1).toFixed(2))) }
      else if (key === 'arrowleft') { e.preventDefault(); setKbPower((p) => Math.max(0.2, +(p - 0.1).toFixed(2))) }
      else if (key === ' ') {
        e.preventDefault()
        if (!e.repeat) doLaunchRef.current(velocityFromAnglePower(kbAngle, kbPower))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shellStatus, showHowto, finished, kbAngle, kbPower])

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
      const fresh = newSlingshotAimGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setDragPoint(null)
    setDragging(false)
    setLives(SLINGSHOT_AIM_LIVES)
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
        This game has no shots yet — it needs questions with at least two other different answers to aim at.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🎯</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Slingshot Aim</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Drag the slingshot back, let go, and knock down the tower with the right answer!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> three towers stand on the right, each with a different answer on it. Read the question at the top — for example, &ldquo;2+6 = ?&rdquo; — then knock down the tower that says the right answer, 8. Grab the stone on the slingshot (bottom left), drag it back, and let go to fire. Dotted lines show where the stone will fly, so aim with them. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> knocking down the correct tower earns {SCORE_PER_CORRECT} points. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}).</p>
          <p><strong>Objective:</strong> knock down the correct tower in every round without running out of lives.</p>
          <p><strong>Controls:</strong> drag back on the slingshot with your mouse or finger and release to fire — the further back you drag, the harder the stone flies. Or use the keyboard: up/down arrow keys change the angle, left/right change the power, Space fires. The angle and power are shown under the field.</p>
          <p><strong>Lives:</strong> you start with {SLINGSHOT_AIM_LIVES} lives. Hitting a wrong tower or missing costs no life — it only wastes a stone. But if you spend all {SLINGSHOT_AIM_PROJECTILES_PER_ROUND} stones in a round without knocking down the correct tower, you lose 1 life and the round ends.</p>
          <p><strong>Wrong towers:</strong> a wrong tower falls when you hit it, just like the right one — so a hit is not always a win! The tower stays down, and your next stone flies straight through where it stood. Read the answers on the towers before you fire.</p>
          <p><strong>Rounds:</strong> one round per question, in shuffled order. You get {SLINGSHOT_AIM_PROJECTILES_PER_ROUND} stones in every round.</p>
          <p><strong>How you win and finish:</strong> finish every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many towers you knocked down, and how many lives are left.</p>
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
          {won ? 'Slingshot Aim Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} towers knocked down
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

  // Aim preview: while dragging, the dotted path of the drag's
  // velocity; otherwise the keyboard aim's path.
  const dragVelocity = dragPoint ? aimFromDrag(SLINGSHOT_AIM_ANCHOR, dragPoint) : null
  const kbVelocity = velocityFromAnglePower(kbAngle, kbPower)
  const previewVelocity = dragVelocity ?? (game.status === 'aiming' && !dragging ? kbVelocity : null)
  const previewPoints = previewVelocity ? trajectoryPoints(previewVelocity) : []
  // Stone position: dragged stone follows the pointer, flying stone follows physics.
  const stonePos: SlingshotAimPoint = dragPoint && game.status === 'aiming'
    ? dragPoint
    : game.projectile
      ? { x: game.projectile.x, y: game.projectile.y }
      : SLINGSHOT_AIM_ANCHOR
  const groundTopPct = (SLINGSHOT_AIM_GROUND_Y / SLINGSHOT_AIM_FIELD_HEIGHT) * 100

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, SLINGSHOT_AIM_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite">🪨 {game.projectilesLeft} {game.projectilesLeft === 1 ? 'stone' : 'stones'} left</span>
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
          Knock down the tower with the right answer!
        </p>
      </div>

      {/* The field: slingshot on the left, three towers on the right. */}
      <div
        ref={sceneRef}
        role="application"
        aria-label={`Slingshot Aim round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. ${game.projectilesLeft} stones left, ${lives} lives left. Drag back on the slingshot and release to fire, or use the arrow keys and Space.`}
        onPointerDown={onScenePointerDown}
        onPointerMove={onScenePointerMove}
        onPointerUp={onScenePointerUp}
        onPointerCancel={onScenePointerUp}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '100 / 60',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none',
          background: 'linear-gradient(to bottom, #bae6fd 0%, #e0f2fe 70%, #bbf7d0 70%, #86efac 100%)',
        }}
      >
        {/* Ground */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: `${groundTopPct}%`, bottom: 0, background: '#65a30d', opacity: 0.55 }} />
        {/* Aim preview dots */}
        {previewPoints.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute', left: px(p.x), top: py(p.y),
              width: '6px', height: '6px', marginLeft: '-3px', marginTop: '-3px',
              borderRadius: '50%', background: 'rgba(30,41,59,0.55)',
            }}
          />
        ))}
        {/* Towers */}
        {round.towers.map((tower) => {
          if (tower.knockedDown) {
            return (
              <div
                key={tower.id}
                aria-label={`Tower with ${tower.answer}, knocked down`}
                style={{
                  position: 'absolute', left: px(tower.x), top: py(SLINGSHOT_AIM_GROUND_Y - 2),
                  width: px(SLINGSHOT_AIM_TOWER_WIDTH), height: py(2),
                  display: 'flex', gap: '2px',
                }}
              >
                {Array.from({ length: SLINGSHOT_AIM_TOWER_BLOCKS }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, height: '100%', background: towerColour(tower.answer),
                      opacity: 0.45, borderRadius: '2px',
                      transform: `rotate(${(i - 1) * 12}deg)`,
                    }}
                  />
                ))}
              </div>
            )
          }
          return (
            <div
              key={tower.id}
              aria-label={`Tower with ${tower.answer}`}
              style={{
                position: 'absolute', left: px(tower.x), top: py(SLINGSHOT_AIM_GROUND_Y - SLINGSHOT_AIM_TOWER_HEIGHT),
                width: px(SLINGSHOT_AIM_TOWER_WIDTH), height: py(SLINGSHOT_AIM_TOWER_HEIGHT),
                display: 'flex', flexDirection: 'column', gap: '2px',
              }}
            >
              {Array.from({ length: SLINGSHOT_AIM_TOWER_BLOCKS }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: towerColour(tower.answer), borderRadius: '4px',
                    border: '2px solid rgba(30,41,59,0.35)', boxSizing: 'border-box',
                    color: '#1e293b', fontFamily: 'var(--font-display)', fontWeight: 700,
                    fontSize: i === 0 ? '1.05rem' : '0.8rem',
                  }}
                >
                  {i === 0 ? tower.answer : '▦'}
                </div>
              ))}
            </div>
          )
        })}
        {/* Slingshot: two posts with a band to the stone while aiming. */}
        <div
          style={{
            position: 'absolute', left: px(SLINGSHOT_AIM_ANCHOR.x - 3), top: py(SLINGSHOT_AIM_ANCHOR.y - 4),
            width: px(6), height: py(10), pointerEvents: 'none',
          }}
        >
          <div style={{ position: 'absolute', left: '15%', top: 0, width: '18%', height: '100%', background: '#92400e', borderRadius: '4px', transform: 'rotate(-12deg)' }} />
          <div style={{ position: 'absolute', right: '15%', top: 0, width: '18%', height: '100%', background: '#92400e', borderRadius: '4px', transform: 'rotate(12deg)' }} />
          <div style={{ position: 'absolute', left: '20%', right: '20%', bottom: 0, width: '60%', height: '55%', background: '#78350f', borderRadius: '4px' }} />
        </div>
        {/* Elastic band while dragging */}
        {dragging && dragPoint && (
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            viewBox={`0 0 ${SLINGSHOT_AIM_FIELD_WIDTH} ${SLINGSHOT_AIM_FIELD_HEIGHT}`}
            preserveAspectRatio="none"
          >
            <line x1={SLINGSHOT_AIM_ANCHOR.x - 2} y1={SLINGSHOT_AIM_ANCHOR.y - 3} x2={dragPoint.x} y2={dragPoint.y} stroke="#78350f" strokeWidth="0.8" />
            <line x1={SLINGSHOT_AIM_ANCHOR.x + 2} y1={SLINGSHOT_AIM_ANCHOR.y - 3} x2={dragPoint.x} y2={dragPoint.y} stroke="#78350f" strokeWidth="0.8" />
          </svg>
        )}
        {/* The stone */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', left: px(stonePos.x), top: py(stonePos.y),
            width: '22px', height: '22px', marginLeft: '-11px', marginTop: '-11px',
            borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #e5e7eb, #6b7280)',
            border: '2px solid #374151', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem',
          }}
        >
          🪨
        </div>
      </div>

      {/* Keyboard aim readout + fire button */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Angle {dragVelocity ? Math.round(dragVelocity.angleDeg) : kbAngle}° · Power {dragVelocity ? Math.round(dragVelocity.power * 100) : Math.round(kbPower * 100)}%
        </span>
        <button
          onClick={() => doLaunch(velocityFromAnglePower(kbAngle, kbPower))}
          aria-label="Fire the stone with the shown angle and power"
          style={{
            padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: 'var(--color-primary)', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          🎯 FIRE
        </button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Grab the stone and drag it back, then let go — or use ↑ ↓ for angle, ← → for power, Space to fire. A wrong tower falls too, but it wastes your stone!
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

export default function SlingshotAimActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Slingshot Aim" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <SlingshotAimGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
