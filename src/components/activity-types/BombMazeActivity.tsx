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
  BOMB_MAZE_LIVES,
  BOMB_MAZE_ROUND_SECONDS,
  BOMB_MAZE_WARNING_SECONDS,
  BOMB_MAZE_MAX_ROUNDS,
  buildBombMazeRound,
  moveExplorer,
  isBombCell,
  starAtCell,
  type BombMazeDir,
  type BombMazePos,
  type BombMazeRound,
} from '@/lib/bomb-maze'

/**
 * Bomb Maze — EduPlay's own gentle maze game (type 64).
 *
 * The kid steers our own explorer through a maze to reach the
 * golden goal gate. Answer stars wait in the maze: collecting
 * the star with the correct answer unlocks the goal, and
 * reaching the goal wins the round. Sleepy bombs are gentle
 * obstacles — touching one never costs a life and never fails
 * the round, it just bounces the explorer back to the start
 * with a soft boop and a kind "oops, try another way". No scary
 * imagery anywhere: the bombs are round, sleepy, and smiling,
 * and every message is kind. Sounds are the shared interactive
 * Web Audio system (synthesized, no assets) for correct /
 * wrong / win / lose, plus a small bounce boop and unlock
 * chime of our own below. Sound is ON by default for this
 * game; the in-player toggle mutes it in one tap. Background
 * music is the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = correct answer star. Distractors are the OTHER
 * items' answers (up to 3, shuffled), exactly like Quiz builds
 * options. If a question carries its own picture (imageUrl), the
 * picture shows above the question — it is part of the question,
 * never decoration, never invented. No new save path was needed:
 * the save route already stores prompt/answer for every type, and
 * the adapter passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per correct round, score out of 10 x rounds.
 * - One round (one maze) per question, at most 10 rounds, rounds
 *   shuffled once per item content. The shown question sits above
 *   the maze.
 * - Move with arrow keys / WASD on desktop, or the on-screen
 *   arrow pad on mobile. Walls block movement (no penalty).
 * - Steer the explorer onto the star with the CORRECT answer:
 *   it sparkles, the golden goal gate opens, and reaching the
 *   goal earns +10 and the next maze. A star with a WRONG answer
 *   pops with a gentle "oops" — no life lost, the round goes on,
 *   but that star is gone so it can never be collected twice.
 * - Stepping onto a locked goal does nothing (no penalty) — the
 *   goal only opens once the right star is collected.
 * - Touching a sleepy bomb bounces the explorer back to the
 *   start (the last safe spot) with a soft boop — no life lost,
 *   no points lost, the round goes on. Bombs never move and
 *   never chase.
 * - 45 seconds per round. At 5 seconds left, one timer-warning
 *   sound. Time up: -1 life, "Time's up!", round skipped.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Bomb Maze Complete!"). onComplete fires exactly once
 *   with the real score plus correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the round timer and
 *   movement (the shell overlay covers the maze, and the timer
 *   effect + key/D-pad handlers all require status 'playing').
 *   Reading How to Play mid-game also freezes the timer.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the timer, the sleepy bombs, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the maze is generated from the game's
 *   own items, one maze per question, stars are the correct
 *   answer plus wrong answers borrowed from the other items, so
 *   any plain question list with at least two distinct answers
 *   plays. A lone question with nothing to borrow keeps the plain
 *   message — see convert.ts. Print: NOT printable (needs its
 *   maze, stars, and sleepy bombs) — see print-worksheet.ts.
 *   Sitemap type list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface BombMazeGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Our own explorer: a round amber face with a little green cap
 *  and a smile — drawn here, never copied from anywhere. */
function ExplorerArt() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path d="M4 9 Q12 2 20 9 L20 10 L4 10 Z" fill="#16a34a" />
      <circle cx="12" cy="14" r="8" fill="#f59e0b" />
      <circle cx="9" cy="13" r="1.6" fill="#fff" />
      <circle cx="15" cy="13" r="1.6" fill="#fff" />
      <circle cx="9.5" cy="13.5" r="0.8" fill="#451a03" />
      <circle cx="15.5" cy="13.5" r="0.8" fill="#451a03" />
      <path d="M9 17 Q12 19.5 15 17" stroke="#fff" fill="none" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Our own sleepy bomb: a round dark bomb with closed, sleepy
 *  eyes and a tiny soft spark — gentle, never scary, drawn here. */
