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
  STAR_SHOOTER_LIVES,
  STAR_SHOOTER_MAX_ROUNDS,
  STAR_SHOOTER_COLS,
  STAR_SHOOTER_DESCENT_MS,
  STAR_SHOOTER_MAX_DESCENT_STEPS,
  STAR_SHOOTER_FIELD_HEIGHT,
  STAR_SHOOTER_BULLET_START_Y,
  invaderTop,
  hasLanded,
  clampShooterCol,
  borrowWrongAnswers,
  buildStarShooterRound,
  bulletHitsInvader,
  removeInvader,
  type StarShooterInvader,
  type StarShooterRound,
} from '@/lib/star-shooter'

/**
 * Star Shooter — EduPlay's own fixed-row shooter game (type 45).
 *
 * Space Invaders-STYLE mechanic only: rows of invaders descend
 * over the sky and the kid moves a ship along the bottom and
 * shoots the invader carrying the correct answer. No Space
 * Invaders name, no copied invader sprites, no Taito art: the
 * invaders are plain rounded boxes with a generic alien emoji and
 * the answer written on them, the ship is a rocket emoji, the
 * stars are CSS dots — all drawn here, nothing copied.
 * Sounds are the shared interactive Web Audio system
 * (synthesized, no assets). Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. Background music is
 * the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = correct answer. Each round's invaders are the correct
 * answer plus wrong answers borrowed from the game's other items.
 * No new save path was needed: the save route already stores
 * prompt/answer for every type, and the adapter passes creator
 * rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per correct invader shot, score out of
 *   10 x rounds.
 * - One round (one sky) per question, up to 10 rounds, shuffled
 *   once per item content. The question is shown above the sky;
 *   the correct answer is NEVER shown — the kid has to know it.
 * - The ship moves between 4 columns: arrow keys or A/D, the
 *   on-screen ◀ ▶ buttons, or tap the sky to move the ship to
 *   that column. Shoot with Space, Arrow Up, or the FIRE button
 *   (up to 3 bullets in the air at once). A bullet flies straight
 *   up its column and hits the LOWEST living invader in that
 *   column — the first one it meets — so the kid aims by standing
 *   under the invader they want.
 * - Shooting the correct invader: +10, round done. Shooting a
 *   wrong invader: it pops and the shot is wasted — NO life lost,
 *   no points, just a "try again" note. A bullet that meets no
 *   invader flies off the top of the sky, wasted.
 * - The invaders descend one step every 3.5 seconds. After 4
 *   steps they reach the ground line: the invaders land, -1 life,
 *   round skipped. The descent IS the round's timer — there is no
 *   separate countdown.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Star Shooter Complete!"). onComplete fires exactly once
 *   with the real score plus correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the bullets and the
 *   descent (the shell overlay covers the sky, and the tick loop
 *   + key and button handlers all require status 'playing').
 *   Reading How to Play mid-game also freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the descent, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the sky is generated from the game's
 *   own items, one sky per question, the invaders are the item's
 *   own answer plus wrong answers borrowed from the other items,
 *   so any question list where every item has a different answer
 *   to borrow plays. A lone question with no other answer to
 *   borrow keeps the plain message — see convert.ts. Print: NOT
 *   printable (needs its sky and moving invaders) — see
 *   print-worksheet.ts. Sitemap type list stays at 23 by
 *   decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface StarShooterGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Bullet speed: px travelled per tick, tick every 50ms. */
const BULLET_TICK_MS = 50
const BULLET_SPEED_PX = 12
const MAX_BULLETS = 3

interface Bullet {
  id: number
  col: number
  y: number
}

/** Fixed star positions (own CSS dots, never an image). */
const STARS: { left: string; top: string; size: number }[] = [
  { left: '6%', top: '8%', size: 3 },
  { left: '18%', top: '22%', size: 2 },
  { left: '30%', top: '6%', size: 3 },
  { left: '44%', top: '16%', size: 2 },
  { left: '58%', top: '7%', size: 3 },
  { left: '70%', top: '20%', size: 2 },
  { left: '82%', top: '9%', size: 3 },
  { left: '92%', top: '24%', size: 2 },
  { left: '12%', top: '38%', size: 2 },
  { left: '38%', top: '34%', size: 2 },
  { left: '64%', top: '36%', size: 2 },
  { left: '88%', top: '40%', size: 2 },
]

