'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, shuffleArray } from './shared'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  CLAIM_LINE_LIVES,
  CLAIM_LINE_POINTS,
  CLAIM_LINE_QUESTION_SECONDS,
  CLAIM_LINE_WARNING_SECONDS,
  buildClaimLineQuestions,
  claimLineBoardFull,
  claimLineComputerPick,
  claimLineHasLine,
  type ClaimLineBoard,
  type ClaimLineQuestion,
} from '@/lib/claim-line'

/**
 * Claim Line — EduPlay's own board-claiming game (type 38,
 * sixth of the 8 remaining types toward 40).
 *
 * NOT a copy of any rival: no rival art, wording, or layout.
 * The board idea comes from the 2026-11-04 research file
 * (Baamboozle-style board claiming: answer to claim a
 * square, first line wins), built here as EduPlay's own
 * solo game — the player against a computer opponent that
 * takes a turn after every player attempt. Live turn-taking
 * against another player is NOT built; solo play is v1.
 *
 * NOT a duplicate of Speed Judge, TrueFalse, or Order
 * (audit, 2026-11-04 — see lib/claim-line.ts): Speed Judge
 * judges one claim at a time with no board and no
 * opponent; TrueFalse gives a verdict on one statement
 * with no board, no opponent, no lives, no timer; Order
 * arranges ALL items into one sequence and checks the
 * whole set once, with no lives, no per-item timer, and
 * retry allowed. Claim Line never judges a claim, never
 * arranges a sequence: one square at a time, one
 * question at a time, immediate feedback per move, lives
 * and a per-question timer, and a placed claim is locked
 * — it is never re-dragged.
 *
 * Data: the standard creator item shape — prompt = the
 * question, answer = the correct answer. Questions are
 * real items only (see lib/claim-line.ts); no new save
 * path was needed: the save route already stores
 * prompt/answer for every type, and the adapter passes
 * creator rows through untouched.
 *
 * Rules (exact):
 * - BOARD 3x3 (9 squares). Player token = EduPlay's star;
 *   computer token = a robot. Tap an empty square to play
 *   for it.
 * - QUESTION per square picked: prompt + options built
 *   Quiz-style from the game's own answers, shuffled.
 *   30 seconds per question, one timer warning at 5
 *   seconds left. If the game's items run out before the
 *   board ends (fewer than 9 items), the question queue
 *   reshuffles and cycles — questions repeat, but they
 *   are always real items, never invented. A single-item
 *   game plays with one option per question — playable,
 *   just easy, same as Quiz.
 * - Correct answer: +10, correct sound, score pop, the
 *   square is claimed for the player. A player line of 3
 *   (row, column, diagonal) wins at once.
 * - Wrong answer: -1 life, wrong sound, shake/red, the
 *   square stays empty. Time-up: -1 life, "Time's up!",
 *   the square stays empty.
 * - COMPUTER TURN after every player attempt (unless the
 *   game already ended): the computer claims one random
 *   empty square. No question is invented for the
 *   computer — it is the solo opponent's move. A
 *   computer line of 3 loses the game at once; 0 lives
 *   also loses at once.
 * - FULL BOARD with no line = a draw: the game ends,
 *   not won, with the real score kept.
 * - 3 lives. onComplete fires exactly once with the real
 *   score plus correct/attempt counts and lives left.
 * - Pause via the shared PlayShell freezes the question
 *   timer and the answer buttons (the timer effect +
 *   answer handler both require status 'playing').
 *   Reading How to Play mid-game also freezes the timer.
 *
 * Player-visible beats:
 * - How to Play FIRST, before any play, explaining how to
 *   play, how scores are given, the objective, the
 *   controls, the lives, the timer, the rounds, and how
 *   you win/finish — with a Skip button ("Skip
 *   instructions — start playing"). The same page is
 *   re-readable mid-game from the "How to play" button,
 *   and returning from it resumes the game; it never
 *   resets progress.
 * - Convert: COMPATIBLE — any prompt/answer game plays
 *   as Claim Line (questions from its items, board needs
 *   no special shape; see convert.ts). Print: printable
 *   as a board worksheet (empty board to mark by hand +
 *   questions with option checkboxes + key; see
 *   print-worksheet.ts and PrintExport.tsx). Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 * - NOTE from the Maze Run / Speed Judge / Spell It /
 *   Picture Answer / Memory Recall live checks: in draft
 *   Preview, the Preview shell shows its own generic
 *   "Preview Complete!" panel instead of this player's
 *   own win/lose wording. That is Preview design, not a
 *   bug here; the win/lose/draw screens below still live
 *   in the player for saved play, with their real score.
 *
 * Stability (the 2026-11-02 quiz lesson): questions are
 * built once per item CONTENT (fingerprint + ref guard),
 * never on render, so play-page timer ticks can never
 * reshuffle a game in progress. onComplete fires exactly
 * once per finished game.
 */

