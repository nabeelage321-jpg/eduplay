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
  ROCK_BLASTER_LIVES,
  ROCK_BLASTER_MAX_ROUNDS,
  ROCK_BLASTER_BULLETS_PER_ROUND,
  ROCK_BLASTER_POINTS_PER_ASTEROID,
  ROCK_BLASTER_FIELD_WIDTH,
  ROCK_BLASTER_FIELD_HEIGHT,
  ROCK_BLASTER_ASTEROID_RADIUS,
  newRockBlasterGame,
  fireBullet,
  fireBulletAimed,
  stepRockBlaster,
  buildRockBlasterRound,
  type RockBlasterState,
  type RockBlasterRound,
} from '@/lib/rock-blaster'

/**
 * Rock Blaster — EduPlay's own Asteroids-STYLE space game
 * (type 53).
 *
 * Asteroids-STYLE mechanic only: the kid flies a little ship
 * through space, where asteroids carrying answers drift across
 * the screen. No Asteroids name, no Atari ship or rock art: the
 * ship is a plain triangle, the asteroids plain grey rocks with
 * an answer written on each — all drawn here, nothing copied.
 * Sounds are the shared interactive Web Audio system
 * (synthesized, no assets). Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. Background music is
 * the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct asteroid. Each round's sky is 4 drifting
 * rocks: the round's own answer on one, wrong answers borrowed
 * from the game's other items on the rest. No new save path was
 * needed: the save route already stores prompt/answer for every
 * type, and the adapter passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per CORRECT asteroid blasted (one correct
 *   asteroid per round, one round per question, up to 10 rounds,
 *   shuffled once per item content). Score out of 10 x rounds.
 * - 6 bullets per round. Every shot spends one bullet, hit or
 *   miss. A bullet that hits nothing fades away — wasted.
 * - Blasting the CORRECT asteroid earns 10 points and wins the
 *   round. Blasting a WRONG asteroid breaks it apart but earns
 *   no points — the bullet is wasted, and the round goes on.
 * - Spending all 6 bullets without blasting the correct
 *   asteroid ends the round and costs 1 life.
 * - Crashing into ANY asteroid costs 1 life and ends the round
 *   at once — dodge the rocks you are not shooting.
 * - The ship drifts: thrust speeds it up along the way it
 *   faces, and it keeps drifting after you let go. It wraps
 *   around the edges of space, and so do the asteroids.
 * - Tap an asteroid to shoot straight at it; or turn with the
 *   arrow keys, thrust with up, and fire with Space.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Rock Blaster Complete!"). onComplete fires exactly
 *   once with the real score plus correct/total counts and lives
 *   left.
 * - Pause via the shared PlayShell freezes the ship, the rocks,
 *   and the controls (the shell overlay covers the field, and the
 *   game loop + control handlers all require status 'playing').
 *   Reading How to Play mid-game also freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the wrong rocks, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, so any question list where
 *   every item has at least two different answers to borrow as
 *   wrong rocks plays. A question with fewer keeps the plain
 *   message — see convert.ts.
 *   Print: NOT printable (needs its drifting ship, asteroids, and shooting) —
 *   see print-worksheet.ts. Sitemap type list stays at 23 by
 *   decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface RockBlasterGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** A steady colour per answer, so the same answer always looks the same. */
function rockColour(answer: string): string {
  const palette = ['#9ca3af', '#a8a29e', '#94a3b8', '#b6a48f', '#8b9bab', '#a89f91', '#7d8a99']
  const code = answer.charCodeAt(0) || 0
  return palette[code % palette.length]!
}

/** Fixed stars for the space background (same sky every game). */
const STARS: { x: number; y: number; size: number }[] = [
  { x: 6, y: 8, size: 2 }, { x: 18, y: 22, size: 1 }, { x: 27, y: 6, size: 2 },
  { x: 38, y: 16, size: 1 }, { x: 47, y: 5, size: 2 }, { x: 58, y: 24, size: 1 },
  { x: 66, y: 9, size: 2 }, { x: 76, y: 18, size: 1 }, { x: 85, y: 7, size: 2 },
  { x: 93, y: 26, size: 1 }, { x: 11, y: 38, size: 1 }, { x: 24, y: 48, size: 2 },
  { x: 35, y: 34, size: 1 }, { x: 52, y: 44, size: 2 }, { x: 63, y: 36, size: 1 },
  { x: 74, y: 47, size: 2 }, { x: 89, y: 40, size: 1 }, { x: 95, y: 52, size: 2 },
  { x: 8, y: 55, size: 1 }, { x: 44, y: 56, size: 1 }, { x: 68, y: 57, size: 1 },
]