function SleepyBombArt() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <circle cx="14" cy="4" r="1.6" fill="#fbbf24" />
      <path d="M12 6 L12 8" stroke="#78350f" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15" r="8" fill="#334155" />
      <circle cx="9" cy="13" r="1.1" fill="#fff" />
      <circle cx="15" cy="13" r="1.1" fill="#fff" />
      <path d="M9 12 Q10.5 13.5 12 12 M12 12 Q13.5 13.5 15 12" stroke="#fff" fill="none" strokeWidth="1" strokeLinecap="round" />
      <path d="M9.5 17.5 Q12 19 14.5 17.5" stroke="#cbd5e1" fill="none" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="9" cy="11" rx="2.2" ry="1.4" fill="#64748b" opacity="0.7" />
    </svg>
  )
}

/** Our own golden goal star, drawn here. */
function GoalStarArt({ locked }: { locked: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
      <path
        d="M12 2 L14.6 8.6 L21.5 9 L16.5 13.5 L18 20.5 L12 17 L6 20.5 L7.5 13.5 L2.5 9 L9.4 8.6 Z"
        fill={locked ? '#94a3b8' : '#fbbf24'}
        stroke={locked ? '#64748b' : '#b45309'}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {locked && (
        <g>
          <rect x="9" y="12" width="6" height="5" rx="1" fill="#475569" />
          <path d="M10 12 V10.5 Q10 9 12 9 Q14 9 14 10.5 V12" stroke="#475569" fill="none" strokeWidth="1.4" />
        </g>
      )}
    </svg>
  )
}

/** Own synthesized Web Audio — a soft bounce boop and an unlock
 *  chime. No recording, no asset. */
let bombCtx: AudioContext | null = null
function bombAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!bombCtx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      bombCtx = new AC()
    }
    if (bombCtx.state === 'suspended') void bombCtx.resume()
    return bombCtx
  } catch {
    return null
  }
}
function playBombTone(soundOn: boolean, notes: { freq: number; at: number; dur: number; type: OscillatorType; vol: number }[]) {
  if (!soundOn) return
  const ctx = bombAudioCtx()
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
    /* sound is best-effort — a bounce still counts without it */
  }
}
/** A soft, low boop when a sleepy bomb bounces the explorer back. */
function playBounceBoop(soundOn: boolean) {
  playBombTone(soundOn, [
    { freq: 320, at: 0, dur: 0.16, type: 'sine', vol: 0.16 },
    { freq: 210, at: 0.1, dur: 0.22, type: 'sine', vol: 0.14 },
  ])
}
/** Two rising notes when the right star unlocks the goal. */
function playUnlockChime(soundOn: boolean) {
  playBombTone(soundOn, [
    { freq: 660, at: 0, dur: 0.18, type: 'sine', vol: 0.16 },
    { freq: 880, at: 0.12, dur: 0.28, type: 'sine', vol: 0.16 },
  ])
}