function StarShooterGame({ items, locale, onComplete, onProgress }: StarShooterGameProps) {
  const [rounds, setRounds] = useState<StarShooterRound[]>([])
  const [invaders, setInvaders] = useState<StarShooterInvader[]>([])
  const [descentStep, setDescentStep] = useState(0)
  const [shooterCol, setShooterCol] = useState(1)
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [popped, setPopped] = useState<number[]>([])
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(STAR_SHOOTER_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)

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
    const shuffled = shuffleArray(usable).slice(0, STAR_SHOOTER_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: StarShooterRound[] = []
    for (const item of shuffled) {
      const wrongs = borrowWrongAnswers(allAnswers, item.answer)
      const round = buildStarShooterRound(item.prompt, item.answer, wrongs, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setInvaders([])
    setDescentStep(0)
    setShooterCol(1)
    setBullets([])
    setPopped([])
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(STAR_SHOOTER_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(STAR_SHOOTER_LIVES)
  const correctRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  const bulletIdRef = useRef(0)
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

  // Finish sound once: win on Star Shooter Complete, lose on game over.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

  // A fresh sky whenever the round changes.
  const roundsRef = useRef(rounds)
  useEffect(() => { roundsRef.current = rounds }, [rounds])
  const currentRef = useRef(current)
  useEffect(() => { currentRef.current = current }, [current])
  const invadersRef = useRef(invaders)
  useEffect(() => { invadersRef.current = invaders }, [invaders])
  const descentRef = useRef(descentStep)
  useEffect(() => { descentRef.current = descentStep }, [descentStep])
  useEffect(() => {
    const round = rounds[current]
    if (!round) return
    setInvaders(round.invaders)
    setDescentStep(0)
    setShooterCol(1)
    setBullets([])
    setPopped([])
  }, [current, rounds])

  /** Advance after the current round ends. `lostLife` already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setFeedback(null)
    setPopped([])
    setBullets([])
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

  /** The invaders landed: -1 life, round skipped. */
  const handleLanding = useCallback(() => {
    if (advancingRef.current) return
    advancingRef.current = true
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setFeedback({ type: 'wrong', msg: 'The invaders landed! You lost a life.' })
    const from = currentRef.current
    setTimeout(() => advanceFrom(from), 1400)
  }, [advanceFrom])

  /** A bullet hit an invader. Correct: +10 and the round ends.
   *  Wrong: the invader pops, the shot is wasted — no life lost. */
  const handleShotHit = useCallback((invader: StarShooterInvader) => {
    if (advancingRef.current) return
    if (invader.correct) {
      advancingRef.current = true
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      setPopped([invader.id])
      setInvaders((prev) => removeInvader(prev, invader.id))
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `Direct hit! +${SCORE_PER_CORRECT} points — "${invader.label}" is right!`,
      })
      setTimeout(() => advanceFrom(from), 1000)
      return
    }
    setInvaders((prev) => removeInvader(prev, invader.id))
    setPopped((prev) => [...prev, invader.id])
    setFeedback({
      type: 'wrong',
      msg: `"${invader.label}" is not the answer — that shot is wasted, but you keep your life. Try again!`,
    })
    setTimeout(() => setPopped((prev) => prev.filter((id) => id !== invader.id)), 600)
  }, [advanceFrom])

  const handleShotHitRef = useRef(handleShotHit)
  useEffect(() => { handleShotHitRef.current = handleShotHit }, [handleShotHit])
  const handleLandingRef = useRef(handleLanding)
  useEffect(() => { handleLandingRef.current = handleLanding }, [handleLanding])

  // Game tick: bullets fly up, invaders descend. Runs only while
  // the shell is playing, How-to-Play is closed, and the game is
  // not finished — pause and How-to-Play both freeze the sky.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    let ticksSinceDescent = 0
    const descentTicks = Math.round(STAR_SHOOTER_DESCENT_MS / BULLET_TICK_MS)
    const id = setInterval(() => {
      if (advancingRef.current) return
      ticksSinceDescent++
      if (ticksSinceDescent >= descentTicks) {
        ticksSinceDescent = 0
        const next = descentRef.current + 1
        setDescentStep(next)
        if (hasLanded(next)) {
          handleLandingRef.current()
          return
        }
      }
      setBullets((prev) => {
        const kept: Bullet[] = []
        for (const b of prev) {
          const y = b.y - BULLET_SPEED_PX
          if (y < -10) continue // flew off the top of the sky, wasted
          const hit = bulletHitsInvader(invadersRef.current, b.col, y, descentRef.current)
          if (hit) {
            handleShotHitRef.current(hit)
            continue
          }
          kept.push({ ...b, y })
        }
        return kept
      })
    }, BULLET_TICK_MS)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current])

  const shooterColRef = useRef(shooterCol)
  useEffect(() => { shooterColRef.current = shooterCol }, [shooterCol])

  function moveShooter(delta: number) {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current) return
    setShooterCol((c) => clampShooterCol(c + delta))
    playEduSound('click', readInteractiveSoundOn())
  }

  function moveShooterTo(col: number) {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current) return
    setShooterCol(clampShooterCol(col))
    playEduSound('click', readInteractiveSoundOn())
  }

  function fire() {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current) return
    setBullets((prev) => {
      if (prev.length >= MAX_BULLETS) return prev
      bulletIdRef.current += 1
      return [...prev, { id: bulletIdRef.current, col: shooterColRef.current, y: STAR_SHOOTER_BULLET_START_Y }]
    })
    playEduSound('click', readInteractiveSoundOn())
  }

  const fireRef = useRef(fire)
  useEffect(() => { fireRef.current = fire }, [fire])
  const moveShooterRef = useRef(moveShooter)
  useEffect(() => { moveShooterRef.current = moveShooter }, [moveShooter])

  // Keyboard controls: arrows / A,D to move, Space / Arrow Up to shoot.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (shellStatus !== 'playing' || showHowto || finished) return
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        moveShooterRef.current(-1)
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        moveShooterRef.current(1)
      } else if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        fireRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
    // Re-deal round 1's sky here too: when the game ended on
    // round 1, `current` does not change, so the sky effect
    // would not fire on its own.
    const first = roundsRef.current[0]
    if (first) {
      setInvaders(first.invaders)
      setDescentStep(0)
    }
    setShooterCol(1)
    setBullets([])
    setPopped([])
    setLives(STAR_SHOOTER_LIVES)
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
        This game has no questions to shoot yet — it needs at least two different answers.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">👾</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Star Shooter</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Shoot the invader carrying the right answer before they land.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each sky asks one question. Rows of invaders float above you, and every invader carries an answer. Move your ship under the invader with the correct answer and shoot it. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> shooting the correct invader earns {SCORE_PER_CORRECT} points. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'sky' : 'skies'}). Shooting a wrong invader earns no points.</p>
          <p><strong>Objective:</strong> shoot the right invader in every sky without running out of lives.</p>
          <p><strong>Controls:</strong> move with the Left and Right arrow keys or A and D, shoot with Space or Arrow Up — or use the on-screen ◀ ▶ buttons and the FIRE button. Tap the sky to move your ship to that spot. Your bullet flies straight up and hits the lowest invader in your column, so stand under the invader you want to hit.</p>
          <p><strong>Lives:</strong> you start with {STAR_SHOOTER_LIVES} lives. A wrong shot costs nothing — the invader pops, the shot is wasted, and you keep your life. Only the invaders landing costs a life.</p>
          <p><strong>Descent:</strong> the invaders step down every few seconds. After {STAR_SHOOTER_MAX_DESCENT_STEPS} steps they reach the ground line and land — that costs 1 life and the sky is skipped. The descent pauses when you pause the game or re-read this page.</p>
          <p><strong>Rounds:</strong> one sky per question, in shuffled order.</p>
          <p><strong>How you win and finish:</strong> finish every sky with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many skies you cleared, and how many lives are left.</p>
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
          {won ? 'Star Shooter Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} skies cleared
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

  const colWidthPct = 100 / STAR_SHOOTER_COLS
  const groundTop = STAR_SHOOTER_FIELD_HEIGHT - 46
  const controlBtn: CSSProperties = {
    padding: '0.7rem 1.1rem', borderRadius: 'var(--radius-lg)',
    border: '2px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)',
    fontSize: '1.1rem', cursor: 'pointer', minWidth: '3.2rem',
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, STAR_SHOOTER_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite">Sky {current + 1} of {rounds.length}</span>
        <span aria-live="polite">Descent {descentStep}/{STAR_SHOOTER_MAX_DESCENT_STEPS}</span>
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
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
          Shoot the invader with the right answer before they land!
        </p>
      </div>

      {/* The sky: tap it to move the ship to that column. */}
      <div
        role="application"
        aria-label={`Star Shooter sky ${current + 1} of ${rounds.length}. ${invaders.filter((i) => i.alive).length} invaders left. Descent step ${descentStep} of ${STAR_SHOOTER_MAX_DESCENT_STEPS}.`}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          const col = Math.floor(((e.clientX - rect.left) / rect.width) * STAR_SHOOTER_COLS)
          moveShooterTo(col)
        }}
        style={{
          position: 'relative',
          height: `${STAR_SHOOTER_FIELD_HEIGHT}px`,
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(180deg, #0b1026 0%, #1b2a52 70%, #2c3a6e 100%)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        {STARS.map((s, i) => (
          <span key={i} aria-hidden="true" style={{
            position: 'absolute', left: s.left, top: s.top,
            width: s.size, height: s.size, borderRadius: '50%',
            background: '#fff', opacity: 0.85,
          }} />
        ))}

        {invaders.filter((inv) => inv.alive).map((inv) => (
          <motion.div
            key={inv.id}
            animate={{ top: invaderTop(inv.row, descentStep) }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute',
              left: `${inv.col * colWidthPct + 1}%`,
              width: `${colWidthPct - 2}%`,
              height: '44px',
              borderRadius: 'var(--radius)',
              background: 'rgba(124, 58, 237, 0.9)',
              border: '2px solid rgba(255,255,255,0.35)',
              color: '#fff',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
              lineHeight: 1.1, textAlign: 'center', padding: '0.15rem', overflow: 'hidden',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '1.05rem', lineHeight: 1 }}>👾</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{inv.label}</span>
          </motion.div>
        ))}

        {popped.map((id) => {
          const inv = invaders.find((i) => i.id === id)
          if (!inv) return null
          return (
            <span key={`pop-${id}`} aria-hidden="true" style={{
              position: 'absolute',
              left: `${inv.col * colWidthPct + 1}%`,
              top: invaderTop(inv.row, descentStep),
              width: `${colWidthPct - 2}%`,
              textAlign: 'center', fontSize: '1.6rem', lineHeight: 1,
            }}>
              💥
            </span>
          )
        })}

        {bullets.map((b) => (
          <span key={b.id} aria-hidden="true" style={{
            position: 'absolute',
            left: `calc(${(b.col + 0.5) * colWidthPct}% - 3px)`,
            top: b.y,
            width: '6px', height: '14px', borderRadius: '3px',
            background: '#fde047', boxShadow: '0 0 8px #fde047',
          }} />
        ))}

        {/* Ground line — the invaders must not reach it. */}
        <div aria-hidden="true" style={{
          position: 'absolute', left: 0, right: 0, top: groundTop,
          borderTop: '2px dashed rgba(255,255,255,0.5)',
        }} />
        <span aria-hidden="true" style={{
          position: 'absolute', right: '0.4rem', top: groundTop + 4,
          color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem',
        }}>
          ground
        </span>

        {/* The ship. */}
        <motion.div
          animate={{ left: `${shooterCol * colWidthPct + 1}%` }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute',
            bottom: '4px',
            width: `${colWidthPct - 2}%`,
            textAlign: 'center', fontSize: '2rem', lineHeight: 1,
          }}
          aria-label={`Your ship, column ${shooterCol + 1} of ${STAR_SHOOTER_COLS}`}
        >
          🚀
        </motion.div>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Tap the sky to move your ship, then FIRE. Your bullet hits the lowest invader in your column.
      </p>

      {/* Controls: move + shoot. */}
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" aria-label="Move left" onClick={() => moveShooter(-1)} style={controlBtn}>◀</button>
        <button
          type="button" aria-label="Fire"
          onClick={fire}
          style={{
            ...controlBtn, flex: 1, maxWidth: '12rem',
            background: 'var(--color-primary)', color: '#fff', border: 'none',
            fontSize: '1.2rem', fontWeight: 800,
          }}
        >
          🔥 FIRE
        </button>
        <button type="button" aria-label="Move right" onClick={() => moveShooter(1)} style={controlBtn}>▶</button>
      </div>

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

export default function StarShooterActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Star Shooter" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <StarShooterGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