/** Field units -> percent of the scene box (the scene is 100 x 60). */
const px = (v: number) => `${v}%`
const py = (v: number) => `${(v / ROCK_BLASTER_FIELD_HEIGHT) * 100}%`

function RockBlasterGame({ items, locale, onComplete, onProgress }: RockBlasterGameProps) {
  const [rounds, setRounds] = useState<RockBlasterRound[]>([])
  const [game, setGame] = useState<RockBlasterState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(ROCK_BLASTER_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  const sceneRef = useRef<HTMLDivElement | null>(null)
  // Held keys: turning and thrust are held down, firing is a tap.
  const heldKeysRef = useRef<Set<string>>(new Set())

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
    const shuffled = shuffleArray(usable).slice(0, ROCK_BLASTER_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: RockBlasterRound[] = []
    for (const item of shuffled) {
      const round = buildRockBlasterRound(item.prompt, item.answer, allAnswers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newRockBlasterGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(ROCK_BLASTER_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(ROCK_BLASTER_LIVES)
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

  // Finish sound once: win on Rock Blaster Complete, lose on game over.
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
    const fresh = newRockBlasterGame(round)
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
    advancingRef.current = true
    const from = currentRef.current
    setFeedback({
      type: 'wrong',
      msg: livesRef.current <= 0 ? `${msg} — and you are out of lives.` : msg,
    })
    setTimeout(() => advanceFrom(from), 1400)
  }, [advanceFrom])

  /** Resolve a physics event from the step. */
  const resolveEvent = useCallback((next: RockBlasterState) => {
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
          msg: `Blasted the ${event.answer} asteroid! +${SCORE_PER_CORRECT} points — round won!`,
        })
        setTimeout(() => advanceFrom(from), 1200)
      }
      return
    }
    if (event.kind === 'hit-wrong') {
      playEduSound('wrong', readInteractiveSoundOn())
      if (next.status === 'out') {
        loseRound(`That rock had ${event.answer} — the wrong one, and that was your last bullet.`)
      } else {
        setFeedback({
          type: 'wrong',
          msg: `That rock had ${event.answer} — wrong rock! It broke apart but earned no points. ${event.bulletsLeft} ${event.bulletsLeft === 1 ? 'bullet' : 'bullets'} left — read the rocks before you shoot.`,
        })
      }
      return
    }
    if (event.kind === 'collision') {
      loseRound('An asteroid crashed into your ship!')
      return
    }
    // A bullet that faded away: only worth a message when it
    // was the last one and the round is out.
    if (event.kind === 'bullet-missed' && next.status === 'out') {
      loseRound('Out of bullets — the right asteroid is still drifting.')
    }
  }, [advanceFrom, loseRound])

  /** One physics tick: the ship drifts, the rocks drift, bullets fly. */
  const doTick = useCallback(() => {
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    const held = heldKeysRef.current
    const rotate: -1 | 0 | 1 = held.has('arrowleft') ? -1 : held.has('arrowright') ? 1 : 0
    const next = stepRockBlaster(g, 0.03, { rotate, thrust: held.has('arrowup') })
    gameRef.current = next
    setGame(next)
    if (next.lastEvent) resolveEvent(next)
  }, [resolveEvent])

  // Game loop: the ship and the rocks move while the shell is
  // playing, How-to-Play is closed, and the game is not finished
  // — pause and How-to-Play both freeze them.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    if (!game || game.status !== 'playing') return
    const id = setInterval(() => { doTick() }, 30)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current, game?.status, doTick])

  /** Fire one bullet straight ahead. */
  const doFire = useCallback(() => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'playing' || g.bulletsLeft <= 0) return
    setFeedback(null)
    playEduSound('click', readInteractiveSoundOn())
    const next = fireBullet(g)
    gameRef.current = next
    setGame(next)
  }, [finished, shellStatus, showHowto])

  const doFireRef = useRef(doFire)
  useEffect(() => { doFireRef.current = doFire }, [doFire])

  /** Turn the ship towards a tapped point and fire at it. */
  const fireAtPoint = useCallback((clientX: number, clientY: number) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const el = sceneRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = ((clientX - rect.left) / rect.width) * ROCK_BLASTER_FIELD_WIDTH
    const y = ((clientY - rect.top) / rect.height) * ROCK_BLASTER_FIELD_HEIGHT
    const g = gameRef.current
    if (!g || g.status !== 'playing' || g.bulletsLeft <= 0) return
    setFeedback(null)
    playEduSound('click', readInteractiveSoundOn())
    const next = fireBulletAimed(g, x, y)
    gameRef.current = next
    setGame(next)
  }, [finished, shellStatus, showHowto])

  const fireAtPointRef = useRef(fireAtPoint)
  useEffect(() => { fireAtPointRef.current = fireAtPoint }, [fireAtPoint])

  /** Hold a turn or thrust key from an on-screen button. */
  const holdKey = useCallback((key: string, on: boolean) => {
    if (on) heldKeysRef.current.add(key)
    else heldKeysRef.current.delete(key)
  }, [])

  // Keyboard: left/right turn (held), up thrusts (held), Space fires.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      if (key === 'arrowleft' || key === 'arrowright' || key === 'arrowup') {
        e.preventDefault()
        heldKeysRef.current.add(key)
      } else if (key === ' ') {
        e.preventDefault()
        if (!e.repeat) doFireRef.current()
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      heldKeysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      heldKeysRef.current.clear()
    }
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
      const fresh = newRockBlasterGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setLives(ROCK_BLASTER_LIVES)
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
        This game has no sky yet — it needs questions with at least two other different answers to blast at.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🪨</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Rock Blaster</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Fly your ship through space and blast the asteroid with the right answer!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> asteroids drift across space, and every one has an answer on it. Read the question at the top — for example, &ldquo;2+6 = ?&rdquo; — then blast the asteroid that says the right answer, 8, and dodge the rest. Your ship drifts: thrust speeds it up in the direction it faces, and it keeps drifting after you let go. The ship and the asteroids wrap around the edges of space. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> blasting the asteroid with the right answer earns {ROCK_BLASTER_POINTS_PER_ASTEROID} points. Each round has one right-answer asteroid, so the game is scored out of {rounds.length * ROCK_BLASTER_POINTS_PER_ASTEROID} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}).</p>
          <p><strong>Objective:</strong> blast the correct asteroid in every round without running out of lives.</p>
          <p><strong>Controls:</strong> hold the left/right arrow keys to turn the ship, hold the up arrow to thrust, and press Space to fire. Or use the on-screen buttons: ⟲ ⟳ to turn, ▲ to thrust, FIRE to shoot. Easiest of all: tap an asteroid and your ship shoots straight at it.</p>
          <p><strong>Lives:</strong> you start with {ROCK_BLASTER_LIVES} lives. Crashing into ANY asteroid costs 1 life and ends the round at once — dodge the rocks you are not shooting. A bullet that hits nothing just fades away, but it is still spent.</p>
          <p><strong>Wrong rocks:</strong> a wrong asteroid breaks apart just like a right one — but it earns no points, and the bullet is wasted! A wrong rock is a trap. Read the answers on the rocks before you shoot. You only get {ROCK_BLASTER_BULLETS_PER_ROUND} bullets per round — spend them all without blasting the right asteroid and you lose 1 life and the round ends.</p>
          <p><strong>Rounds:</strong> one round per question, in shuffled order. You get {ROCK_BLASTER_BULLETS_PER_ROUND} bullets in every round.</p>
          <p><strong>How you win and finish:</strong> blast the right asteroid in every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many right asteroids you blasted, and how many lives are left.</p>
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
          {won ? 'Rock Blaster Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} right asteroids blasted
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

  const shipAngleDeg = (game.ship.angle * 180) / Math.PI

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, ROCK_BLASTER_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite">🔫 {game.bulletsLeft} {game.bulletsLeft === 1 ? 'bullet' : 'bullets'} left</span>
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
          Blast the asteroid with the right answer — wrong rocks waste a bullet, and a crash costs a life!
        </p>
      </div>

      {/* Space: drifting asteroids, the ship, and its bullets. */}
      <div
        ref={sceneRef}
        role="application"
        aria-label={`Rock Blaster round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. ${game.bulletsLeft} bullets left, ${lives} lives left. Hold the left or right arrow key to turn, up to thrust, Space to fire — or tap an asteroid to shoot at it.`}
        onPointerDown={(e) => fireAtPointRef.current(e.clientX, e.clientY)}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '100 / 60',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none',
          background: 'linear-gradient(to bottom, #020617 0%, #0f172a 55%, #1e1b4b 100%)',
        }}
      >
        {/* Stars */}
        {STARS.map((s, i) => (
          <div
            key={`star-${i}`}
            aria-hidden="true"
            style={{
              position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
              width: `${s.size}px`, height: `${s.size}px`, borderRadius: '50%',
              background: '#fff', opacity: 0.8,
            }}
          />
        ))}
        {/* Asteroids */}
        {round.asteroids.map((rock) => {
          if (rock.blasted) return null
          return (
            <div
              key={rock.id}
              aria-label={`Asteroid with ${rock.answer}`}
              style={{
                position: 'absolute', left: px(rock.x), top: py(rock.y),
                width: px(ROCK_BLASTER_ASTEROID_RADIUS * 2), height: py(ROCK_BLASTER_ASTEROID_RADIUS * 2),
                // Percentage margins are relative to the container
                // WIDTH: half the rock's width is 6.5% of it, and
                // half its height is 6.5% of it too (100x60 field).
                marginLeft: `-${ROCK_BLASTER_ASTEROID_RADIUS}%`,
                marginTop: `-${ROCK_BLASTER_ASTEROID_RADIUS}%`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `radial-gradient(circle at 35% 35%, #d6d3d1, ${rockColour(rock.answer)} 70%)`,
                borderRadius: '46% 54% 52% 48% / 52% 48% 54% 46%',
                border: '2px solid rgba(255,255,255,0.5)', boxSizing: 'border-box',
                color: '#1c1917', fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.95rem', overflow: 'hidden', textAlign: 'center',
              }}
            >
              {rock.answer}
            </div>
          )
        })}
        {/* Bullets */}
        {game.bullets.map((b) => (
          <div
            key={b.id}
            aria-hidden="true"
            style={{
              position: 'absolute', left: px(b.x), top: py(b.y),
              width: '8px', height: '8px', marginLeft: '-4px', marginTop: '-4px',
              borderRadius: '50%', background: '#fde047',
              boxShadow: '0 0 8px 2px rgba(253, 224, 71, 0.8)',
            }}
          />
        ))}
        {/* Ship: a plain triangle, pointing where it faces. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', left: px(game.ship.x), top: py(game.ship.y),
            width: '28px', height: '28px', marginLeft: '-14px', marginTop: '-14px',
            transform: `rotate(${shipAngleDeg}deg)`,
            background: 'linear-gradient(to bottom, #f97316, #ea580c)',
            clipPath: 'polygon(50% 0%, 92% 92%, 50% 72%, 8% 92%)',
            filter: 'drop-shadow(0 0 4px rgba(249, 115, 22, 0.7))',
          }}
        />
      </div>

      {/* Turn / thrust / fire controls */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onPointerDown={() => holdKey('arrowleft', true)}
          onPointerUp={() => holdKey('arrowleft', false)}
          onPointerLeave={() => holdKey('arrowleft', false)}
          aria-label="Hold to turn left"
          style={{
            padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          ⟲
        </button>
        <button
          onPointerDown={() => holdKey('arrowup', true)}
          onPointerUp={() => holdKey('arrowup', false)}
          onPointerLeave={() => holdKey('arrowup', false)}
          aria-label="Hold to thrust"
          style={{
            padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          ▲ THRUST
        </button>
        <button
          onPointerDown={() => holdKey('arrowright', true)}
          onPointerUp={() => holdKey('arrowright', false)}
          onPointerLeave={() => holdKey('arrowright', false)}
          aria-label="Hold to turn right"
          style={{
            padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          ⟳
        </button>
        <button
          onClick={() => doFire()}
          disabled={game.status !== 'playing' || game.bulletsLeft <= 0}
          aria-label="Fire a bullet"
          style={{
            padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: game.status === 'playing' && game.bulletsLeft > 0 ? 'var(--color-primary)' : 'var(--color-border)',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          🔫 FIRE
        </button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        ← → turn, ↑ thrust, Space fires — or tap an asteroid to shoot straight at it. Wrong rocks waste a bullet, and a crash costs a life!
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

export default function RockBlasterActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Rock Blaster" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <RockBlasterGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
