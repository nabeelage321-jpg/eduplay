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
  MINE_LOGIC_LIVES,
  MINE_LOGIC_MAX_ROUNDS,
  MINE_LOGIC_POINTS_PER_ROUND,
  MINE_LOGIC_ROWS,
  MINE_LOGIC_COLS,
  MINE_LOGIC_MINES,
  MINE_LOGIC_LONG_PRESS_MS,
  mineLogicMinesLeft,
  newMineLogicGame,
  requestReveal,
  answerQuestion,
  toggleFlag,
  buildMineLogicRound,
  type MineLogicState,
  type MineLogicRound,
} from '@/lib/mine-logic'

/**
 * Mine Logic — EduPlay's own Minesweeper-STYLE logic grid
 * (type 56).
 *
 * Minesweeper-STYLE mechanic only: a 6x6 grid hides 6 mines
 * and the numbers tell you how many mines touch each square.
 * No Minesweeper name, no mine, no Microsoft art: the grid is
 * plain squares with numbers drawn here, the mines are a plain
 * 💣 emoji, the flags a plain 🚩. Sounds are the shared
 * interactive Web Audio system (synthesized, no assets) for
 * correct / wrong / win / lose, plus three small sounds of our
 * own below — a reveal blip, a flag thud, and a low boom for a
 * mine — all synthesized sine tones, no recordings. Sound is ON
 * by default for this game; the in-player toggle mutes it in
 * one tap. Background music is the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct choice. Each round is one fresh grid;
 * every square is opened by answering a quick question from
 * the game's own items (the next question in the round's
 * shuffled queue, right answer plus wrong answers borrowed
 * from the other items). No new save path was needed: the save
 * route already stores prompt/answer for every type, and the
 * adapter passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per CLEARED grid (one grid per round,
 *   up to 10 rounds, shuffled once per item content). Score out
 *   of 10 x rounds.
 * - The grid is 6 x 6 = 36 squares with 6 mines hidden in it.
 *   The mines are placed when the first square is opened, never
 *   under that square or its neighbours — the first tap is
 *   always safe and always opens a blank square, which
 *   flood-opens its neighbourhood.
 * - Tap a covered square and a quick question appears. Answer
 *   it right and the square opens, showing how many mines
 *   touch it — 0 opens blank and flood-opens every connected
 *   blank square and their numbered border, no extra question
 *   needed for those. Answer it wrong and the square stays
 *   covered: no life lost, only the streak breaks.
 * - Flag mode (the 🚩 Flag button, the F key, or a long press
 *   on a square) flags a square you believe hides a mine.
 *   Flags only work once a square has been opened. Flagging a
 *   real mine sticks and the mines-left counter drops.
 *   Unflagging is free. Flagging a SAFE square is a WRONG FLAG:
 *   the round ends at once and costs 1 life, and all mines are
 *   shown.
 * - Opening a mine ends the round at once and costs 1 life,
 *   and all mines are shown.
 * - A round is cleared when every safe square is revealed
 *   (flagging every mine is not required).
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Mine Logic Complete!"). onComplete fires exactly
 *   once with the real score plus correct/total counts and lives
 *   left.
 * - Pause via the shared PlayShell freezes the controls (the
 *   shell overlay covers the grid, and the control handlers all
 *   require status 'playing'). Reading How to Play mid-game
 *   also freezes them. There is no clock in this game, so
 *   nothing falls or moves while paused.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the wrong flags, the streak, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one grid per round, so any question list with at
 *   least three different answers plays. A game with fewer keeps
 *   the plain message — see convert.ts.
 *   Print: NOT printable (needs its hidden mines, numbers, and
 *   flagging) — see print-worksheet.ts. Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface MineLogicGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Classic grid number colours, so a 3 always looks like a 3. */
function numberColour(n: number): string {
  const colours = ['', '#2563eb', '#16a34a', '#dc2626', '#1e3a8a', '#7f1d1d', '#0d9488', '#111827', '#6b7280']
  return colours[n] ?? '#111827'
}

/** Our own grid sounds: synthesized sine tones, no recording,
 *  no asset. Reveal is a short blip up, a flag is a low thud,
 *  a mine is a low boom. */
