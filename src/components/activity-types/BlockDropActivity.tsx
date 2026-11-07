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
  BLOCK_DROP_LIVES,
  BLOCK_DROP_MAX_ROUNDS,
  BLOCK_DROP_TICK_MS,
  BLOCK_DROP_BOARD_ROWS,
  newBlockDropGame,
  movePiece,
  rotatePiece,
  dropOne,
  hardDrop,
  buildBlockDropRound,
  type BlockDropState,
  type BlockDropRound,
  type BlockDropMoveDirection,
} from '@/lib/block-drop'

/**
 * Block Drop — EduPlay's own Tetris-STYLE falling-block game
 * (type 50).
 *
 * Tetris-STYLE mechanic only: letter or number blocks fall into a
 * well, and the kid moves, rotates, and drops them to complete a
 * row. No Tetris name, no tetromino branding, no Tetris Company
 * art: the blocks are plain coloured squares with a letter or a
 * digit written on them — all drawn here, nothing copied.
 * Sounds are the shared interactive Web Audio system
 * (synthesized, no assets). Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. Background music is
 * the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the target. Word mode: a letters-only answer of 3–6
 * letters is the word the row must spell. Sum mode: a whole-number
 * answer of 0–27 is the number the row's three digits must add up
 * to. Each round's falling blocks are the target characters (each
 * twice, so one wrong row never ends the round) plus up to 4
 * distractor characters borrowed from the game's other items.
 * No new save path was needed: the save route already stores
 * prompt/answer for every type, and the adapter passes creator
 * rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per completed row (one round per question,
 *   up to 10 rounds, shuffled once per item content). Score out
 *   of 10 x rounds.
 * - The well is as wide as the target: the word length in word
 *   mode (3–6 columns), 3 columns in sum mode; 8 rows high. The
 *   target is shown above the well — the word to spell, or the sum
 *   the row must add up to. A piece falls one row every 700ms.
 * - Pieces are 1–3 blocks: a single block, a horizontal domino,
 *   a horizontal tromino, or an L-tromino. Left/right moves the
 *   falling piece, up rotates it 90 degrees clockwise (with a
 *   one-column wall-kick), down soft-drops it one row, Space
 *   hard-drops it straight to the floor.
 * - When a piece can fall no further it locks into the well. A
 *   full row that spells the target word left-to-right (word mode)
 *   or adds up to the target sum (sum mode) clears — +10, round
 *   won. A full row that does NOT match stays exactly where it is
 *   and piles up.
 * - If the stack piles so high that the next piece cannot spawn,
 *   the well has topped out: -1 life, round lost, the board is
 *   cleared for the next round. If the bag of blocks runs out
 *   without a cleared row, the round ends with no points and no
 *   life lost ("out of blocks").
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Block Drop Complete!"). onComplete fires exactly once
 *   with the real score plus correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the fall and the
 *   controls (the shell overlay covers the well, and the tick
 *   loop + control handlers all require status 'playing').
 *   Reading How to Play mid-game also freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the wrong rows, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, so any question list where
 *   every answer is a 3–6 letter word or a whole number of 0–27
 *   plays. A question with any other answer keeps the plain
 *   message — see convert.ts.
 *   Print: NOT printable (needs its falling blocks and well) —
 *   see print-worksheet.ts. Sitemap type list stays at 23 by
 *   decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface BlockDropGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** A steady colour per character, so the same letter always looks the same. */
function blockColour(char: string): string {
  const palette = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#2dd4bf']
  const code = char.charCodeAt(0) || 0
  return palette[code % palette.length]!
}