type ClaimLineEnd = 'win' | 'computer-line' | 'out-of-lives' | 'draw'

interface ClaimLineGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

const EMPTY_BOARD: ClaimLineBoard = [null, null, null, null, null, null, null, null, null]

function ClaimLineGame({ items, locale, onComplete, onProgress }: ClaimLineGameProps) {
  const [questions, setQuestions] = useState<ClaimLineQuestion[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [board, setBoard] = useState<ClaimLineBoard>([...EMPTY_BOARD])
  const [question, setQuestion] = useState<ClaimLineQuestion | null>(null)
  const [questionSquare, setQuestionSquare] = useState<number | null>(null)
  const [showHowto, setShowHowto] = useState(true)
  const [started, setStarted] = useState(false)
  const [lives, setLives] = useState(CLAIM_LINE_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(CLAIM_LINE_QUESTION_SECONDS)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [computerNote, setComputerNote] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [endKind, setEndKind] = useState<ClaimLineEnd | null>(null)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()

  // Build questions once per content fingerprint
  // (prompt + answer: a changed item rebuilds the game,
  // same as a changed question would).
  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    setQuestions(buildClaimLineQuestions(items, { shuffle: shuffleArray }))
    setQIndex(0)
    setBoard([...EMPTY_BOARD])
    setQuestion(null)
    setQuestionSquare(null)
    setShowHowto(true)
    setStarted(false)
    setLives(CLAIM_LINE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setAttempts(0)
    setSelected(null)
    setTimeLeft(CLAIM_LINE_QUESTION_SECONDS)
    setFeedback(null)
    setComputerNote(null)
    setFinished(false)
    setEndKind(null)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(CLAIM_LINE_LIVES)
  const correctRef = useRef(0)
  const attemptsRef = useRef(0)
  const boardRef = useRef<ClaimLineBoard>([...EMPTY_BOARD])
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  const warnedRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { correctRef.current = correctCount })
  useEffect(() => { attemptsRef.current = attempts })
  useEffect(() => { onProgress(score, finished) }, [score, finished, onProgress])

  const finishGame = useCallback((kind: ClaimLineEnd) => {
    setEndKind(kind)
    setFinished(true)
    if (!completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(scoreRef.current, {
        correctCount: correctRef.current,
        totalCount: attemptsRef.current,
        livesLeft: livesRef.current,
      })
    }
  }, [])

  // Finish sound once: win on a player line, lose on a
  // computer line or 0 lives. A draw plays no win/lose
  // sound — it is neither.
  useEffect(() => {
    if (!finished || !endKind) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    if (endKind === 'win') playEduSound('win', readInteractiveSoundOn())
    else if (endKind === 'computer-line' || endKind === 'out-of-lives') playEduSound('lose', readInteractiveSoundOn())
  }, [finished, endKind])

  /** Back to the board after a move resolves. */
  const backToBoard = useCallback(() => {
    advancingRef.current = false
    setQuestion(null)
    setQuestionSquare(null)
    setSelected(null)
    setFeedback(null)
    warnedRef.current = false
  }, [])

  /** The computer's turn: claim one random empty square, then check for its line or a draw. */
  const computerTurn = useCallback(() => {
    const pick = claimLineComputerPick(boardRef.current)
    if (pick === -1) {
      finishGame('draw')
      return
    }
    const next = [...boardRef.current]
    next[pick] = 'computer'
    boardRef.current = next
    setBoard(next)
    setComputerNote(`Computer claimed square ${pick + 1}.`)
    if (claimLineHasLine(next, 'computer')) {
      setTimeout(() => finishGame('computer-line'), 900)
      return
    }
    if (claimLineBoardFull(next)) {
      setTimeout(() => finishGame('draw'), 900)
      return
    }
    backToBoard()
  }, [finishGame, backToBoard])

  /**
   * Resolve a player attempt after the feedback beat.
   * `wasCorrect` claims were already applied to the board
   * at answer time; a wrong attempt claims nothing.
   */
  const resolveAttempt = useCallback((wasCorrect: boolean) => {
    if (wasCorrect) {
      if (claimLineHasLine(boardRef.current, 'player')) {
        finishGame('win')
        return
      }
      if (claimLineBoardFull(boardRef.current)) {
        finishGame('draw')
        return
      }
      computerTurn()
      return
    }
    if (livesRef.current <= 0) {
      finishGame('out-of-lives')
      return
    }
    computerTurn()
  }, [finishGame, computerTurn])

  /** Lose one life on a wrong answer or a time-up, then resolve after the feedback beat. */
  const wrongAttempt = useCallback((msg: string) => {
    if (advancingRef.current) return
    advancingRef.current = true
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setFeedback({ type: 'wrong', msg })
    setTimeout(() => resolveAttempt(false), 1400)
  }, [resolveAttempt])

  // Question timer: ticks only while the shell is playing,
  // a question is open, the How-to-Play page is closed,
  // and the game is not finished. Pause and How-to-Play
  // both freeze it; it never drains away while the player
  // cannot answer. The board view has no timer at all.
  useEffect(() => {
    if (shellStatus !== 'playing' || question === null || showHowto || finished) return
    const id = setInterval(() => setTimeLeft((t) => (t > 1 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [shellStatus, question, showHowto, finished])

  useEffect(() => {
    if (timeLeft !== 0 || shellStatus !== 'playing' || question === null || showHowto || finished) return
    playEduSound('wrong', readInteractiveSoundOn())
    wrongAttempt("Time's up! You lost a life.")
  }, [timeLeft, shellStatus, question, showHowto, finished, wrongAttempt])

  // Timer warning: one short warning when 5 seconds remain.
  useEffect(() => {
    if (timeLeft !== CLAIM_LINE_WARNING_SECONDS || shellStatus !== 'playing' || question === null || showHowto || finished) return
    if (warnedRef.current) return
    warnedRef.current = true
    playEduSound('timerWarning', readInteractiveSoundOn())
  }, [timeLeft, shellStatus, question, showHowto, finished])

  function startPlaying() {
    playEduSound('click', readInteractiveSoundOn())
    completedRef.current = false
    setShowHowto(false)
    setStarted(true)
  }

  function pickSquare(i: number) {
    if (shellStatus !== 'playing' || question !== null || showHowto || finished || board[i] !== null) return
    playEduSound('click', readInteractiveSoundOn())
    setComputerNote(null)
    // Take the next question; cycle the queue when the
    // game's items run out (a game with fewer than 9
    // items) — questions repeat, but always real items.
    let next: ClaimLineQuestion | undefined
    if (qIndex < questions.length) {
      next = questions[qIndex]
      setQIndex(qIndex + 1)
    } else {
      const fresh = buildClaimLineQuestions(items, { shuffle: shuffleArray })
      setQuestions(fresh)
      next = fresh[0]
      setQIndex(1)
    }
    if (!next) return
    setQuestionSquare(i)
    setQuestion(next)
    setSelected(null)
    setFeedback(null)
    setTimeLeft(CLAIM_LINE_QUESTION_SECONDS)
    warnedRef.current = false
  }

  function handleSelect(idx: number) {
    if (shellStatus !== 'playing' || question === null || questionSquare === null || showHowto || finished || advancingRef.current || selected !== null) return
    const q = question
    const square = questionSquare
    setSelected(idx)
    setAttempts((a) => a + 1)
    attemptsRef.current = attemptsRef.current + 1
    if (idx === q.correctIndex) {
      playEduSound('correct', readInteractiveSoundOn())
      setScore((s) => s + CLAIM_LINE_POINTS)
      scoreRef.current = scoreRef.current + CLAIM_LINE_POINTS
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      const next = [...boardRef.current]
      next[square] = 'player'
      boardRef.current = next
      setBoard(next)
      setFeedback({ type: 'correct', msg: 'Correct! +10 points — you claimed the square!' })
      advancingRef.current = true
      setTimeout(() => resolveAttempt(true), 1400)
    } else {
      playEduSound('wrong', readInteractiveSoundOn())
      wrongAttempt('Wrong answer! You lost a life.')
    }
  }

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    setQuestions(buildClaimLineQuestions(items, { shuffle: shuffleArray }))
    setQIndex(0)
    setBoard([...EMPTY_BOARD])
    boardRef.current = [...EMPTY_BOARD]
    setQuestion(null)
    setQuestionSquare(null)
    setShowHowto(true)
    setStarted(false)
    setLives(CLAIM_LINE_LIVES)
    livesRef.current = CLAIM_LINE_LIVES
    setScore(0)
    scoreRef.current = 0
    setCorrectCount(0)
    correctRef.current = 0
    setAttempts(0)
    attemptsRef.current = 0
    setSelected(null)
    setTimeLeft(CLAIM_LINE_QUESTION_SECONDS)
    setFeedback(null)
    setComputerNote(null)
    setFinished(false)
    setEndKind(null)
    completedRef.current = false
    advancingRef.current = false
    warnedRef.current = false
  }

  if (questions.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no questions to claim with yet.
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
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Claim Line</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Answer to claim squares — first line of 3 wins.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> a 3×3 board. Tap an empty square, then answer its question. A correct answer claims that square for you (⭐). After every one of your attempts, the computer takes a turn and claims a random empty square (🤖). A square you claim is locked — it is never moved.</p>
          <p><strong>How scores are given:</strong> each correct answer earns {CLAIM_LINE_POINTS} points — one claimed square is {CLAIM_LINE_POINTS} points. Wrong answers never score, even though the computer still takes its turn.</p>
          <p><strong>Objective:</strong> be the first to hold a full line of 3 squares — a row, a column, or a diagonal.</p>
          <p><strong>Controls:</strong> tap an empty square to play for it, then tap one answer option.</p>
          <p><strong>Lives:</strong> you start with {CLAIM_LINE_LIVES} lives. A wrong answer costs 1 life, and so does letting a question&apos;s timer run out. The board view has no timer and costs no lives.</p>
          <p><strong>Timer:</strong> {CLAIM_LINE_QUESTION_SECONDS} seconds per question. You hear one warning when {CLAIM_LINE_WARNING_SECONDS} seconds are left. The timer pauses when you pause the game or re-read this page.</p>
          <p><strong>Rounds:</strong> up to 9 squares, one question per square you pick. If the game has fewer questions than squares, questions repeat — they are always the game&apos;s own questions, never invented ones.</p>
          <p><strong>How you win and finish:</strong> hold a line of 3 and you win. If the computer holds a line of 3 first, or you reach 0 lives, the game ends. If the board fills up with no line, it is a draw — your score still counts. The end screen shows your score, how many you got right, and how many lives are left.</p>
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
    const title =
      endKind === 'win' ? 'Claim Line Complete!'
      : endKind === 'computer-line' ? 'The computer claimed a line!'
      : endKind === 'out-of-lives' ? 'Out of lives!'
      : "It's a draw!"
    const emoji = endKind === 'win' ? '🏆' : endKind === 'draw' ? '🤝' : '💔'
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">{emoji}</div>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
          {title}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          Score: {score}
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {attempts} correct
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

  // ---- Question view: one square at a time, under the timer. ----
  if (question !== null && questionSquare !== null) {
    const timerPct = (timeLeft / CLAIM_LINE_QUESTION_SECONDS) * 100
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
          <motion.span key={score} initial={{ scale: 1.35 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }} style={{ display: 'inline-block' }} aria-live="polite">Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong></motion.span>
          <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, CLAIM_LINE_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
          <span aria-live="polite" style={{ color: timeLeft <= CLAIM_LINE_WARNING_SECONDS ? 'var(--color-danger)' : undefined }}>⏱ {timeLeft}s</span>
          <span aria-live="polite">Square {questionSquare + 1} of 9</span>
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
        <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
          <motion.div style={{
            height: '100%', borderRadius: 'var(--radius)',
            background: timerPct > 50 ? 'var(--color-success)' : timerPct > 20 ? 'var(--color-warning)' : 'var(--color-danger)',
          }} animate={{ width: `${timerPct}%` }} transition={{ duration: 1, ease: 'linear' }} />
        </div>

        <motion.div animate={{ x: feedback?.type === 'wrong' ? [0, -8, 8, -4, 4, 0] : 0 }} transition={{ duration: 0.4 }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '0.75rem' }}>
            🎯 Answer to claim square {questionSquare + 1}.
          </p>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.25rem',
            color: 'var(--color-text-primary)', fontSize: '1.125rem',
            fontFamily: 'var(--font-display)', boxShadow: 'var(--shadow-card)', textAlign: 'center',
          }}>
            {question.prompt}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {question.options.map((opt, idx) => {
              let bg = 'var(--color-surface)'
              let border = 'var(--color-border)'
              let color = 'var(--color-text-primary)'
              if (selected !== null) {
                if (idx === question.correctIndex) { bg = 'var(--color-success)'; border = 'var(--color-success)'; color = '#fff' }
                else if (idx === selected) { bg = 'var(--color-danger)'; border = 'var(--color-danger)'; color = '#fff' }
              }
              return (
                <motion.button key={idx} onClick={() => handleSelect(idx)}
                  whileHover={selected === null ? { scale: 1.02 } : {}}
                  whileTap={selected === null ? { scale: 0.98 } : {}}
                  aria-pressed={selected === idx} aria-label={`Option ${idx + 1}: ${opt}`}
                  style={{
                    background: bg, border: `2px solid ${border}`, borderRadius: 'var(--radius)',
                    padding: '0.875rem 1rem', color, fontSize: '0.95rem',
                    cursor: selected !== null ? 'default' : 'pointer',
                    textAlign: rtl ? 'right' : 'left',
                    transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {opt}
                </motion.button>
              )
            })}
          </div>
        </motion.div>

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

  // ---- Board view: tap an empty square to play for it. ----
  const playerSquares = board.filter((m) => m === 'player').length
  const computerSquares = board.filter((m) => m === 'computer').length
  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <motion.span key={score} initial={{ scale: 1.35 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }} style={{ display: 'inline-block' }} aria-live="polite">Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong></motion.span>
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, CLAIM_LINE_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite">⭐ You: {playerSquares} · 🤖 Computer: {computerSquares}</span>
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
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '0.25rem' }}>
        Your turn — tap an empty square to play for it. First line of 3 wins.
      </p>
      {computerNote && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '0.75rem' }} aria-live="polite">
          {computerNote}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', maxWidth: '420px', margin: '1rem auto' }}>
        {board.map((mark, i) => (
          <motion.button
            key={i}
            onClick={() => pickSquare(i)}
            whileHover={mark === null ? { scale: 1.03 } : {}}
            whileTap={mark === null ? { scale: 0.97 } : {}}
            aria-label={mark === 'player' ? `Square ${i + 1}: claimed by you` : mark === 'computer' ? `Square ${i + 1}: claimed by the computer` : `Square ${i + 1}: empty, tap to play for it`}
            style={{
              aspectRatio: '1',
              minHeight: '96px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem',
              background: mark === 'player'
                ? 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))'
                : mark === 'computer'
                  ? 'color-mix(in srgb, var(--color-danger) 12%, var(--color-surface))'
                  : 'var(--color-surface)',
              border: `2px solid ${mark === 'player' ? 'var(--color-success)' : mark === 'computer' ? 'var(--color-danger)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-lg)',
              cursor: mark === null ? 'pointer' : 'default',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {mark === 'player' ? '⭐' : mark === 'computer' ? '🤖' : ''}
          </motion.button>
        ))}
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
        ⭐ = your squares · 🤖 = the computer&apos;s squares · a line of 3 wins
      </p>
    </div>
  )
}

export default function ClaimLineActivity({ items, theme, locale, onComplete }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Claim Line" score={shellScore} finished={shellFinished} onElapsed={handleElapsed}>
      <ClaimLineGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