let gridCtx: AudioContext | null = null
function playGridSound(soundOn: boolean, kind: 'reveal' | 'flag' | 'boom') {
  if (!soundOn || typeof window === 'undefined') return
  try {
    if (!gridCtx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      gridCtx = new AC()
    }
    if (gridCtx.state === 'suspended') void gridCtx.resume()
    const t0 = gridCtx.currentTime
    const osc = gridCtx.createOscillator()
    const gain = gridCtx.createGain()
    if (kind === 'reveal') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, t0)
      osc.frequency.exponentialRampToValueAtTime(900, t0 + 0.09)
      gain.gain.setValueAtTime(0.18, t0)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12)
      osc.start(t0)
      osc.stop(t0 + 0.14)
    } else if (kind === 'flag') {
      osc.type = 'square'
      osc.frequency.setValueAtTime(180, t0)
      gain.gain.setValueAtTime(0.12, t0)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08)
      osc.start(t0)
      osc.stop(t0 + 0.1)
    } else {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(200, t0)
      osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.4)
      gain.gain.setValueAtTime(0.3, t0)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45)
      osc.start(t0)
      osc.stop(t0 + 0.5)
    }
    osc.connect(gain)
    gain.connect(gridCtx.destination)
  } catch {
    /* sound is best-effort — a tap still counts without it */
  }
}