function BlockDropGame({ items, locale, onComplete, onProgress }: BlockDropGameProps) {
  const [rounds, setRounds] = useState<BlockDropRound[]>([])
  const [game, setGame] = useState<BlockDropState | null>(null)
  const [dropNote, setDropNote] = useState<string | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(BLOCK_DROP_LIVES)
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
    const shuffled = shuffleArray(usable).slice(0, BLOCK_DROP_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: BlockDropRound[] = []
    for (const item of shuffled) {
      const round = buildBlockDropRound(item.prompt, item.answer, allAnswers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newBlockDropGame(built[0]) : null)
    setDropNote(null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(BLOCK_DROP_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(BLOCK_DROP_LIVES)
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

  // Finish sound once: win on Block Drop Complete, lose on game over.
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
    const fresh = newBlockDropGame(round)
    gameRef.current = fresh
    setGame(fresh)
    setDropNote(null)
  }, [current, rounds])

  /** Advance after the current round ends. Lives already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setFeedback(null)
    setDropNote(null)
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

  /** Lose one life and end the round (the well topped out). */
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

  /** End the round with no points and no life lost (out of blocks). */
  const endRoundNoPoints = useCallback((msg: string) => {
    advancingRef.current = true
    const from = currentRef.current
    setFeedback({ type: 'wrong', msg })
    setTimeout(() => advanceFrom(from), 1400)
  }, [advanceFrom])

  /** Resolve a locked piece: a cleared row wins, a top-out loses a life. */
  const resolveLock = useCallback((res: { state: BlockDropState; locked: boolean; rowCleared: boolean }) => {
    gameRef.current = res.state
    setGame(res.state)
    if (!res.locked) return
    if (res.rowCleared) {
      advancingRef.current = true
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      const from = currentRef.current
      const round = roundsRef.current[from]
      const target = round?.mode === 'word' ? round.targetWord : `${round?.targetSum}`
      setFeedback({
        type: 'correct',
        msg: `Row complete! +${SCORE_PER_CORRECT} points — ${target} is right!`,
      })
      setTimeout(() => advanceFrom(from), 1200)
      return
    }
    if (res.state.status === 'lost') {
      playEduSound('wrong', readInteractiveSoundOn())
      loseRound('The blocks piled up to the top! A wrong row stays, so keep the well clear.')
      return
    }
    if (res.state.status === 'out-of-blocks') {
      playEduSound('wrong', readInteractiveSoundOn())
      endRoundNoPoints('Out of blocks — the row never got completed. No life lost, try the next round!')
    }
  }, [advanceFrom, loseRound, endRoundNoPoints])

  /** One game tick: the falling piece drops one row. */
  const doTick = useCallback(() => {
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    resolveLock(dropOne(g))
  }, [resolveLock])

  // Game tick: the piece falls while the shell is playing, How-to-Play
  // is closed, and the game is not finished — pause and How-to-Play
  // both freeze the fall.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => { doTick() }, BLOCK_DROP_TICK_MS)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current, doTick])

  /** Slide the falling piece one column over. */
  const doMove = useCallback((dir: BlockDropMoveDirection) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    const next = movePiece(g, dir)
    if (next === g) return
    playEduSound('click', readInteractiveSoundOn())
    gameRef.current = next
    setGame(next)
  }, [finished, shellStatus, showHowto])

  /** Rotate the falling piece 90 degrees clockwise. */
  const doRotate = useCallback(() => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    const next = rotatePiece(g)
    if (next === g) return
    playEduSound('click', readInteractiveSoundOn())
    gameRef.current = next
    setGame(next)
  }, [finished, shellStatus, showHowto])

  /** Soft drop: fall one row now. */
  const doSoftDrop = useCallback(() => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    playEduSound('click', readInteractiveSoundOn())
    resolveLock(dropOne(g))
  }, [finished, shellStatus, showHowto, resolveLock])

  /** Hard drop: fall straight to the floor and lock there. */
  const doHardDrop = useCallback(() => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    playEduSound('jump', readInteractiveSoundOn())
    resolveLock(hardDrop(g))
  }, [finished, shellStatus, showHowto, resolveLock])

  const doMoveRef = useRef(doMove)
  useEffect(() => { doMoveRef.current = doMove }, [doMove])
  const doRotateRef = useRef(doRotate)
  useEffect(() => { doRotateRef.current = doRotate }, [doRotate])
  const doSoftDropRef = useRef(doSoftDrop)
  useEffect(() => { doSoftDropRef.current = doSoftDrop }, [doSoftDrop])
  const doHardDropRef = useRef(doHardDrop)
  useEffect(() => { doHardDropRef.current = doHardDrop }, [doHardDrop])

  // Keyboard controls: left/right to move, up/X to rotate, down to
  // soft-drop, Space to hard-drop. Held keys do not repeat moves —
  // one press is one move.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return
      const key = e.key.toLowerCase()
      if (key === 'arrowleft' || key === 'a') { e.preventDefault(); doMoveRef.current('left') }
      else if (key === 'arrowright' || key === 'd') { e.preventDefault(); doMoveRef.current('right') }
      else if (key === 'arrowup' || key === 'x') { e.preventDefault(); doRotateRef.current() }
      else if (key === 'arrowdown' || key === 's') { e.preventDefault(); doSoftDropRef.current() }
      else if (key === ' ') { e.preventDefault(); doHardDropRef.current() }
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
      const fresh = newBlockDropGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setDropNote(null)
    setLives(BLOCK_DROP_LIVES)
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
        This game has no drops yet — it needs answers that are a 3–6 letter word or a whole number up to 27.
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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Block Drop</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Falling letter and number blocks — complete the row before the well fills up!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> blocks with letters or numbers on them fall into the well, one piece at a time. Each round shows a target above the well — a word to spell, like CAT, or a sum to make, like 8. Move, turn, and drop the falling blocks so one full row reads the target word left to right, or adds up to the target number. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> a completed row earns {SCORE_PER_CORRECT} points. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}). Every target letter or digit appears twice in the falling blocks, so one wrong row never makes the round unwinnable.</p>
          <p><strong>Objective:</strong> complete the target row in every round without running out of lives.</p>
          <p><strong>Controls:</strong> left/right arrow keys or A/D to move, up arrow or X to turn the piece, down arrow or S to drop it one row, Space to drop it straight to the floor — or the on-screen ◀️ ▶️ ⟳ ▼ and DROP buttons. One press is one move.</p>
          <p><strong>Lives:</strong> you start with {BLOCK_DROP_LIVES} lives. If the blocks pile up to the top so the next piece cannot fall, you lose 1 life and the round ends. Running out of blocks costs no life — the round just ends with no points.</p>
          <p><strong>Wrong rows:</strong> a full row that does NOT spell the target word or add up to the target stays exactly where it is and piles up — so place the wrong letters and extra numbers where they cannot trap you. A piece is 1, 2, or 3 blocks, and turning it can put a letter in a different column.</p>
          <p><strong>Rounds:</strong> one round per question, in shuffled order. A piece falls one row about every second, so you have time to read the target and aim the piece.</p>
          <p><strong>How you win and finish:</strong> finish every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many rows you completed, and how many lives are left.</p>
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
          {won ? 'Block Drop Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} rows completed
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

  // Cells to render: settled blocks plus the falling piece.
  const renderBoard: (string | null)[][] = game.board.map((row) => [...row])
  if (game.piece) {
    for (const c of game.piece.cells) {
      const cy = game.piece.y + c.dy
      const cx = game.piece.x + c.dx
      if (cy >= 0 && cy < BLOCK_DROP_BOARD_ROWS && cx >= 0 && cx < round.width) {
        renderBoard[cy]![cx] = c.char
      }
    }
  }
  const fallingCells = new Set<string>()
  if (game.piece) {
    for (const c of game.piece.cells) {
      fallingCells.add(`${game.piece.y + c.dy},${game.piece.x + c.dx}`)
    }
  }
  const blocksLeft = Math.max(0, round.pieces.length - game.nextIndex + (game.piece ? 1 : 0))
  const targetLabel = round.mode === 'word'
    ? `Spell the word: ${round.targetWord!.split('').join(' ')}`
    : `Make a row that adds up to ${round.targetSum}`

  const controlButtonStyle: React.CSSProperties = {
    minWidth: '3.5rem', height: '3rem', borderRadius: 'var(--radius-lg)',
    border: '2px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text-primary)', fontSize: '1.1rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
    fontFamily: 'var(--font-display)',
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, BLOCK_DROP_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite">🧱 {blocksLeft} blocks left</span>
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
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', fontFamily: 'var(--font-display)', marginTop: '0.5rem', marginBottom: 0 }}>
          {targetLabel}
        </p>
        {dropNote && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: 0 }}>
            {dropNote}
          </p>
        )}
      </div>

      {/* The well: falling blocks drop into it, row by row. */}
      <div
        role="application"
        aria-label={`Block Drop round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. ${targetLabel}. ${lives} lives left, ${blocksLeft} blocks left.`}
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          userSelect: 'none',
          maxWidth: `${round.width * 52 + 8}px`,
          margin: '0 auto',
          background: '#1e293b',
          padding: '4px',
        }}
      >
        {renderBoard.map((row, rowIdx) => (
          <div key={rowIdx} style={{ display: 'flex', gap: '2px', marginBottom: rowIdx < BLOCK_DROP_BOARD_ROWS - 1 ? '2px' : 0 }}>
            {row.map((cell, colIdx) => {
              const isFalling = fallingCells.has(`${rowIdx},${colIdx}`)
              return (
                <div
                  key={colIdx}
                  style={{
                    flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '6px',
                    background: cell ? blockColour(cell) : 'rgba(255,255,255,0.08)',
                    color: '#1e293b', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem',
                    border: isFalling ? '2px solid #fff' : '2px solid transparent',
                    boxSizing: 'border-box',
                  }}
                >
                  {cell ?? ''}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* On-screen controls: move, rotate, soft drop, hard drop. */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={() => doMove('left')} aria-label="Move the piece left" style={controlButtonStyle}>◀️</button>
        <button onClick={doRotate} aria-label="Turn the piece" style={controlButtonStyle}>⟳</button>
        <button onClick={doSoftDrop} aria-label="Drop the piece one row" style={controlButtonStyle}>▼</button>
        <button onClick={() => doMove('right')} aria-label="Move the piece right" style={controlButtonStyle}>▶️</button>
        <button onClick={doHardDrop} aria-label="Drop the piece straight to the floor" style={{ ...controlButtonStyle, background: 'var(--color-primary)', color: '#fff', border: 'none', minWidth: '4.5rem' }}>⤓ DROP</button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Arrow keys / A,D to move, Up / X to turn, Down / S to drop one row, Space to drop it all the way. A full row that spells the word or adds up to the number clears — a wrong full row stays!
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

export default function BlockDropActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Block Drop" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <BlockDropGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
