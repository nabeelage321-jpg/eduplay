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
  APPLE_SNAKE_LIVES,
  APPLE_SNAKE_ROUND_SECONDS,
  APPLE_SNAKE_WARNING_SECONDS,
  APPLE_SNAKE_STEP_MS,
  APPLE_SNAKE_SHRINK_ON_WRONG,
  APPLE_SNAKE_COLS,
  APPLE_SNAKE_ROWS,
  buildAppleSnakeRound,
  stepSnake,
  appleSnakeNextDir,
  appleSnakeAppleAt,
  shrinkSnake,
  type AppleSnakeDir,
  type AppleSnakePos,
  type AppleSnakeRound,
} from '@/lib/apple-snake'

/**
 * Apple Snake — EduPlay's own snake game (type 42).
 *
 * Snake-STYLE mechanic only: the kid steers our own friendly
 * green snake around a garden grid to eat the apple with the
 * correct answer. No Snake/Nokia name, no copied Snake art:
 * the snake head is a green circle with eyes and a smile drawn
 * in SVG here, and the apples are red apples drawn here, each
 * carrying one answer. Sounds are the shared interactive Web
 * Audio system (synthesized, no assets). Sound is ON by default
 * for this game; the in-player toggle mutes it in one tap.
 * The snake moves on its own, so no sound plays per step —
 * only for eating, warnings, and finishing.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = correct answer apple. Distractors are the OTHER
 * items' answers (up to 3, shuffled), exactly like Quiz builds
 * options. If a question carries its own picture (imageUrl), the
 * picture shows above the question — it is part of the question,
 * never decoration, never invented. No new save path was needed:
 * the save route already stores prompt/answer for every type, and
 * the adapter passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per correct round, score out of 10 x rounds.
 * - One round (one garden) per question, rounds shuffled once per
 *   item content. The shown question sits above the garden.
 * - The snake moves on its own, one cell every 250 ms. Steer
 *   with arrow keys / WASD on desktop, or the on-screen arrow
 *   pad on mobile. Steering back on itself is ignored — the
 *   snake cannot turn into its own neck.
 * - Steer the snake onto the CORRECT answer apple: +10, correct
 *   sound, score pop, the snake grows by one segment, then the
 *   next garden. Eat a WRONG apple: -1 life, wrong sound,
 *   shake/red, the snake shortens by 2 segments (never below 2),
 *   and that apple is consumed (it becomes empty grass) so it
 *   can never cost a second life. The round continues until the
 *   correct apple is eaten. All apples look exactly the same
 *   until eaten — no colour ever gives the answer away.
 * - Bumping a wall or biting its own tail costs 1 life, and the
 *   snake starts that garden again from its start spot.
 * - 45 seconds per round. At 5 seconds left, one timer-warning
 *   sound. Time up: -1 life, "Time's up!", round skipped.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Apple Snake Complete!"). onComplete fires exactly once
 *   with the real score plus correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the round timer, the
 *   snake, and steering (the shell overlay covers the garden, and
 *   the timer effect + step interval + key/D-pad handlers all
 *   require status 'playing'). Reading How to Play mid-game also
 *   freezes the timer and the snake.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the timer, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the garden is generated from the game's
 *   own items, one garden per question, apples are the correct
 *   answer plus wrong answers borrowed from the other items, so
 *   any plain question list with at least two distinct answers
 *   plays. A lone question with nothing to borrow keeps the plain
 *   message — see convert.ts. Print: NOT printable (needs its
 *   moving snake and apples) — see print-worksheet.ts. Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface AppleSnakeGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Our own snake head: a friendly green circle with eyes and a smile. */
function SnakeHeadArt() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#16a34a" />
      <circle cx="9" cy="10" r="1.8" fill="#fff" />
      <circle cx="15" cy="10" r="1.8" fill="#fff" />
      <circle cx="9.6" cy="10.6" r="0.9" fill="#14532d" />
      <circle cx="15.6" cy="10.6" r="0.9" fill="#14532d" />
      <path d="M8 15 Q12 18.5 16 15" stroke="#fff" fill="none" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** Our own apple: a red apple with a leaf and stem, drawn in SVG here. */
