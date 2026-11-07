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
  SWEET_MATCH_ROWS,
  SWEET_MATCH_COLS,
  SWEET_MATCH_LIVES,
  SWEET_MATCH_ROUND_SECONDS,
  SWEET_MATCH_WARNING_SECONDS,
  SWEET_MATCH_CASCADE_BONUS,
  SWEET_MATCH_MAX_ROUNDS,
  areAdjacent,
  swapTiles,
  findSwapForTarget,
  attemptSwap,
  buildSweetMatchTarget,
  buildSweetMatchBoard,
  type SweetMatchBoard,
  type SweetMatchCell,
  type SweetMatchRound,
} from '@/lib/sweet-match'

/**
 * Sweet Match — EduPlay's own match-3 game (type 44).
 *
 * Match-3-STYLE mechanic only: the kid swaps adjacent tiles on a
 * 6x6 board to line up 3 tiles that spell a word (S-U-N) or make
 * a sum (2+6 = 8). No Candy Crush name, no copied candy art, no
 * copied characters: the tiles are plain rounded squares in sweet
 * colours with a letter or a number on them, drawn here in CSS.
 * Sounds are the shared interactive Web Audio system
 * (synthesized, no assets). Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. Background music is
 * the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the word to spell or the sum's answer. The round's
 * target comes from the item itself: a simple sum parsed out of
 * the question (only when it really equals the answer), otherwise
 * the answer's first three letters. No new save path was needed:
 * the save route already stores prompt/answer for every type, and
 * the adapter passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per correct match, +5 bonus per cascade
 *   clear, score out of 10 x rounds (a cascade bonus can take
 *   you above that).
 * - One round (one board) per question, up to 10 rounds, shuffled
 *   once per item content. The target — the word or sum to match —
 *   is shown above the board.
 * - Tap a tile, then tap a tile next to it to swap them — or drag
 *   one tile onto its neighbour. Only a swap of two ADJACENT
 *   tiles counts; tapping a far-away tile just selects that tile
 *   instead. If a question carries its own picture (imageUrl),
 *   the picture shows above the question — it is part of the
 *   question, never decoration, never invented.
 * - A swap only stays if it lines up the target's 3 tiles in a
 *   row — across or down, in order. Those 3 tiles clear with a
 *   sparkle. A swap that lines up nothing swaps back: no points,
 *   no life lost, just a shake and a "try again" note. After a
 *   clear the tiles above fall down and new tiles drop in; if
 *   they line the target up again, that clears too — a cascade,
 *   +5 points per extra clear.
 * - Every board is built with at least one swap that completes
 *   the target, and with no target run already on it — so a round
 *   can never be unwinnable or already won. If the tiles that
 *   fall in after a match ever leave no swap, a fresh board is
 *   dealt for the same round.
 * - 60 seconds per round. Time up: -1 life, "Time's up!", round
 *   skipped. Wrong swaps never cost a life — only the timer does.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Sweet Match Complete!"). onComplete fires exactly once
 *   with the real score plus correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the round timer (the
 *   shell overlay covers the board, and the timer effect + tile
 *   handlers all require status 'playing'). Reading How to Play
 *   mid-game also freezes the timer.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the timer, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the board is generated from the game's
 *   own items, one board per question, the target is the item's
 *   own sum or word, so any question list where every item has a
 *   sum in its question or an answer of at least 3 letters plays.
 *   A lone question with neither keeps the plain message — see
 *   convert.ts. Print: NOT printable (needs its swapping board)
 *   — see print-worksheet.ts. Sitemap type list stays at 23 by
 *   decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface SweetMatchGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Sweet colours for the tiles — picked by character, so the same
 *  letter always wears the same colour. Colours never give the
 *  answer away: every tile on the board is coloured this way. */
const TILE_COLORS = [
  { bg: '#fbcfe8', fg: '#831843' },
  { bg: '#bfdbfe', fg: '#1e3a8a' },
  { bg: '#bbf7d0', fg: '#14532d' },
  { bg: '#fde68a', fg: '#713f12' },
  { bg: '#ddd6fe', fg: '#4c1d95' },
  { bg: '#fecaca', fg: '#7f1d1d' },
  { bg: '#a5f3fc', fg: '#164e63' },
  { bg: '#fed7aa', fg: '#7c2d12' },
]

