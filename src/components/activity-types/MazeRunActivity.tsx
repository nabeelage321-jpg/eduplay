'use client'

import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, SCORE_PER_CORRECT, shuffleArray } from './shared'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import type { ActivityItem } from '@/types'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  MAZE_RUN_LIVES,
  MAZE_RUN_ROUND_SECONDS,
  MAZE_RUN_WARNING_SECONDS,
  buildMazeRound,
  movePlayer,
  type MazeDir,
  type MazePos,
  type MazeRound,
} from '@/lib/maze-run'

/**
 * Maze Run — EduPlay's own maze game (type 33, first of the 8
 * remaining types toward 40).
 *
 * NOT a copy of any rival: no rival art, wording, or layout. The
 * maze is EduPlay's own fixed 9x9 wall layout, the player token
 * is EduPlay's star, and sounds are the shared interactive Web
 * Audio system (synthesized, no assets). Sound is ON by default
 * for this game; the in-player toggle mutes it in one tap.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = correct answer tile. Distractors are the OTHER items'
 * answers (up to 3, shuffled), exactly like Quiz builds options.
 * No new save path was needed: the save route already stores
 * prompt/answer for every type, and the adapter passes creator
 * rows through untouched.
 *
 * Rules (exact):
 * - 5 lives. 10 points per correct round, score out of 10 x rounds.
 * - One round (one maze) per question, rounds shuffled once per
 *   item content. The shown question sits above the maze.
 * - Move with arrow keys / WASD on desktop, or the on-screen
 *   arrow pad on mobile. Walls block movement (no penalty).
 * - Step on the CORRECT answer tile: +10, correct sound, score
 *   pop, then the next maze. Step on a WRONG answer tile: -1
 *   life, wrong sound, shake/red, and that tile is consumed
 *   (it becomes floor with a faint mark) so it can never cost
 *   a second life. The round continues until the correct tile
 *   is found.
 * - 60 seconds per round. At 5 seconds left, one timer-warning
 *   sound. Time up: -1 life, "Time's up!", round skipped.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Maze Complete!"). onComplete fires exactly once
 *   with the real score plus correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the round timer and
 *   movement (the shell overlay covers the maze, and the timer
 *   effect + key/D-pad handlers all require status 'playing').
 *   Reading How to Play mid-game also freezes the timer.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the timer, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE (2026-11-07 universal pass) — the maze is
 *   generated from the game's own items, one maze per question,
 *   tiles are the correct answer plus wrong answers borrowed from
 *   the other items, so any plain question list with at least two
 *   distinct answers plays. A lone question with nothing to borrow
 *   keeps the plain message — see convert.ts. Print: NOT printable
 *   (needs its maze) — see print-worksheet.ts. Sitemap type list
 *   stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface MazeRunGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

function MazeRunGame({ items, locale, onComplete, onProgress }: MazeRunGameProps) {
  const [rounds, setRounds] = useState<MazeRound[]>([])
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [pos, setPos] = useState<MazePos>({ row: 0, col: 0 })
  const [lives, setLives] = useState(MAZE_RUN_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(MAZE_RUN_ROUND_SECONDS)
  const [consumed, setConsumed] = useState<Set<string>>(new Set())
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
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    const usable = items.filter((i) => i.prompt && i.answer)
    const shuffled = shuffleArray(usable)
    const built: MazeRound[] = []
    for (const item of shuffled) {
      const others = shuffleArray(usable.filter((o) => o !== item).map((o) => o.answer)).slice(0, 3)
      const answers = shuffleArray([
        { answer: item.answer, isCorrect: true },
        ...others.map((a) => ({ answer: a, isCorrect: false })),
      ])
      const round = buildMazeRound(item.prompt, answers)
      if (round) built.push(round)
    }
    setRounds(built)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setPos(built[0]?.start ?? { row: 0, col: 0 })
    setLives(MAZE_RUN_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(MAZE_RUN_ROUND_SECONDS)
    setConsumed(new Set())
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(MAZE_RUN_LIVES)
  const correctRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  const warnedRoundRef = useRef(-1)
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

  // Finish sound once: win on Maze Complete, lose on game over.
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
    setTimeLeft(MAZE_RUN_ROUND_SECONDS)
    setConsumed(new Set())
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
    if (timeLeft !== MAZE_RUN_WARNING_SECONDS || shellStatus !== 'playing' || showHowto || finished) return
    if (warnedRoundRef.current === current) return
    warnedRoundRef.current = current
    playEduSound('timerWarning', readInteractiveSoundOn())
  }, [timeLeft, shellStatus, showHowto, finished, current])

  function startPlaying() {
    playEduSound('click', readInteractiveSoundOn())
    completedRef.current = false
    setShowHowto(false)
    setStarted(true)
  }

  function handleMove(dir: MazeDir) {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current) return
    const round = rounds[current]
    if (!round) return
    const next = movePlayer(round.walls, pos, dir)
    if (next.row === pos.row && next.col === pos.col) return
    playEduSound('click', readInteractiveSoundOn())
    setPos(next)
    const tile = round.tiles.find((t) => t.row === next.row && t.col === next.col)
    if (!tile || consumed.has(`${next.row},${next.col}`)) return
    if (tile.isCorrect) {
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
      setFeedback({ type: 'wrong', msg: 'Wrong tile! You lost a life — keep hunting for the right answer.' })
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
      if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current) return
      const map: Record<string, MazeDir> = {
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
  }, [shellStatus, showHowto, finished, current, pos, consumed, rounds])

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    const first = rounds[0]
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setPos(first?.start ?? { row: 0, col: 0 })
    setLives(MAZE_RUN_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(MAZE_RUN_ROUND_SECONDS)
    setConsumed(new Set())
    setFeedback(null)
    setFinished(false)
    setWon(false)
    completedRef.current = false
    advancingRef.current = false
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🌀</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Maze Run</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Run the maze, step on the right answer, beat every maze.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each maze asks one question. Your star starts at the top-left. Move through the maze and step on the tile with the correct answer. Other tiles show wrong answers — avoid them.</p>
          <p><strong>How scores are given:</strong> each maze you finish by finding the right tile earns {SCORE_PER_CORRECT} points. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'maze' : 'mazes'}). Wrong tiles and time-ups earn no points.</p>
          <p><strong>Objective:</strong> finish every maze by stepping on its correct answer tile, without running out of lives.</p>
          <p><strong>Controls:</strong> arrow keys or WASD on a keyboard, or the on-screen arrow pad below the maze on a phone or tablet. Dark squares are walls — you cannot walk through them, and bumping one costs nothing.</p>
          <p><strong>Lives:</strong> you start with {MAZE_RUN_LIVES} lives. Stepping on a wrong tile costs 1 life, and that tile is used up so it can never cost a second life. A maze you run out of time on also costs 1 life.</p>
          <p><strong>Timer:</strong> {MAZE_RUN_ROUND_SECONDS} seconds per maze. You hear one warning when 5 seconds are left. The timer pauses when you pause the game or re-read this page.</p>
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
          {won ? 'Maze Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          Score: {score} / {rounds.length * SCORE_PER_CORRECT}
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
        <motion.span key={score} initial={{ scale: 1.35 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }} style={{ display: 'inline-block' }} aria-live="polite">Score: <strong style={{ color: 'var(--color-primary)' }}>{score} / {rounds.length * SCORE_PER_CORRECT}</strong></motion.span>
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, MAZE_RUN_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite" style={{ color: timeLeft <= MAZE_RUN_WARNING_SECONDS ? 'var(--color-danger)' : undefined }}>⏱ {timeLeft}s</span>
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
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
          Move the star to the correct answer tile.
        </p>
      </div>

      {/* The maze: 9x9 grid, walls dark, tiles labelled, star = player. */}
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
              const tile = round.tiles.find((t) => t.row === r && t.col === c)
              const isConsumed = consumed.has(`${r},${c}`)
              const justSteppedCorrect = isPlayer && tile?.isCorrect && feedback?.type === 'correct'
              const justSteppedWrong = isPlayer && tile && !tile.isCorrect && feedback?.type === 'wrong'
              return (
                <div
                  key={`${r}-${c}`}
                  role="gridcell"
                  aria-label={
                    isPlayer ? 'You are here' :
                    isWall ? 'Wall' :
                    tile ? (isConsumed ? 'Used wrong tile' : `Answer tile: ${tile.answer}`) : 'Open path'
                  }
                  style={{
                    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center', padding: '1px', fontSize: '0.62rem', lineHeight: 1.1,
                    overflow: 'hidden', wordBreak: 'break-word',
                    background: isWall ? 'var(--color-text-muted)'
                      : justSteppedCorrect ? 'var(--color-success)'
                      : justSteppedWrong ? 'var(--color-danger)'
                      : tile && !isConsumed ? 'var(--color-primary)'
                      : 'var(--color-surface)',
                    color: isWall ? 'var(--color-surface)'
                      : tile && !isConsumed ? '#fff'
                      : justSteppedCorrect || justSteppedWrong ? '#fff'
                      : isConsumed ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    fontWeight: tile && !isConsumed ? 700 : 400,
                  }}
                >
                  {isPlayer ? '⭐' : isWall ? '' : tile ? (isConsumed ? '✗' : tile.answer) : ''}
                </div>
              )
            }),
          )}
        </div>
      </motion.div>

      {/* On-screen arrow pad: tap targets for phones/tablets. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 3rem)', gap: '0.4rem', justifyContent: 'center', marginTop: '1rem' }} aria-label="Move the star">
        <span />
        <button type="button" aria-label="Move up" onClick={() => handleMove('up')} style={padBtn}>↑</button>
        <span />
        <button type="button" aria-label="Move left" onClick={() => handleMove('left')} style={padBtn}>←</button>
        <button type="button" aria-label="Move down" onClick={() => handleMove('down')} style={padBtn}>↓</button>
        <button type="button" aria-label="Move right" onClick={() => handleMove('right')} style={padBtn}>→</button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Arrow keys or WASD work too.
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

export default function MazeRunActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Maze Run" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <MazeRunGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