function AppleArt({ label }: { label: string }) {
  return (
    <span
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '96%', height: '96%', borderRadius: '50%',
        background: '#ef4444', color: '#fff', fontWeight: 700,
        padding: '1px', fontSize: '0.6rem', lineHeight: 1.1, overflow: 'hidden',
        wordBreak: 'break-word', textAlign: 'center',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', top: '-2px', right: '18%', width: '34%', height: '18%',
          background: '#22c55e', borderRadius: '50%', transform: 'rotate(-30deg)',
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
    </span>
  )
}

function AppleSnakeGame({ items, locale, onComplete, onProgress }: AppleSnakeGameProps) {
  const [rounds, setRounds] = useState<AppleSnakeRound[]>([])
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [snake, setSnake] = useState<AppleSnakePos[]>([])
  const [dir, setDir] = useState<AppleSnakeDir>('right')
  const [lives, setLives] = useState(APPLE_SNAKE_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(APPLE_SNAKE_ROUND_SECONDS)
  const [consumed, setConsumed] = useState<Set<string>>(new Set())
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
    const shuffled = shuffleArray(usable)
    const built: AppleSnakeRound[] = []
    for (const item of shuffled) {
      const others = shuffleArray(usable.filter((o) => o !== item).map((o) => o.answer)).slice(0, 3)
      const answers = shuffleArray([
        { answer: item.answer, isCorrect: true },
        ...others.map((a) => ({ answer: a, isCorrect: false })),
      ])
      const round = buildAppleSnakeRound(item.prompt, answers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setSnake(built[0]?.startSnake ?? [])
    setDir(built[0]?.startDir ?? 'right')
    setLives(APPLE_SNAKE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(APPLE_SNAKE_ROUND_SECONDS)
    setConsumed(new Set())
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setRespawning(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(APPLE_SNAKE_LIVES)
  const correctRef = useRef(0)
  const snakeRef = useRef<AppleSnakePos[]>([])
  const dirRef = useRef<AppleSnakeDir>('right')
  const consumedRef = useRef<Set<string>>(new Set())
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
  useEffect(() => { snakeRef.current = snake })
  useEffect(() => { dirRef.current = dir })
  useEffect(() => { consumedRef.current = consumed })
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

  // Finish sound once: win on Apple Snake Complete, lose on game over.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

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
    const next = rounds[from + 1]
    setCurrent(from + 1)
    setSnake(next.startSnake)
    setDir(next.startDir)
    setTimeLeft(APPLE_SNAKE_ROUND_SECONDS)
    setConsumed(new Set())
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

  /** Bumped a wall or bit its own tail: -1 life, snake respawns, round continues. */
  const handleBump = useCallback((kind: 'wall' | 'self') => {
    if (advancingRef.current || respawningRef.current) return
    respawningRef.current = true
    setRespawning(true)
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setFeedback({
      type: 'wrong',
      msg: kind === 'wall'
        ? 'Bumped into the wall! You lost a life.'
        : 'You bit your own tail! You lost a life.',
    })
    if (livesRef.current <= 0) {
      advancingRef.current = true
      const from = current
      setTimeout(() => advanceFrom(from), 1400)
      return
    }
    const round = rounds[current]
    setTimeout(() => {
      if (!round) return
      setSnake(round.startSnake)
      setDir(round.startDir)
      setFeedback(null)
      setRespawning(false)
      respawningRef.current = false
    }, 1200)
  }, [current, rounds, advanceFrom])

  // Round timer: ticks only while the shell is playing, the
  // How-to-Play page is closed, and the game is not finished.
  // Pause and How-to-Play both freeze it; it never drains away
  // while the player cannot steer.
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
    if (timeLeft !== APPLE_SNAKE_WARNING_SECONDS || shellStatus !== 'playing' || showHowto || finished) return
    if (warnedRoundRef.current === current) return
    warnedRoundRef.current = current
    playEduSound('timerWarning', readInteractiveSoundOn())
  }, [timeLeft, shellStatus, showHowto, finished, current])

  // The snake moves on its own: one step every 250 ms, only while
  // the shell is playing, How-to-Play is closed, the game is not
  // finished, and nobody is respawning or advancing.
  const roundsRef = useRef(rounds)
  useEffect(() => { roundsRef.current = rounds }, [rounds])
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => {
      if (advancingRef.current || respawningRef.current) return
      const round = roundsRef.current[currentRef.current]
      if (!round) return
      const step = stepSnake(snakeRef.current, dirRef.current, false)
      if (step.kind !== 'moved') {
        handleBump(step.kind)
        return
      }
      const head = step.snake[0]
      const apple = appleSnakeAppleAt(round.apples, head)
      if (apple && !consumedRef.current.has(`${head.row},${head.col}`)) {
        if (apple.isCorrect) {
          advancingRef.current = true
          const grown = stepSnake(snakeRef.current, dirRef.current, true)
          if (grown.kind === 'moved') {
            setSnake(grown.snake)
            snakeRef.current = grown.snake
          } else {
            setSnake(step.snake)
            snakeRef.current = step.snake
          }
          setScore((s) => s + SCORE_PER_CORRECT)
          scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
          setCorrectCount((c) => c + 1)
          correctRef.current = correctRef.current + 1
          setFeedback({ type: 'correct', msg: `Correct! +${SCORE_PER_CORRECT} points — the snake grows!` })
          const from = currentRef.current
          setTimeout(() => advanceFrom(from), 1200)
        } else {
          setLives((l) => Math.max(0, l - 1))
          livesRef.current = Math.max(0, livesRef.current - 1)
          const shortened = shrinkSnake(step.snake, APPLE_SNAKE_SHRINK_ON_WRONG)
          setSnake(shortened)
          snakeRef.current = shortened
          setConsumed((c) => new Set(c).add(`${head.row},${head.col}`))
          setFeedback({ type: 'wrong', msg: 'Wrong apple! You lost a life and the snake shrank — keep hunting for the right answer.' })
          if (livesRef.current <= 0) {
            advancingRef.current = true
            const from = currentRef.current
            setTimeout(() => advanceFrom(from), 1400)
          }
        }
        return
      }
      setSnake(step.snake)
      snakeRef.current = step.snake
    }, APPLE_SNAKE_STEP_MS)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, handleBump, advanceFrom])

  function startPlaying() {
    playEduSound('click', readInteractiveSoundOn())
    completedRef.current = false
    setShowHowto(false)
    setStarted(true)
  }

  function steer(wanted: AppleSnakeDir) {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || respawningRef.current) return
    const next = appleSnakeNextDir(dirRef.current, wanted)
    dirRef.current = next
    setDir(next)
  }

  // Keyboard: arrows + WASD steer the snake. Guarded by the same rules as the pad.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || respawningRef.current) return
      const map: Record<string, AppleSnakeDir> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
        W: 'up', S: 'down', A: 'left', D: 'right',
      }
      const dir = map[e.key]
      if (!dir) return
      e.preventDefault()
      steer(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // steer reads refs; re-subscribe on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellStatus, showHowto, finished, current, dir, rounds, respawning])

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    const first = rounds[0]
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setSnake(first?.startSnake ?? [])
    setDir(first?.startDir ?? 'right')
    setLives(APPLE_SNAKE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(APPLE_SNAKE_ROUND_SECONDS)
    setConsumed(new Set())
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
        This game has no questions to play in the garden yet.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🍎</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Apple Snake</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Eat the right apple, grow the snake, beat every garden.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each garden asks one question. Red apples in the garden show answers. Your snake moves on its own — steer it to the apple with the correct answer and eat it. The longer your snake grows, the better you are doing. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> each garden you finish by eating the right apple earns {SCORE_PER_CORRECT} points, and your snake grows by one segment. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'garden' : 'gardens'}). Wrong apples, wall bumps, tail bites, and time-ups earn no points.</p>
          <p><strong>Objective:</strong> eat the correct apple in every garden without running out of lives — and grow the longest snake you can.</p>
          <p><strong>Controls:</strong> arrow keys or WASD on a keyboard, or the on-screen arrow pad below the garden on a phone or tablet. The snake keeps moving on its own — you only steer it. It cannot turn straight back on itself, so plan your turns. The garden edge is a wall, and your own tail is dangerous too.</p>
          <p><strong>Lives:</strong> you start with {APPLE_SNAKE_LIVES} lives. Eating a wrong apple costs 1 life and shortens your snake by 2 segments, and that apple is used up so it can never cost a second life. Bumping a wall or biting your own tail costs 1 life, and your snake starts that garden again. A garden you run out of time on also costs 1 life.</p>
          <p><strong>Timer:</strong> {APPLE_SNAKE_ROUND_SECONDS} seconds per garden. You hear one warning when 5 seconds are left. The timer pauses when you pause the game or re-read this page — and the snake waits too.</p>
          <p><strong>Rounds:</strong> one garden per question, in shuffled order.</p>
          <p><strong>How you win and finish:</strong> finish every garden with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many gardens you got right, and how many lives are left.</p>
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
          {won ? 'Apple Snake Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} gardens correct
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

  const snakeSet = new Map(snake.map((p, i) => [`${p.row},${p.col}`, i]))
  const padBtn: CSSProperties = {
    minWidth: '3rem', minHeight: '3rem', borderRadius: 'var(--radius)',
    border: '2px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text-primary)', fontSize: '1.4rem', cursor: 'pointer',
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, APPLE_SNAKE_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite" style={{ color: timeLeft <= APPLE_SNAKE_WARNING_SECONDS ? 'var(--color-danger)' : undefined }}>⏱ {timeLeft}s</span>
        <span aria-live="polite">Garden {current + 1} of {rounds.length}</span>
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
          Steer the snake to the apple with the right answer — it grows with every correct bite.
        </p>
      </div>

      {/* The garden: 12x12 grid, apples carry answers, the snake moves on its own. */}
      <motion.div animate={{ x: feedback?.type === 'wrong' ? [0, -10, 10, -6, 6, 0] : 0 }} transition={{ duration: 0.4 }}>
        <div
          role="grid"
          aria-label={`Garden ${current + 1} of ${rounds.length} for question: ${round.prompt}`}
          style={{
            display: 'grid', gridTemplateColumns: `repeat(${APPLE_SNAKE_COLS}, 1fr)`, gap: '2px',
            background: 'var(--color-border)', border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxWidth: '480px', margin: '0 auto',
          }}
        >
          {Array.from({ length: APPLE_SNAKE_ROWS }, (_, r) =>
            Array.from({ length: APPLE_SNAKE_COLS }, (_, c) => {
              const key = `${r},${c}`
              const segIndex = snakeSet.get(key)
              const isHead = segIndex === 0
              const isTail = segIndex !== undefined && segIndex === snake.length - 1
              const apple = round.apples.find((a) => a.row === r && a.col === c)
              const isConsumed = consumed.has(key)
              const justAteCorrect = isHead && apple?.isCorrect && feedback?.type === 'correct'
              const justAteWrong = isHead && apple && !apple.isCorrect && feedback?.type === 'wrong'
              return (
                <div
                  key={key}
                  role="gridcell"
                  aria-label={
                    isHead ? 'The snake head is here' :
                    segIndex !== undefined ? 'The snake body is here' :
                    apple ? (isConsumed ? 'Used wrong apple' : `Apple: ${apple.answer}`) : 'Grass'
                  }
                  style={{
                    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center', padding: '1px', fontSize: '0.6rem', lineHeight: 1.1,
                    overflow: 'hidden', wordBreak: 'break-word',
                    background: justAteCorrect ? 'var(--color-success)'
                      : justAteWrong ? 'var(--color-danger)'
                      : (r + c) % 2 === 0 ? '#dcfce7' : '#bbf7d0',
                  }}
                >
                  {isHead ? (
                    <span style={{ display: 'block', width: '88%', height: '88%' }}><SnakeHeadArt /></span>
                  ) : segIndex !== undefined ? (
                    <span
                      style={{
                        display: 'block',
                        width: isTail ? '62%' : '82%', height: isTail ? '62%' : '82%',
                        borderRadius: '50%',
                        background: segIndex % 2 === 0 ? '#22c55e' : '#16a34a',
                      }}
                    />
                  ) : apple && !isConsumed ? (
                    <AppleArt label={apple.answer} />
                  ) : apple && isConsumed ? (
                    <span style={{ color: 'var(--color-text-muted)' }}>✗</span>
                  ) : null}
                </div>
              )
            }),
          )}
        </div>
      </motion.div>

      {/* On-screen arrow pad: tap targets for phones/tablets. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 3rem)', gap: '0.4rem', justifyContent: 'center', marginTop: '1rem' }} aria-label="Steer the snake">
        <span />
        <button type="button" aria-label="Steer up" onClick={() => steer('up')} style={padBtn}>↑</button>
        <span />
        <button type="button" aria-label="Steer left" onClick={() => steer('left')} style={padBtn}>←</button>
        <button type="button" aria-label="Steer down" onClick={() => steer('down')} style={padBtn}>↓</button>
        <button type="button" aria-label="Steer right" onClick={() => steer('right')} style={padBtn}>→</button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Arrow keys or WASD work too. The snake moves on its own — just steer it!
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

export default function AppleSnakeActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Apple Snake" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <AppleSnakeGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