function tileColor(ch: string): { bg: string; fg: string } {
  return TILE_COLORS[ch.charCodeAt(0) % TILE_COLORS.length]
}

/** A fresh board for this round, or a new one if the given board
 *  has no swap that completes the target. */
function ensureSolvable(board: SweetMatchBoard, round: SweetMatchRound): SweetMatchBoard {
  return findSwapForTarget(board, round.target) ? board : buildSweetMatchBoard(round.target)
}

function SweetMatchGame({ items, locale, onComplete, onProgress }: SweetMatchGameProps) {
  const [rounds, setRounds] = useState<SweetMatchRound[]>([])
  const [board, setBoard] = useState<SweetMatchBoard>([])
  const [selected, setSelected] = useState<SweetMatchCell | null>(null)
  const [clearing, setClearing] = useState<SweetMatchCell[]>([])
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(SWEET_MATCH_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(SWEET_MATCH_ROUND_SECONDS)
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
    const usable = items.filter((i) => i.prompt && i.answer && buildSweetMatchTarget(i.prompt, i.answer))
    const shuffled = shuffleArray(usable).slice(0, SWEET_MATCH_MAX_ROUNDS)
    const built: SweetMatchRound[] = []
    for (const item of shuffled) {
      const round: SweetMatchRound = {
        prompt: item.prompt,
        correctAnswer: item.answer,
        // buildSweetMatchTarget already proved this item works.
        target: buildSweetMatchTarget(item.prompt, item.answer)!,
        imageUrl: item.imageUrl,
        imageCredit: item.imageCredit,
      }
      built.push(round)
    }
    setRounds(built)
    setBoard([])
    setSelected(null)
    setClearing([])
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(SWEET_MATCH_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(SWEET_MATCH_ROUND_SECONDS)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(SWEET_MATCH_LIVES)
  const correctRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  const resolvingRef = useRef(false)
  const warnedRoundRef = useRef(-1)
  const dragStartRef = useRef<SweetMatchCell | null>(null)
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

  // Finish sound once: win on Sweet Match Complete, lose on game over.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

  // A fresh board whenever the round changes.
  const roundsRef = useRef(rounds)
  useEffect(() => { roundsRef.current = rounds }, [rounds])
  const currentRef = useRef(current)
  useEffect(() => { currentRef.current = current }, [current])
  useEffect(() => {
    const round = rounds[current]
    if (!round) return
    setBoard(buildSweetMatchBoard(round.target))
    setSelected(null)
    setClearing([])
    setTimeLeft(SWEET_MATCH_ROUND_SECONDS)
    warnedRoundRef.current = -1
  }, [current, rounds])

  /** Advance after the current round ends. `lostLife` already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    resolvingRef.current = false
    setFeedback(null)
    setClearing([])
    setSelected(null)
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

  /** Time up on a round: -1 life, round skipped. */
  const handleTimeUp = useCallback(() => {
    if (advancingRef.current || resolvingRef.current) return
    advancingRef.current = true
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setFeedback({ type: 'wrong', msg: "Time's up! You lost a life." })
    const from = currentRef.current
    setTimeout(() => advanceFrom(from), 1400)
  }, [advanceFrom])

  // Round timer: ticks only while the shell is playing, the
  // How-to-Play page is closed, and the game is not finished.
  // Pause and How-to-Play both freeze it; it never drains away
  // while the player cannot swap.
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
    if (timeLeft !== SWEET_MATCH_WARNING_SECONDS || shellStatus !== 'playing' || showHowto || finished) return
    if (warnedRoundRef.current === current) return
    warnedRoundRef.current = current
    playEduSound('timerWarning', readInteractiveSoundOn())
  }, [timeLeft, shellStatus, showHowto, finished, current])

  /** Judge one swap of two adjacent tiles. */
  const doSwap = useCallback((a: SweetMatchCell, b: SweetMatchCell) => {
    const round = roundsRef.current[currentRef.current]
    if (!round || board.length === 0) return
    if (advancingRef.current || resolvingRef.current) return
    const result = attemptSwap(board, round.target, a, b)
    setSelected(null)
    dragStartRef.current = null
    if (!result.matched) {
      // Wrong swap: show the swap, then swap it back. No points,
      // no life lost — just a shake and a "try again" note.
      resolvingRef.current = true
      const swapped = swapTiles(board, a, b)
      setBoard(swapped)
      setFeedback({ type: 'wrong', msg: `That swap doesn't make ${round.target.label} — try again!` })
      const original = board
      setTimeout(() => {
        setBoard(original)
        resolvingRef.current = false
      }, 450)
      return
    }
    // Correct match: sparkle on the cleared tiles, then settle the
    // board (tiles fallen, cascades resolved) and move on.
    advancingRef.current = true
    resolvingRef.current = true
    setScore((s) => s + result.points)
    scoreRef.current = scoreRef.current + result.points
    setCorrectCount((c) => c + 1)
    correctRef.current = correctRef.current + 1
    setClearing(result.cleared)
    const settled = ensureSolvable(result.board, round)
    const bonus = result.clears > 1 ? ` Cascade bonus +${SWEET_MATCH_CASCADE_BONUS * (result.clears - 1)}!` : ''
    const from = currentRef.current
    setTimeout(() => {
      setBoard(settled)
      setClearing([])
      setFeedback({
        type: 'correct',
        msg: `Sweet! +${result.points} points — you matched ${round.target.label}!${bonus}`,
      })
      setTimeout(() => advanceFrom(from), 1000)
    }, 750)
  }, [board, advanceFrom])

  function handleTilePointerDown(cell: SweetMatchCell) {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || resolvingRef.current) return
    dragStartRef.current = cell
    if (selected && areAdjacent(selected, cell)) {
      doSwap(selected, cell)
      return
    }
    if (selected && selected.row === cell.row && selected.col === cell.col) {
      setSelected(null)
      return
    }
    setSelected(cell)
    playEduSound('click', readInteractiveSoundOn())
  }

  function handleTilePointerUp(cell: SweetMatchCell) {
    const start = dragStartRef.current
    dragStartRef.current = null
    if (!start) return
    if (start.row === cell.row && start.col === cell.col) return
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || resolvingRef.current) return
    if (!areAdjacent(start, cell)) return
    doSwap(start, cell)
  }

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
    // Re-deal round 1's board here too: when the game ended on
    // round 1, `current` does not change, so the board effect
    // would not fire on its own.
    const first = roundsRef.current[0]
    if (first) setBoard(buildSweetMatchBoard(first.target))
    setLives(SWEET_MATCH_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(SWEET_MATCH_ROUND_SECONDS)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    setSelected(null)
    setClearing([])
    completedRef.current = false
    advancingRef.current = false
    resolvingRef.current = false
    warnedRoundRef.current = -1
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no questions to match yet.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🍬</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Sweet Match</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Swap the sweets to match the word or the sum.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each board asks one question. Above the board you see the target — a word to spell, like S-U-N, or a sum to make, like 2 + 6. Swap the sweets on the board until those three tiles sit in a row, across or down, in order. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> each board you finish by matching the target earns {SCORE_PER_CORRECT} points. If the sweets that fall in after your match line the target up again, that is a cascade — each extra clear earns +{SWEET_MATCH_CASCADE_BONUS} bonus points. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'board' : 'boards'}), and a cascade bonus can take you above that. Swaps that match nothing earn no points.</p>
          <p><strong>Objective:</strong> match the target on every board without running out of lives.</p>
          <p><strong>Controls:</strong> tap a sweet, then tap a sweet next to it to swap them — or drag one sweet onto its neighbour. Only sweets right next to each other (up, down, left, right) can swap. Tapping a sweet far away just selects that sweet instead.</p>
          <p><strong>Lives:</strong> you start with {SWEET_MATCH_LIVES} lives. A wrong swap costs nothing — the sweets just swap back and you try again. Only running out of time costs a life.</p>
          <p><strong>Timer:</strong> {SWEET_MATCH_ROUND_SECONDS} seconds per board. You hear one warning when 5 seconds are left. The timer pauses when you pause the game or re-read this page.</p>
          <p><strong>Rounds:</strong> one board per question, in shuffled order.</p>
          <p><strong>How you win and finish:</strong> finish every board with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many boards you matched, and how many lives are left.</p>
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
          {won ? 'Sweet Match Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} boards matched
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
  if (!round || board.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  const clearingKeys = new Set(clearing.map((cell) => `${cell.row},${cell.col}`))
  const tileBtn: CSSProperties = {
    aspectRatio: '1',
    borderRadius: 'var(--radius)',
    border: '2px solid rgba(0,0,0,0.08)',
    fontFamily: 'var(--font-display)',
    fontSize: '1.35rem',
    fontWeight: 800,
    cursor: 'pointer',
    touchAction: 'none',
    userSelect: 'none',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, SWEET_MATCH_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite" style={{ color: timeLeft <= SWEET_MATCH_WARNING_SECONDS ? 'var(--color-danger)' : undefined }}>⏱ {timeLeft}s</span>
        <span aria-live="polite">Board {current + 1} of {rounds.length}</span>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.75rem' }} aria-label={`Match ${round.target.label}`}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginRight: '0.2rem' }}>
            {round.target.kind === 'sum' ? 'Make the sum:' : 'Match:'}
          </span>
          {round.target.chars.map((ch, i) => {
            const c = tileColor(ch)
            return (
              <span key={i} aria-hidden="true" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '2.1rem', height: '2.1rem', borderRadius: 'var(--radius)',
                background: c.bg, color: c.fg, fontFamily: 'var(--font-display)',
                fontSize: '1.2rem', fontWeight: 800, border: '2px solid rgba(0,0,0,0.08)',
              }}>
                {ch}
              </span>
            )
          })}
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginLeft: '0.2rem' }}>
            {round.target.kind === 'sum' ? `= ${round.correctAnswer}` : ''}
          </span>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
          Tap a sweet, then tap a sweet next to it to swap. Line up {round.target.label} in a row!
        </p>
      </div>

      {/* The board: tap two neighbours to swap, or drag one onto its neighbour. */}
      <motion.div animate={{ x: feedback?.type === 'wrong' ? [0, -10, 10, -6, 6, 0] : 0 }} transition={{ duration: 0.4 }}>
        <div
          role="application"
          aria-label={`Sweet Match board ${current + 1} of ${rounds.length}. Match ${round.target.label} to finish this board.`}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SWEET_MATCH_COLS}, 1fr)`,
            gap: '0.35rem',
            maxWidth: '480px',
            margin: '0 auto',
            padding: '0.6rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
          }}
        >
          {board.map((rowTiles, r) =>
            rowTiles.map((ch, c) => {
              const cell: SweetMatchCell = { row: r, col: c }
              const isSelected = selected !== null && selected.row === r && selected.col === c
              const isClearing = clearingKeys.has(`${r},${c}`)
              const colors = tileColor(ch)
              return (
                <motion.button
                  key={`${r}-${c}`}
                  type="button"
                  aria-label={`Tile row ${r + 1} column ${c + 1}: ${ch}${isSelected ? ', selected' : ''}`}
                  onPointerDown={(e) => { e.preventDefault(); handleTilePointerDown(cell) }}
                  onPointerUp={() => handleTilePointerUp(cell)}
                  animate={isClearing ? { scale: [1, 1.25, 0.9, 1.15, 1], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6 }}
                  style={{
                    ...tileBtn,
                    background: isClearing ? '#fde047' : colors.bg,
                    color: colors.fg,
                    boxShadow: isSelected ? '0 0 0 3px var(--color-primary)' : undefined,
                    transform: isSelected ? 'scale(1.08)' : undefined,
                    position: 'relative',
                  }}
                >
                  {ch}
                  {isClearing && (
                    <span aria-hidden="true" style={{ position: 'absolute', top: '-0.55rem', right: '-0.25rem', fontSize: '1rem' }}>✨</span>
                  )}
                </motion.button>
              )
            }),
          )}
        </div>
      </motion.div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Tap two sweets next to each other to swap — or drag one onto its neighbour.
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

export default function SweetMatchActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Sweet Match" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <SweetMatchGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