function MineLogicGame({ items, locale, onComplete, onProgress }: MineLogicGameProps) {
  const [rounds, setRounds] = useState<MineLogicRound[]>([])
  const [game, setGame] = useState<MineLogicState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(MINE_LOGIC_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  const [flagMode, setFlagMode] = useState(false)
  // Long-press bookkeeping: a press held past the threshold flags
  // the square and swallows the click that follows it.
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClickRef = useRef(false)

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
    const built: MineLogicRound[] = []
    for (let i = 0; i < MINE_LOGIC_MAX_ROUNDS; i++) {
      const round = buildMineLogicRound(shuffled)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newMineLogicGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(MINE_LOGIC_LIVES)
    setScore(0)
    setCorrectCount(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setFlagMode(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(MINE_LOGIC_LIVES)
  const correctRef = useRef(0)
  const streakRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { correctRef.current = correctCount })
  useEffect(() => { streakRef.current = streak })
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

  // Finish sound once: win on Mine Logic Complete, lose on game over.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

  // A fresh grid whenever the round changes.
  const roundsRef = useRef(rounds)
  useEffect(() => { roundsRef.current = rounds }, [rounds])
  const currentRef = useRef(current)
  useEffect(() => { currentRef.current = current }, [current])
  const gameRef = useRef(game)
  useEffect(() => { gameRef.current = game }, [game])
  useEffect(() => {
    const round = rounds[current]
    if (!round) return
    const fresh = newMineLogicGame(round)
    gameRef.current = fresh
    setGame(fresh)
    setFlagMode(false)
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
    setTimeout(() => advanceFrom(from), 1800)
  }, [advanceFrom])

  /** Resolve an action from the lib. */
  const resolveEvent = useCallback((next: MineLogicState) => {
    const event = next.lastEvent
    if (!event) return
    if (event.kind === 'asked') return
    if (event.kind === 'revealed') {
      playGridSound(readInteractiveSoundOn(), 'reveal')
      setStreak((s) => s + 1)
      streakRef.current = streakRef.current + 1
      if (event.flood > 1) {
        setFeedback({
          type: 'correct',
          msg: `Nice — that square was blank, so ${event.flood} squares opened at once!`,
        })
      }
      return
    }
    if (event.kind === 'round-won') {
      playGridSound(readInteractiveSoundOn(), 'reveal')
      setScore((s) => s + MINE_LOGIC_POINTS_PER_ROUND)
      scoreRef.current = scoreRef.current + MINE_LOGIC_POINTS_PER_ROUND
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      setStreak((s) => s + 1)
      streakRef.current = streakRef.current + 1
      advancingRef.current = true
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `Grid cleared! Every safe square is open — +${MINE_LOGIC_POINTS_PER_ROUND} points!`,
      })
      setTimeout(() => advanceFrom(from), 1400)
      return
    }
    if (event.kind === 'wrong-answer') {
      playEduSound('wrong', readInteractiveSoundOn())
      setStreak(0)
      streakRef.current = 0
      setFeedback({
        type: 'wrong',
        msg: 'Not quite — that square stays covered. Read the number clues and try another square.',
      })
      return
    }
    if (event.kind === 'flagged') {
      playGridSound(readInteractiveSoundOn(), 'flag')
      return
    }
    if (event.kind === 'unflagged') {
      playGridSound(readInteractiveSoundOn(), 'flag')
      return
    }
    if (event.kind === 'flag-too-early') {
      setFeedback({
        type: 'wrong',
        msg: 'Open a square first — the mines are only hidden once the grid starts.',
      })
      return
    }
    if (event.kind === 'wrong-flag') {
      playGridSound(readInteractiveSoundOn(), 'boom')
      loseRound('Wrong flag! That square was safe, not a mine.')
      return
    }
    if (event.kind === 'mine-hit') {
      playGridSound(readInteractiveSoundOn(), 'boom')
      loseRound('BOOM! That square hid a mine.')
      return
    }
  }, [advanceFrom, loseRound])

  /** Apply a lib state and resolve its event. */
  const applyState = useCallback((next: MineLogicState) => {
    gameRef.current = next
    setGame(next)
    resolveEvent(next)
  }, [resolveEvent])

  /** Tap a square: flag in Flag mode, otherwise ask its question. */
  const doTapCell = useCallback((cell: number) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'playing' || g.pending) return
    setFeedback(null)
    if (flagMode) {
      applyState(toggleFlag(g, cell))
    } else {
      applyState(requestReveal(g, cell))
    }
  }, [advancingRef, finished, flagMode, shellStatus, showHowto, applyState])

  /** Long-press a square: flag it (or unflag it) whatever the mode. */
  const doFlagCell = useCallback((cell: number) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'playing' || g.pending) return
    setFeedback(null)
    applyState(toggleFlag(g, cell))
  }, [advancingRef, finished, shellStatus, showHowto, applyState])

  /** Answer the waiting question. */
  const doAnswer = useCallback((choice: string) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'playing' || !g.pending) return
    applyState(answerQuestion(g, choice))
  }, [advancingRef, finished, shellStatus, showHowto, applyState])

  // Keyboard: F toggles Flag mode.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setFlagMode((m) => !m)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [shellStatus, showHowto, finished])

  // Clear a pending long-press timer when the component unmounts.
  useEffect(() => () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
  }, [])

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
      const fresh = newMineLogicGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setLives(MINE_LOGIC_LIVES)
    setScore(0)
    setCorrectCount(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setFlagMode(false)
    completedRef.current = false
    advancingRef.current = false
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no grid yet — it needs questions with at least three different answers to open squares with.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🧩</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Mine Logic</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            A grid hides 6 mines — the numbers tell you where they are. Flag the mines, open the safe squares!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> the grid is {MINE_LOGIC_ROWS} squares by {MINE_LOGIC_COLS} squares, and {MINE_LOGIC_MINES} mines are hidden in it. Tap a covered square and a quick question appears — for example, &ldquo;3+5 = ?&rdquo; — with answers to pick from. Answer it right and the square opens: a number tells you how many mines touch that square, so a 3 means 3 mines touch it. A blank square means no mines touch it, and it opens all its blank neighbours at once. Use the numbers to work out where the mines are, then flag them. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> clearing a whole grid — opening every safe square — earns {MINE_LOGIC_POINTS_PER_ROUND} points. Each round is one grid, so the game is scored out of {rounds.length * MINE_LOGIC_POINTS_PER_ROUND} ({rounds.length} {rounds.length === 1 ? 'grid' : 'grids'}). Opening one square earns no points on its own — only the cleared grid does.</p>
          <p><strong>Objective:</strong> clear every grid by opening all its safe squares and flagging the mines, without running out of lives — and keep your streak going!</p>
          <p><strong>Controls:</strong> tap a square to open it (a question appears first). Tap the 🚩 Flag button — or press F, or hold a square down — to switch to flagging, then tap the squares you are sure hide a mine. Tap a flagged square again to unflag it. Your first tap is always safe: the mines are only hidden once the grid starts, and never under your first square or its neighbours.</p>
          <p><strong>Lives:</strong> you start with {MINE_LOGIC_LIVES} lives. Opening a mine ends the round at once and costs 1 life, and all the mines are shown. Flagging a SAFE square is a wrong flag — it also ends the round at once and costs 1 life. Answering a square&apos;s question wrong costs no life: the square just stays covered.</p>
          <p><strong>Wrong answers and flags:</strong> a wrong answer to a square&apos;s question only breaks your streak — the square stays covered and you can try another square. A wrong flag is much worse: only flag a square when the numbers prove a mine is there.</p>
          <p><strong>Rounds:</strong> one grid per round, in shuffled order. A fresh grid with fresh hidden mines is laid in every round, and the questions come from your game in a new order each time.</p>
          <p><strong>How you win and finish:</strong> clear every grid with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many grids you cleared, and how many lives are left.</p>
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
          {won ? 'Mine Logic Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} grids cleared
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

  const pending = game.pending
  const minesLeft = mineLogicMinesLeft(game)

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, MINE_LOGIC_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
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
          {pending ? 'Open this square — answer the question!' : 'Read the numbers, flag the mines, open the safe squares!'}
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem', marginBottom: 0 }}>
          💣 {minesLeft} {minesLeft === 1 ? 'mine' : 'mines'} left to flag · {MINE_LOGIC_MINES} mines hidden in this grid
        </p>
      </div>

      {/* Question panel: appears when a square is tapped. */}
      <AnimatePresence>
        {pending && (
          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="group" aria-label={`Question to open square ${pending.cell + 1}`}
            style={{
              background: 'var(--color-surface)', border: '2px solid var(--color-primary)',
              borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1rem',
              color: 'var(--color-text-primary)', textAlign: 'center', boxShadow: 'var(--shadow-card)',
            }}>
            <p style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              {pending.question.prompt}
            </p>
            {pending.question.imageUrl && (
              <figure style={{ margin: '0.75rem 0 0' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pending.question.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: 'var(--radius)' }} />
                {pending.question.imageCredit && (
                  <figcaption style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {pending.question.imageCredit}
                  </figcaption>
                )}
              </figure>
            )}
            <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}>
              {pending.question.choices.map((choice) => (
                <button
                  key={choice}
                  onClick={() => doAnswer(choice)}
                  style={{
                    padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)',
                    border: '2px solid var(--color-border)', background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)',
                    fontSize: '1.05rem', cursor: 'pointer',
                  }}
                >
                  {choice}
                </button>
              ))}
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.6rem', marginBottom: 0 }}>
              A right answer opens the square — a wrong one just leaves it covered.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flag-mode toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => { playEduSound('click', readInteractiveSoundOn()); setFlagMode(false) }}
          disabled={game.status !== 'playing' || !!pending}
          aria-pressed={!flagMode}
          style={{
            padding: '0.6rem 1.25rem', borderRadius: '999px',
            border: !flagMode ? 'none' : '2px solid var(--color-border)',
            background: !flagMode ? 'var(--color-primary)' : 'var(--color-surface)',
            color: !flagMode ? '#fff' : 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          🔍 Reveal
        </button>
        <button
          onClick={() => { playEduSound('click', readInteractiveSoundOn()); setFlagMode(true) }}
          disabled={game.status !== 'playing' || !!pending}
          aria-pressed={flagMode}
          style={{
            padding: '0.6rem 1.25rem', borderRadius: '999px',
            border: flagMode ? 'none' : '2px solid var(--color-border)',
            background: flagMode ? '#dc2626' : 'var(--color-surface)',
            color: flagMode ? '#fff' : 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          🚩 Flag
        </button>
      </div>

      {/* The grid: 6 x 6 squares. */}
      <div
        role="grid"
        aria-label={`Mine Logic grid, round ${current + 1} of ${rounds.length}. ${minesLeft} mines left to flag. ${lives} lives left.`}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${MINE_LOGIC_COLS}, 1fr)`,
          gap: '4px',
          width: '100%',
          maxWidth: '420px',
          margin: '0 auto',
          userSelect: 'none',
          touchAction: 'manipulation',
        }}
      >
        {game.cells.map((cell, i) => {
          const showMine = game.showMines && cell.mine
          const isHitMine =
            game.lastEvent !== null &&
            game.lastEvent.kind === 'mine-hit' &&
            game.lastEvent.cell === i
          return (
            <button
              key={i}
              role="gridcell"
              aria-label={
                cell.revealed
                  ? cell.mine
                    ? `Square ${i + 1}: a mine`
                    : cell.adjacent === 0
                      ? `Square ${i + 1}: blank, no mines touch it`
                      : `Square ${i + 1}: ${cell.adjacent} ${cell.adjacent === 1 ? 'mine touches' : 'mines touch'} it`
                  : cell.flagged
                    ? `Square ${i + 1}: flagged as a mine`
                    : `Square ${i + 1}: covered`
              }
              disabled={game.status !== 'playing' || !!pending}
              onClick={() => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false
                  return
                }
                doTapCell(i)
              }}
              onPointerDown={() => {
                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
                longPressTimerRef.current = setTimeout(() => {
                  suppressClickRef.current = true
                  doFlagCell(i)
                }, MINE_LOGIC_LONG_PRESS_MS)
              }}
              onPointerUp={() => {
                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
              }}
              onPointerLeave={() => {
                if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
              }}
              style={{
                aspectRatio: '1 / 1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem',
                borderRadius: 'var(--radius)',
                border: cell.revealed ? '1px solid var(--color-border)' : '2px solid rgba(255,255,255,0.25)',
                background: showMine
                  ? isHitMine
                    ? '#dc2626'
                    : '#fef3c7'
                  : cell.revealed
                    ? 'var(--color-surface)'
                    : cell.flagged
                      ? '#fef9c3'
                      : '#475569',
                color: showMine
                  ? '#111827'
                  : cell.revealed
                    ? numberColour(cell.adjacent)
                    : '#fff',
                cursor: game.status === 'playing' && !pending ? 'pointer' : 'default',
                padding: 0,
                boxSizing: 'border-box',
              }}
            >
              {showMine ? '💣' : cell.revealed ? (cell.adjacent === 0 ? '' : cell.adjacent) : cell.flagged ? '🚩' : ''}
            </button>
          )
        })}
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
        {flagMode
          ? 'Flag mode: tap a square to flag it as a mine — only flag when the numbers prove it! A wrong flag ends the round and costs a life.'
          : 'Reveal mode: tap a square to answer a question and open it. Hold a square down to flag it instead — or use the 🚩 Flag button (F key works too).'}
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

export default function MineLogicActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Mine Logic" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <MineLogicGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
