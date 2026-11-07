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
  MAZE_CHASE_LIVES,
  MAZE_CHASE_ROUND_SECONDS,
  MAZE_CHASE_WARNING_SECONDS,
  MAZE_CHASE_GHOST_STEP_MS,
  buildMazeChaseRound,
  moveChaser,
  ghostNextStep,
  type MazeChaseDir,
  type MazeChasePos,
  type MazeChaseRound,
} from '@/lib/maze-chase'

/**
 * Maze Chase — EduPlay's own maze-chase game (type 41).
 *
 * Pac-Man-STYLE mechanic only: the kid steers our own chaser
 * through a maze to eat the pellet with the correct answer, while
 * our own ghost hunts the chaser down. No Pac-Man name, no
 * Pac-Man art: the chaser is a full teal circle with eyes and a
 * smile (never a yellow wedge), the ghost is a lilac sheet ghost
 * drawn in SVG here, and the maze is EduPlay's own layout.
 * Sounds are the shared interactive Web Audio system
 * (synthesized, no assets). Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = correct answer pellet. Distractors are the OTHER
 * items' answers (up to 3, shuffled), exactly like Quiz builds
 * options. If a question carries its own picture (imageUrl), the
 * picture shows above the question — it is part of the question,
 * never decoration, never invented. No new save path was needed:
 * the save route already stores prompt/answer for every type, and
 * the adapter passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per correct round, score out of 10 x rounds.
 * - One round (one maze) per question, rounds shuffled once per
 *   item content. The shown question sits above the maze.
 * - Move with arrow keys / WASD on desktop, or the on-screen
 *   arrow pad on mobile. Walls block movement (no penalty).
 * - Steer the chaser onto the CORRECT answer pellet: +10, correct
 *   sound, score pop, then the next maze. Eat a WRONG pellet: -1
 *   life, wrong sound, shake/red, and that pellet is consumed
 *   (it becomes floor with a faint mark) so it can never cost
 *   a second life. The round continues until the correct pellet
 *   is eaten. All pellets look exactly the same until eaten — no
 *   colour ever gives the answer away.
 * - The ghost steps toward the chaser every 800 ms (shortest path).
 *   Caught (either piece moves onto the other's cell): -1 life,
 *   both pieces respawn at their starts, round continues.
 * - 45 seconds per round. At 5 seconds left, one timer-warning
 *   sound. Time up: -1 life, "Time's up!", round skipped.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Maze Chase Complete!"). onComplete fires exactly once
 *   with the real score plus correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the round timer, the
 *   ghost, and movement (the shell overlay covers the maze, and
 *   the timer effect + ghost interval + key/D-pad handlers all
 *   require status 'playing'). Reading How to Play mid-game also
 *   freezes the timer and the ghost.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the timer, the ghost, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the maze is generated from the game's
 *   own items, one maze per question, pellets are the correct
 *   answer plus wrong answers borrowed from the other items, so
 *   any plain question list with at least two distinct answers
 *   plays. A lone question with nothing to borrow keeps the plain
 *   message — see convert.ts. Print: NOT printable (needs its
 *   maze and moving ghost) — see print-worksheet.ts. Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface MazeChaseGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Our own chaser: a full teal circle with eyes and a smile — never a yellow wedge. */
function ChaserArt() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#0ea5a4" />
      <circle cx="9" cy="10" r="1.8" fill="#fff" />
      <circle cx="15" cy="10" r="1.8" fill="#fff" />
      <circle cx="9.6" cy="10.6" r="0.9" fill="#134e4a" />
      <circle cx="15.6" cy="10.6" r="0.9" fill="#134e4a" />
      <path d="M8 15 Q12 18.5 16 15" stroke="#fff" fill="none" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** Our own ghost: a lilac sheet ghost drawn in SVG — not any rival's ghost. */