function BombMazeGame({ items, locale, onComplete, onProgress }: BombMazeGameProps) {
  const [rounds, setRounds] = useState<BombMazeRound[]>([])
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [pos, setPos] = useState<BombMazePos>({ row: 0, col: 0 })
  const [lives, setLives] = useState(BOMB_MAZE_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(BOMB_MAZE_ROUND_SECONDS)
  const [popped, setPopped] = useState<Set<string>>(new Set())
  const [unlocked, setUnlocked] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong' | 'info'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  const [bouncing, setBouncing] = useState(false)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()

  useEffect(() => {
    if (!feedback) return
    if (feedback.type === 'info') return
    playEduSound(feedback.type, readInteractiveSoundOn())
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
    const shuffled = shuffleArray(usable).slice(0, BOMB_MAZE_MAX_ROUNDS)
    const built: BombMazeRound[] = []
    for (const item of shuffled) {
      const others = shuffleArray(usable.filter((o) => o !== item).map((o) => o.answer)).slice(0, 3)
      const answers = shuffleArray([
        { answer: item.answer, isCorrect: true },
        ...others.map((a) => ({ answer: a, isCorrect: false })),
      ])
      const round = buildBombMazeRound(item.prompt, answers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setPos(built[0]?.start ?? { row: 0, col: 0 })
    setLives(BOMB_MAZE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(BOMB_MAZE_ROUND_SECONDS)
    setPopped(new Set())
    setUnlocked(false)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setBouncing(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(BOMB_MAZE_LIVES)
  const correctRef = useRef(0)
  const posRef = useRef<BombMazePos>({ row: 0, col: 0 })
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  const bouncingRef = useRef(false)
  const warnedRoundRef = useRef(-1)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { correctRef.current = correctCount })
  useEffect(() => { posRef.current = pos })
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

  // Finish sound once: win on Bomb Maze Complete, lose on game over.
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
    setTimeLeft(BOMB_MAZE_ROUND_SECONDS)
    setPopped(new Set())
    setUnlocked(false)
    setBouncing(false)
    bouncingRef.current = false
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
    if (timeLeft !== BOMB_MAZE_WARNING_SECONDS || shellStatus !== 'playing' || showHowto || finished) return
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

  function handleMove(dir: BombMazeDir) {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || bouncingRef.current) return
    const round = rounds[current]
    if (!round) return
    const next = moveExplorer(round.walls, pos, dir)
    if (next.row === pos.row && next.col === pos.col) return
    playEduSound('click', readInteractiveSoundOn())
    // Sleepy bomb: gentle bounce back to the start — no life lost.
    if (isBombCell(round, next)) {
      bouncingRef.current = true
      setBouncing(true)
      playBounceBoop(readInteractiveSoundOn())
      setPos(round.start)
      posRef.current = round.start
      setFeedback({ type: 'info', msg: 'Oops! A sleepy bomb bounced you back to the start — try another way.' })
      setTimeout(() => {
        setBouncing(false)
        bouncingRef.current = false
        setFeedback(null)
      }, 1400)
      return
    }
    setPos(next)
    posRef.current = next
    // The golden goal: only open once the right star is collected.
    if (next.row === round.goal.row && next.col === round.goal.col) {
      if (!unlocked) {
        setFeedback({ type: 'info', msg: 'The golden goal is still locked — find the star with the right answer first!' })
        return
      }
      advancingRef.current = true
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      setFeedback({ type: 'correct', msg: `You reached the goal! +${SCORE_PER_CORRECT} points.` })
      const from = current
      setTimeout(() => advanceFrom(from), 1200)
      return
    }
    const star = starAtCell(round, next)
    if (!star || popped.has(`${next.row},${next.col}`)) return
    if (star.isCorrect) {
      // Already unlocked: walking over the star again does nothing.
      if (!unlocked) {
        setUnlocked(true)
        playUnlockChime(readInteractiveSoundOn())
        setFeedback({ type: 'correct', msg: 'That is the right star! The golden goal is open — run to it!' })
      }
    } else {
      setPopped((p) => new Set(p).add(`${next.row},${next.col}`))
      setFeedback({ type: 'wrong', msg: 'Oops, not that star — try another one. No harm done!' })
    }
  }

  // Keyboard: arrows + WASD. Guarded by the same rules as the pad.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || bouncingRef.current) return
      const map: Record<string, BombMazeDir> = {
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
  }, [shellStatus, showHowto, finished, current, pos, unlocked, popped, rounds, bouncing])

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    const first = rounds[0]
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setPos(first?.start ?? { row: 0, col: 0 })
    setLives(BOMB_MAZE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(BOMB_MAZE_ROUND_SECONDS)
    setPopped(new Set())
    setUnlocked(false)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setBouncing(false)
    completedRef.current = false
    advancingRef.current = false
    bouncingRef.current = false
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">💣</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Bomb Maze</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Find the right star, open the golden goal, and dodge the sleepy bombs.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each maze asks one question. Gold stars in the maze show answers. Steer your explorer to the star with the correct answer and collect it — that opens the golden goal at the far end of the maze. Then run to the goal to win the maze. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> each maze you finish by reaching the open goal earns {SCORE_PER_CORRECT} points. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'maze' : 'mazes'}). Wrong stars and sleepy bombs earn no points — and cost no lives either.</p>
          <p><strong>Objective:</strong> collect the right star in every maze, reach the golden goal, and keep your lives — all while tiptoeing around the sleepy bombs.</p>
          <p><strong>Controls:</strong> arrow keys or WASD on a keyboard, or the on-screen arrow pad below the maze on a phone or tablet. Dark squares are walls — you cannot walk through them, and bumping one costs nothing. The golden goal stays locked until you collect the right star.</p>
          <p><strong>Lives:</strong> you start with {BOMB_MAZE_LIVES} lives. A wrong star just pops with a gentle “oops” and costs no life. A sleepy bomb just bounces you back to the start — no life lost, no points lost. Only running out of time costs 1 life.</p>
          <p><strong>Timer:</strong> {BOMB_MAZE_ROUND_SECONDS} seconds per maze. You hear one warning when 5 seconds are left. The timer pauses when you pause the game or re-read this page — and the bombs wait too.</p>
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
          {won ? 'Bomb Maze Complete!' : 'Out of lives!'}
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
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, BOMB_MAZE_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite" style={{ color: timeLeft <= BOMB_MAZE_WARNING_SECONDS ? 'var(--color-danger)' : undefined }}>⏱ {timeLeft}s</span>
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
          {unlocked
            ? 'The golden goal is open — run to the big gold star!'
            : 'Collect the star with the right answer to open the golden goal — tiptoe around the sleepy bombs.'}
        </p>
      </div>

      {/* The maze: 9x9 grid, walls dark, answer stars gold, sleepy bombs round, explorer + goal on top. */}
      <motion.div animate={{ x: feedback?.type === 'wrong' ? [0, -10, 10, -6, 6, 0] : 0, y: bouncing ? [0, -6, 0] : 0 }} transition={{ duration: 0.4 }}>
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
              const isGoal = round.goal.row === r && round.goal.col === c
              const isBomb = round.bombs.some((b) => b.row === r && b.col === c)
              const star = round.stars.find((s) => s.row === r && s.col === c)
              const isPopped = popped.has(`${r},${c}`)
              const justUnlocked = isPlayer && star?.isCorrect && unlocked && feedback?.type === 'correct'
              const justPopped = isPlayer && star && !star.isCorrect && feedback?.type === 'wrong'
              return (
                <div
                  key={`${r}-${c}`}
                  role="gridcell"
                  aria-label={
                    isPlayer ? 'You are here' :
                    isGoal ? (unlocked ? 'The open golden goal' : 'The locked golden goal') :
                    isWall ? 'Wall' :
                    isBomb ? 'A sleepy bomb — tiptoe around it' :
                    star ? (isPopped ? 'A popped star' : `Answer star: ${star.answer}`) : 'Open path'
                  }
                  style={{
                    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center', padding: '1px', fontSize: '0.62rem', lineHeight: 1.1,
                    overflow: 'hidden', wordBreak: 'break-word',
                    background: isWall ? 'var(--color-text-muted)'
                      : isGoal ? (unlocked ? '#fef3c7' : '#e2e8f0')
                      : justUnlocked ? 'var(--color-success)'
                      : justPopped ? 'var(--color-danger)'
                      : 'var(--color-surface)',
                  }}
                >
                  {isPlayer ? (
                    <span style={{ display: 'block', width: '80%', height: '80%' }}><ExplorerArt /></span>
                  ) : isGoal ? (
                    <span style={{ display: 'block', width: '85%', height: '85%' }}><GoalStarArt locked={!unlocked} /></span>
                  ) : isBomb ? (
                    <span style={{ display: 'block', width: '85%', height: '85%' }}><SleepyBombArt /></span>
                  ) : star && !isPopped ? (
                    <span
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '92%', height: '92%', borderRadius: '50%',
                        background: '#f59e0b', color: '#451a03', fontWeight: 700,
                        padding: '1px', fontSize: '0.62rem', lineHeight: 1.1, overflow: 'hidden',
                        wordBreak: 'break-word', textAlign: 'center',
                      }}
                    >
                      ⭐{star.answer}
                    </span>
                  ) : star && isPopped ? (
                    <span style={{ color: 'var(--color-text-muted)' }}>✗</span>
                  ) : null}
                </div>
              )
            }),
          )}
        </div>
      </motion.div>

      {/* On-screen arrow pad: tap targets for phones/tablets. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 3rem)', gap: '0.4rem', justifyContent: 'center', marginTop: '1rem' }} aria-label="Move the explorer">
        <span />
        <button type="button" aria-label="Move up" onClick={() => handleMove('up')} style={padBtn}>↑</button>
        <span />
        <button type="button" aria-label="Move left" onClick={() => handleMove('left')} style={padBtn}>←</button>
        <button type="button" aria-label="Move down" onClick={() => handleMove('down')} style={padBtn}>↓</button>
        <button type="button" aria-label="Move right" onClick={() => handleMove('right')} style={padBtn}>→</button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Arrow keys or WASD work too. Sleepy bombs just bounce you back to the start — no lives lost!
      </p>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              marginTop: '1rem', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : feedback.type === 'wrong' ? 'var(--color-danger)' : 'var(--color-primary)',
              color: '#fff', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem',
            }}>
            {feedback.type === 'correct' ? '⭐ ' : feedback.type === 'wrong' ? '❌ ' : '💣 '}{feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function BombMazeActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Bomb Maze" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <BombMazeGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
