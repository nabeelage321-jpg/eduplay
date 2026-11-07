'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, SCORE_PER_CORRECT, shuffleArray } from './shared'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import type { ActivityItem } from '@/types'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  SPEED_JUDGE_LIVES,
  SPEED_JUDGE_ROUND_SECONDS,
  SPEED_JUDGE_WARNING_SECONDS,
  buildSpeedJudgeRounds,
  type SpeedJudgeRound,
} from '@/lib/speed-judge'

/**
 * Speed Judge — EduPlay's own fast-judgement game (type 34,
 * second of the 8 remaining types toward 40).
 *
 * NOT a copy of any rival: no rival art, wording, or layout. The
 * player is shown a claim — a question plus a claimed answer —
 * and must judge it fast: Correct if the claimed answer really
 * answers the question, Wrong if it does not. Sounds are the
 * shared interactive Web Audio system (synthesized, no assets).
 * Sound is ON by default for this game; the in-player toggle
 * mutes it in one tap.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = correct answer. A true claim uses the item's own
 * answer; a false claim uses ANOTHER item's answer from the same
 * game (see lib/speed-judge.ts). No new save path was needed:
 * the save route already stores prompt/answer for every type,
 * and the adapter passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per correct judgement, score out of
 *   10 x rounds. NO speed bonus: speed matters only through
 *   the timer; every correct judgement is worth the same 10
 *   points, fast or slow.
 * - One round per question, rounds shuffled once per item
 *   content. The claim sits big in the middle; the player taps
 *   Correct or Wrong.
 * - Correct judgement: +10, correct sound, score pop, then the
 *   next round. Wrong judgement: -1 life, wrong sound,
 *   shake/red, then the next round.
 * - 10 seconds per round. At 3 seconds left, one timer-warning
 *   sound. Time up: -1 life, "Time's up!", round skipped.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Speed Judge Complete!"). onComplete fires exactly
 *   once with the real score plus correct/total counts and
 *   lives left.
 * - Pause via the shared PlayShell freezes the round timer and
 *   the buttons (the timer effect + judge handler both require
 *   status 'playing'). Reading How to Play mid-game also
 *   freezes the timer.
 *
 * Player-visible beats:
 * - How to Play FIRST, before any play, explaining how to play,
 *   how scores are given, the objective, the controls, the
 *   lives, the timer, the rounds, and how you win/finish — with
 *   a Skip button ("Skip instructions — start playing"). The
 *   same page is re-readable mid-game from the "How to play"
 *   button, and returning from it resumes the game; it never
 *   resets progress.
 * - Convert: COMPATIBLE (any prompt/answer game plays as
 *   judgements — see convert.ts). Print: printable as a
 *   judgement worksheet (claim + Correct/Wrong boxes, key of
 *   judgements — see print-worksheet.ts and PrintExport.tsx).
 *   Sitemap type list stays at 23 by decision — see
 *   seo/sitemap.ts.
 * - NOTE from the Maze Run live checks: in draft Preview, the
 *   Preview shell shows its own generic "Preview Complete!"
 *   panel instead of this player's own win/lose wording. That
 *   is Preview design, not a bug here; the win/lose screens
 *   below still live in the player for saved play, with their
 *   real score.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

type Judgement = 'correct' | 'wrong'

interface SpeedJudgeGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

function SpeedJudgeGame({ items, locale, onComplete, onProgress }: SpeedJudgeGameProps) {
  const [rounds, setRounds] = useState<SpeedJudgeRound[]>([])
  const [showHowto, setShowHowto] = useState(true)
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(SPEED_JUDGE_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState(SPEED_JUDGE_ROUND_SECONDS)
  const [judged, setJudged] = useState<Judgement | null>(null)
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
    const built = buildSpeedJudgeRounds(items, { shuffle: shuffleArray })
    setRounds(built)
    setShowHowto(true)
    setStarted(false)
    setCurrent(0)
    setLives(SPEED_JUDGE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(SPEED_JUDGE_ROUND_SECONDS)
    setJudged(null)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(SPEED_JUDGE_LIVES)
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

  // Finish sound once: win on Speed Judge Complete, lose on game over.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

  /** Advance after the current round ends. `lostLife` already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setJudged(null)
    setFeedback(null)
    if (livesRef.current <= 0) {
      finishGame(false)
      return
    }
    if (from + 1 >= rounds.length) {
      finishGame(true)
      return
    }
    setCurrent(from + 1)
    setTimeLeft(SPEED_JUDGE_ROUND_SECONDS)
    warnedRoundRef.current = -1
  }, [finishGame])

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
  // while the player cannot judge.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => setTimeLeft((t) => (t > 1 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current])

  useEffect(() => {
    if (timeLeft !== 0 || shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    handleTimeUp()
  }, [timeLeft, shellStatus, showHowto, finished, rounds.length, handleTimeUp])

  // Timer warning: one short warning when 3 seconds remain.
  useEffect(() => {
    if (timeLeft !== SPEED_JUDGE_WARNING_SECONDS || shellStatus !== 'playing' || showHowto || finished) return
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

  function handleJudge(judgement: Judgement) {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || judged !== null) return
    const round = rounds[current]
    if (!round) return
    advancingRef.current = true
    setJudged(judgement)
    if (judgement === round.correctJudgement) {
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      setFeedback({ type: 'correct', msg: `Correct judgement! +${SCORE_PER_CORRECT} points.` })
      const from = current
      setTimeout(() => advanceFrom(from), 1200)
    } else {
      setLives((l) => Math.max(0, l - 1))
      livesRef.current = Math.max(0, livesRef.current - 1)
      setFeedback({ type: 'wrong', msg: 'Wrong judgement! You lost a life.' })
      const from = current
      setTimeout(() => advanceFrom(from), 1400)
    }
  }

  // Keyboard: C for Correct, W for Wrong. Guarded by the same
  // rules as the buttons (handleJudge re-checks them anyway).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || judged !== null) return
      const key = e.key.toLowerCase()
      if (key === 'c') { e.preventDefault(); handleJudge('correct') }
      else if (key === 'w') { e.preventDefault(); handleJudge('wrong') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // handleJudge reads current render state; re-subscribe on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellStatus, showHowto, finished, current, judged, rounds])

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    setShowHowto(true)
    setStarted(false)
    setCurrent(0)
    setLives(SPEED_JUDGE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setTimeLeft(SPEED_JUDGE_ROUND_SECONDS)
    setJudged(null)
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
        This game has no questions to judge yet.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">⚡</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Speed Judge</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Read the claim, judge it fast — right or wrong?
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each round shows one claim: a question plus an answer that is claimed for it. Tap <strong>Correct</strong> if the claimed answer really answers the question, or <strong>Wrong</strong> if it does not. Some claims are true, some are false — a false claim uses a real answer from this same game, attached to the wrong question.</p>
          <p><strong>How scores are given:</strong> each correct judgement earns {SCORE_PER_CORRECT} points. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}). There is no speed bonus: a fast correct judgement and a slow one are worth the same 10 points — speed matters only because the timer runs out.</p>
          <p><strong>Objective:</strong> judge every claim correctly, without running out of lives.</p>
          <p><strong>Controls:</strong> tap the big Correct or Wrong button. On a keyboard, press C for Correct or W for Wrong.</p>
          <p><strong>Lives:</strong> you start with {SPEED_JUDGE_LIVES} lives. A wrong judgement costs 1 life. A round you run out of time on also costs 1 life.</p>
          <p><strong>Timer:</strong> {SPEED_JUDGE_ROUND_SECONDS} seconds per round. You hear one warning when {SPEED_JUDGE_WARNING_SECONDS} seconds are left. The timer pauses when you pause the game or re-read this page.</p>
          <p><strong>Rounds:</strong> one claim per question, in shuffled order.</p>
          <p><strong>How you win and finish:</strong> finish every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many judgements you got right, and how many lives are left.</p>
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
          {won ? 'Speed Judge Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          Score: {score} / {rounds.length * SCORE_PER_CORRECT}
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} judgements correct
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

  const judgeBtn = (isCorrectBtn: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '1.1rem 0.5rem',
    borderRadius: 'var(--radius-lg)',
    border: '2px solid var(--color-border)',
    background:
      judged !== null
        ? (isCorrectBtn ? round.correctJudgement === 'correct' : round.correctJudgement === 'wrong')
          ? 'var(--color-success)'
          : judged === (isCorrectBtn ? 'correct' : 'wrong')
            ? 'var(--color-danger)'
            : 'var(--color-surface)'
        : 'var(--color-surface)',
    color:
      judged !== null &&
      ((isCorrectBtn ? round.correctJudgement === 'correct' : round.correctJudgement === 'wrong') ||
        judged === (isCorrectBtn ? 'correct' : 'wrong'))
        ? '#fff'
        : 'var(--color-text-primary)',
    fontFamily: 'var(--font-display)',
    fontSize: '1.15rem',
    cursor: judged !== null ? 'default' : 'pointer',
  })

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <motion.span key={score} initial={{ scale: 1.35 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }} style={{ display: 'inline-block' }} aria-live="polite">Score: <strong style={{ color: 'var(--color-primary)' }}>{score} / {rounds.length * SCORE_PER_CORRECT}</strong></motion.span>
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, SPEED_JUDGE_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite" style={{ color: timeLeft <= SPEED_JUDGE_WARNING_SECONDS ? 'var(--color-danger)' : undefined }}>⏱ {timeLeft}s</span>
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

      <motion.div animate={{ x: feedback?.type === 'wrong' ? [0, -10, 10, -6, 6, 0] : 0 }} transition={{ duration: 0.4 }}>
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.25rem',
          color: 'var(--color-text-primary)', textAlign: 'center', boxShadow: 'var(--shadow-card)',
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}>
            Is this claim right?
          </p>
          <p style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {round.prompt}
          </p>
          <p style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', margin: '0.75rem 0 0', color: 'var(--color-primary)' }}>
            → {round.claimedAnswer}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" aria-label="Judge this claim correct" onClick={() => handleJudge('correct')} style={judgeBtn(true)}>
            ✅ Correct
          </button>
          <button type="button" aria-label="Judge this claim wrong" onClick={() => handleJudge('wrong')} style={judgeBtn(false)}>
            ❌ Wrong
          </button>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Keyboard: C for Correct, W for Wrong. Judge before the timer runs out!
        </p>
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

export default function SpeedJudgeActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Speed Judge" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <SpeedJudgeGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