function GhostArt() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path
        d="M12 2 C7 2 4 6 4 11 V21 L7 18.5 L10 21 L12 18.5 L14 21 L17 18.5 L20 21 V11 C20 6 17 2 12 2 Z"
        fill="#b79cff"
      />
      <circle cx="9" cy="11" r="1.8" fill="#fff" />
      <circle cx="15" cy="11" r="1.8" fill="#fff" />
      <circle cx="9.6" cy="11.6" r="0.9" fill="#1f2937" />
      <circle cx="15.6" cy="11.6" r="0.9" fill="#1f2937" />
    </svg>
  )
}

function MazeChaseGame({ items, locale, onComplete, onProgress }: MazeChaseGameProps) {
  const [rounds, setRounds] = useState<MazeChaseRound[]>([])
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [pos, setPos] = useState<MazeChasePos>({ row: 0, col: 0 })
  const [ghost, setGhost] = useState<MazeChasePos>({ row: 8, col: 8 })
  const [lives, setLives] = useState(MAZE_CHASE_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(MAZE_CHASE_ROUND_SECONDS)
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
    const built: MazeChaseRound[] = []
    for (const item of shuffled) {
      const others = shuffleArray(usable.filter((o) => o !== item).map((o) => o.answer)).slice(0, 3)
      const answers = shuffleArray([
        { answer: item.answer, isCorrect: true },
        ...others.map((a) => ({ answer: a, isCorrect: false })),
      ])
      const round = buildMazeChaseRound(item.prompt, answers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setPos(built[0]?.start ?? { row: 0, col: 0 })
    setGhost(built[0]?.ghostStart ?? { row: 8, col: 8 })
    setLives(MAZE_CHASE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(MAZE_CHASE_ROUND_SECONDS)
    setConsumed(new Set())
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setRespawning(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(MAZE_CHASE_LIVES)
  const correctRef = useRef(0)
  const posRef = useRef<MazeChasePos>({ row: 0, col: 0 })
  const ghostRef = useRef<MazeChasePos>({ row: 8, col: 8 })
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
  useEffect(() => { posRef.current = pos })
  useEffect(() => { ghostRef.current = ghost })
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

  // Finish sound once: win on Maze Chase Complete, lose on game over.
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
    setPos(next.start)
    setGhost(next.ghostStart)
    setTimeLeft(MAZE_CHASE_ROUND_SECONDS)
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

  /** Caught by the ghost: -1 life, both pieces respawn, round continues. */
  const handleCaught = useCallback(() => {
    if (advancingRef.current || respawningRef.current) return
    respawningRef.current = true
    setRespawning(true)
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setFeedback({ type: 'wrong', msg: 'Caught by the ghost! You lost a life.' })
    if (livesRef.current <= 0) {
      advancingRef.current = true
      const from = current
      setTimeout(() => advanceFrom(from), 1400)
      return
    }
    const round = rounds[current]
    setTimeout(() => {
      if (!round) return
      setPos(round.start)
      setGhost(round.ghostStart)
      setFeedback(null)
      setRespawning(false)
      respawningRef.current = false
    }, 1200)
  }, [current, rounds, advanceFrom])

  // Round timer: ticks only while the shell is playing, the
  // How-to-Play page is closed, and the game is not finished.
  // Pause and How-to-Play both freeze it; it never drains away
  // while the player cannot move.
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
    if (timeLeft !== MAZE_CHASE_WARNING_SECONDS || shellStatus !== 'playing' || showHowto || finished) return
    if (warnedRoundRef.current === current) return
    warnedRoundRef.current = current
    playEduSound('timerWarning', readInteractiveSoundOn())
  }, [timeLeft, shellStatus, showHowto, finished, current])

  // Ghost hunt: one step toward the chaser every 800 ms, only
  // while the shell is playing, How-to-Play is closed, the game
  // is not finished, and nobody is respawning. Catch = ghost
  // steps onto the chaser.
  const roundsRef = useRef(rounds)
  useEffect(() => { roundsRef.current = rounds }, [rounds])
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => {
      if (advancingRef.current || respawningRef.current) return
      const round = roundsRef.current[currentRef.current]
      if (!round) return
      const next = ghostNextStep(round.walls, ghostRef.current, posRef.current)
      setGhost(next)
      ghostRef.current = next
      if (next.row === posRef.current.row && next.col === posRef.current.col) {
        handleCaught()
      }
    }, MAZE_CHASE_GHOST_STEP_MS)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, handleCaught])

  function startPlaying() {
    playEduSound('click', readInteractiveSoundOn())
    completedRef.current = false
    setShowHowto(false)
    setStarted(true)
  }

  function handleMove(dir: MazeChaseDir) {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || respawningRef.current) return
    const round = rounds[current]
    if (!round) return
    const next = moveChaser(round.walls, pos, dir)
    if (next.row === pos.row && next.col === pos.col) return
    playEduSound('click', readInteractiveSoundOn())
    setPos(next)
    posRef.current = next
    // Ran into the ghost: caught.
    if (next.row === ghostRef.current.row && next.col === ghostRef.current.col) {
      handleCaught()
      return
    }
    const pellet = round.pellets.find((p) => p.row === next.row && p.col === next.col)
    if (!pellet || consumed.has(`${next.row},${next.col}`)) return
    if (pellet.isCorrect) {
      advancingRef.current = true
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      setFeedback({ type: 'correct', msg: `Correct! +${SCORE_PER_CORRECT} points.` })
      const from = current
      setTimeout(() => advanceFrom(from), 1200)
    } else {
      setLives((l) => Math.max(0, l - 1))
      livesRef.current = Math.max(0, livesRef.current - 1)
      setConsumed((c) => new Set(c).add(`${next.row},${next.col}`))
      setFeedback({ type: 'wrong', msg: 'Wrong pellet! You lost a life — keep hunting for the right answer.' })
      if (livesRef.current <= 0) {
        advancingRef.current = true
        const from = current
        setTimeout(() => advanceFrom(from), 1400)
      }
    }
  }

  // Keyboard: arrows + WASD. Guarded by the same rules as the pad.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || respawningRef.current) return
      const map: Record<string, MazeChaseDir> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
        W: 'up', S: 'down', A: 'left', D: 'right',
      }
      const dir = map[e.key]
      if (!dir) return
      e.preventDefault()
      handleMove(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // handleMove reads current render state; re-subscribe on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellStatus, showHowto, finished, current, pos, ghost, consumed, rounds, respawning])

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    const first = rounds[0]
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setPos(first?.start ?? { row: 0, col: 0 })
    setGhost(first?.ghostStart ?? { row: 8, col: 8 })
    setLives(MAZE_CHASE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(MAZE_CHASE_ROUND_SECONDS)
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
        This game has no questions to play in the maze yet.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">👻</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Maze Chase</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Eat the right answer, dodge the ghost, beat every maze.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each maze asks one question. Round balls in the maze show answers. Steer your chaser to the ball with the correct answer and eat it. The ghost hunts you the whole time — do not let it touch you. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> each maze you finish by eating the right ball earns {SCORE_PER_CORRECT} points. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'maze' : 'mazes'}). Wrong balls, ghost catches, and time-ups earn no points.</p>
          <p><strong>Objective:</strong> eat the correct ball in every maze without running out of lives — and without the ghost catching you.</p>
          <p><strong>Controls:</strong> arrow keys or WASD on a keyboard, or the on-screen arrow pad below the maze on a phone or tablet. Dark squares are walls — you cannot walk through them, and bumping one costs nothing. The ghost moves on its own, one step at a time, always toward you.</p>
          <p><strong>Lives:</strong> you start with {MAZE_CHASE_LIVES} lives. Eating a wrong ball costs 1 life, and that ball is used up so it can never cost a second life. Being caught by the ghost costs 1 life, and you both start that maze again from your corners. A maze you run out of time on also costs 1 life.</p>
          <p><strong>Timer:</strong> {MAZE_CHASE_ROUND_SECONDS} seconds per maze. You hear one warning when 5 seconds are left. The timer pauses when you pause the game or re-read this page — and the ghost waits too.</p>
          <p><strong>Rounds:</strong> one maze per question, in shuffled order.</p>
          <p><strong>How you win and finish:</strong> finish every maze with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many mazes you got right, and how many lives are left.</p>
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
          {won ? 'Maze Chase Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} mazes correct
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

  const padBtn: CSSProperties = {
    minWidth: '3rem', minHeight: '3rem', borderRadius: 'var(--radius)',
    border: '2px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text-primary)', fontSize: '1.4rem', cursor: 'pointer',
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, MAZE_CHASE_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite" style={{ color: timeLeft <= MAZE_CHASE_WARNING_SECONDS ? 'var(--color-danger)' : undefined }}>⏱ {timeLeft}s</span>
        <span aria-live="polite">Maze {current + 1} of {rounds.length}</span>
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
          Eat the ball with the right answer — dodge the ghost.
        </p>
      </div>

      {/* The maze: 9x9 grid, walls dark, answer balls round, chaser + ghost on top. */}
      <motion.div animate={{ x: feedback?.type === 'wrong' ? [0, -10, 10, -6, 6, 0] : 0 }} transition={{ duration: 0.4 }}>
        <div
          role="grid"
          aria-label={`Maze ${current + 1} of ${rounds.length} for question: ${round.prompt}`}
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '2px',
            background: 'var(--color-border)', border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxWidth: '480px', margin: '0 auto',
          }}
        >
          {round.walls.map((rowArr, r) =>
            rowArr.map((isWall, c) => {
              const isPlayer = pos.row === r && pos.col === c
              const isGhost = ghost.row === r && ghost.col === c
              const pellet = round.pellets.find((p) => p.row === r && p.col === c)
              const isConsumed = consumed.has(`${r},${c}`)
              const justAteCorrect = isPlayer && pellet?.isCorrect && feedback?.type === 'correct'
              const justAteWrong = isPlayer && pellet && !pellet.isCorrect && feedback?.type === 'wrong'
              return (
                <div
                  key={`${r}-${c}`}
                  role="gridcell"
                  aria-label={
                    isPlayer ? 'You are here' :
                    isGhost ? 'The ghost is here' :
                    isWall ? 'Wall' :
                    pellet ? (isConsumed ? 'Used wrong ball' : `Answer ball: ${pellet.answer}`) : 'Open path'
                  }
                  style={{
                    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center', padding: '1px', fontSize: '0.62rem', lineHeight: 1.1,
                    overflow: 'hidden', wordBreak: 'break-word',
                    background: isWall ? 'var(--color-text-muted)'
                      : justAteCorrect ? 'var(--color-success)'
                      : justAteWrong ? 'var(--color-danger)'
                      : 'var(--color-surface)',
                  }}
                >
                  {isPlayer ? (
                    <span style={{ display: 'block', width: '80%', height: '80%' }}><ChaserArt /></span>
                  ) : isGhost ? (
                    <span style={{ display: 'block', width: '85%', height: '85%' }}><GhostArt /></span>
                  ) : pellet && !isConsumed ? (
                    <span
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '92%', height: '92%', borderRadius: '50%',
                        background: 'var(--color-primary)', color: '#fff', fontWeight: 700,
                        padding: '1px', fontSize: '0.62rem', lineHeight: 1.1, overflow: 'hidden',
                        wordBreak: 'break-word', textAlign: 'center',
                      }}
                    >
                      {pellet.answer}
                    </span>
                  ) : pellet && isConsumed ? (
                    <span style={{ color: 'var(--color-text-muted)' }}>✗</span>
                  ) : null}
                </div>
              )
            }),
          )}
        </div>
      </motion.div>

      {/* On-screen arrow pad: tap targets for phones/tablets. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 3rem)', gap: '0.4rem', justifyContent: 'center', marginTop: '1rem' }} aria-label="Move the chaser">
        <span />
        <button type="button" aria-label="Move up" onClick={() => handleMove('up')} style={padBtn}>↑</button>
        <span />
        <button type="button" aria-label="Move left" onClick={() => handleMove('left')} style={padBtn}>←</button>
        <button type="button" aria-label="Move down" onClick={() => handleMove('down')} style={padBtn}>↓</button>
        <button type="button" aria-label="Move right" onClick={() => handleMove('right')} style={padBtn}>→</button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Arrow keys or WASD work too. The ghost moves on its own — keep away!
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

export default function MazeChaseActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Maze Chase" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <MazeChaseGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
