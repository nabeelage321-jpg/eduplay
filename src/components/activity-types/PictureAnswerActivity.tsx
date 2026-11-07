'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, isRTL, shuffleArray } from './shared'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import type { ActivityItem } from '@/types'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  PICTURE_ANSWER_LIVES,
  PICTURE_ANSWER_POINTS,
  PICTURE_ANSWER_ROUND_SECONDS,
  PICTURE_ANSWER_WARNING_SECONDS,
  buildPictureAnswerRounds,
  type PictureAnswerRound,
} from '@/lib/picture-answer'

/**
 * Picture Answer — EduPlay's own picture-question game (type
 * 36, fourth of the 8 remaining types toward 40).
 *
 * NOT a copy of any rival: no rival art, wording, or layout.
 * Each round shows the question's picture when the teacher
 * supplied one, plus the clue, and the player picks the
 * correct answer from four options built from the game's own
 * answers. Sounds are the shared interactive Web Audio
 * system (synthesized, no assets). Sound is ON by default
 * for this game; the in-player toggle mutes it in one tap.
 *
 * Data: the standard creator item shape — prompt = question
 * about the picture, answer = correct answer, imageUrl = the
 * teacher's own or CC-licensed picture URL for that question
 * (pasted per item in the creator; no upload infrastructure).
 * Rounds are real items only (see lib/picture-answer.ts); no
 * new save path was needed: the save route already stores
 * prompt/answer/imageUrl for every type, and the adapter
 * passes creator rows through untouched.
 *
 * Honest picture rule: a picture is shown ONLY when the item
 * carries an imageUrl. An item with none shows a plainly
 * labelled no-picture state ("No picture for this question —
 * answer from the clue.") — never a fake, stock, or
 * AI-generated picture, and never a claim that a picture
 * exists when it does not. A picture URL that fails to load
 * falls back to the same no-picture state, never a broken
 * image icon. Programme games carry no imageUrl (the known
 * labelled-diagram limit), so their rounds play clue-only
 * until a teacher pastes pictures.
 *
 * Rules (exact):
 * - 3 lives. 10 points per correct answer, score out of
 *   10 x rounds. One round per item, rounds shuffled once
 *   per item content.
 * - Correct answer: +10, correct sound, score pop, next
 *   round after a short feedback beat. Wrong answer: -1
 *   life, wrong sound, shake/red, next round.
 * - 30 seconds per round. At 5 seconds left, one
 *   timer-warning sound. Time up: -1 life, "Time's up!",
 *   round skipped.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win ("Picture Answer Complete!"). onComplete
 *   fires exactly once with the real score plus
 *   correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the round timer
 *   and the answer buttons (the timer effect + answer
 *   handler both require status 'playing'). Reading How to
 *   Play mid-game also freezes the timer.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the timer, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — any prompt/answer game plays as
 *   Picture Answer (picture shown when present, honest
 *   no-picture state otherwise; see convert.ts). Print:
 *   printable as a picture worksheet (picture when present,
 *   clue + option checkboxes, key lists the answer — see
 *   print-worksheet.ts and PrintExport.tsx). Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 * - NOTE from the Maze Run / Speed Judge / Spell It live
 *   checks: in draft Preview, the Preview shell shows its
 *   own generic "Preview Complete!" panel instead of this
 *   player's own win/lose wording. That is Preview design,
 *   not a bug here; the win/lose screens below still live
 *   in the player for saved play, with their real score.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built
 * once per item CONTENT (fingerprint + ref guard), never on
 * render, so play-page timer ticks can never reshuffle a
 * game in progress. onComplete fires exactly once per
 * finished game.
 */

interface PictureAnswerGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

function PictureAnswerGame({ items, locale, onComplete, onProgress }: PictureAnswerGameProps) {
  const [rounds, setRounds] = useState<PictureAnswerRound[]>([])
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(PICTURE_ANSWER_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(PICTURE_ANSWER_ROUND_SECONDS)
  const [imageFailed, setImageFailed] = useState<Set<number>>(new Set())
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()

  // Build rounds once per content fingerprint (prompt + answer
  // + picture URL: a changed picture rebuilds the game, same
  // as a changed question would).
  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}\u0000${(i as { imageUrl?: string }).imageUrl ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    const built = buildPictureAnswerRounds(items, { shuffle: shuffleArray })
    setRounds(built)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(PICTURE_ANSWER_LIVES)
    setScore(0)
    setCorrectCount(0)
    setSelected(null)
    setTimeLeft(PICTURE_ANSWER_ROUND_SECONDS)
    setImageFailed(new Set())
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(PICTURE_ANSWER_LIVES)
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

  // Finish sound once: win on Picture Answer Complete, lose on game over.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

  /** Advance after the current round ends. `lostLife` already applied. */
  const advanceFrom = useCallback((from: number, wasCorrect: boolean) => {
    advancingRef.current = false
    setSelected(null)
    setFeedback(null)
    if (wasCorrect) {
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
    }
    if (livesRef.current <= 0) {
      finishGame(false)
      return
    }
    if (from + 1 >= rounds.length) {
      finishGame(true)
      return
    }
    setCurrent(from + 1)
    setTimeLeft(PICTURE_ANSWER_ROUND_SECONDS)
    warnedRoundRef.current = -1
  }, [finishGame])

  /** Lose one life and skip the current round (time-up). */
  const loseLifeAndSkip = useCallback((msg: string) => {
    if (advancingRef.current) return
    advancingRef.current = true
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setFeedback({ type: 'wrong', msg })
    const from = current
    setTimeout(() => advanceFrom(from, false), 1400)
  }, [current, advanceFrom])

  // Round timer: ticks only while the shell is playing, the
  // How-to-Play page is closed, and the game is not finished.
  // Pause and How-to-Play both freeze it; it never drains away
  // while the player cannot answer.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => setTimeLeft((t) => (t > 1 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current])

  useEffect(() => {
    if (timeLeft !== 0 || shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    loseLifeAndSkip("Time's up! You lost a life.")
  }, [timeLeft, shellStatus, showHowto, finished, rounds.length, loseLifeAndSkip])

  // Timer warning: one short warning when 5 seconds remain.
  useEffect(() => {
    if (timeLeft !== PICTURE_ANSWER_WARNING_SECONDS || shellStatus !== 'playing' || showHowto || finished) return
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

  function handleSelect(idx: number) {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || selected !== null) return
    const round = rounds[current]
    if (!round) return
    setSelected(idx)
    if (idx === round.correctIndex) {
      playEduSound('correct', readInteractiveSoundOn())
      setScore((s) => s + PICTURE_ANSWER_POINTS)
      scoreRef.current = scoreRef.current + PICTURE_ANSWER_POINTS
      setFeedback({ type: 'correct', msg: 'Correct! +10 points.' })
      advancingRef.current = true
      const from = current
      setTimeout(() => advanceFrom(from, true), 1400)
    } else {
      playEduSound('wrong', readInteractiveSoundOn())
      setLives((l) => Math.max(0, l - 1))
      livesRef.current = Math.max(0, livesRef.current - 1)
      setFeedback({ type: 'wrong', msg: 'Wrong answer! You lost a life.' })
      advancingRef.current = true
      const from = current
      setTimeout(() => advanceFrom(from, false), 1400)
    }
  }

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(PICTURE_ANSWER_LIVES)
    setScore(0)
    setCorrectCount(0)
    setSelected(null)
    setTimeLeft(PICTURE_ANSWER_ROUND_SECONDS)
    setImageFailed(new Set())
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
        This game has no questions to answer yet.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🖼️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Picture Answer</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Look at the picture, read the clue, pick the right answer.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each round shows a picture (when the teacher added one for that question) and a clue. Pick the answer that fits the picture and the clue, from the four options. A question with no picture says so plainly — answer it from the clue alone; no picture is ever faked for you.</p>
          <p><strong>How scores are given:</strong> each correct answer earns {PICTURE_ANSWER_POINTS} points. The game is scored out of {rounds.length * PICTURE_ANSWER_POINTS} ({rounds.length} {rounds.length === 1 ? 'question' : 'questions'}).</p>
          <p><strong>Objective:</strong> answer every question, without running out of lives.</p>
          <p><strong>Controls:</strong> tap or click one of the four answer options.</p>
          <p><strong>Lives:</strong> you start with {PICTURE_ANSWER_LIVES} lives. A wrong answer costs 1 life, and so does letting a round&apos;s timer run out.</p>
          <p><strong>Timer:</strong> {PICTURE_ANSWER_ROUND_SECONDS} seconds per round. You hear one warning when {PICTURE_ANSWER_WARNING_SECONDS} seconds are left. The timer pauses when you pause the game or re-read this page.</p>
          <p><strong>Rounds:</strong> one question per round, in shuffled order.</p>
          <p><strong>How you win and finish:</strong> answer every question with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many you got right, and how many lives are left.</p>
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
          {won ? 'Picture Answer Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          Score: {score} / {rounds.length * SCORE_PER_CORRECT}
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} correct
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

  const hasPicture = Boolean(round.imageUrl) && !imageFailed.has(current)
  const timerPct = (timeLeft / PICTURE_ANSWER_ROUND_SECONDS) * 100

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <motion.span key={score} initial={{ scale: 1.35 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }} style={{ display: 'inline-block' }} aria-live="polite">Score: <strong style={{ color: 'var(--color-primary)' }}>{score} / {rounds.length * SCORE_PER_CORRECT}</strong></motion.span>
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, PICTURE_ANSWER_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite" style={{ color: timeLeft <= PICTURE_ANSWER_WARNING_SECONDS ? 'var(--color-danger)' : undefined }}>⏱ {timeLeft}s</span>
        <span aria-live="polite">Question {current + 1} of {rounds.length}</span>
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
        {/* Picture area: the item's own picture only, or an honest no-picture state. */}
        {hasPicture ? (
          <img
            src={round.imageUrl}
            alt=""
            onError={() => setImageFailed((prev) => new Set(prev).add(current))}
            style={{
              display: 'block', width: '100%', maxHeight: '300px', objectFit: 'cover',
              borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', marginBottom: '1rem',
            }}
          />
        ) : (
          <div style={{
            background: 'var(--color-surface-alt)', border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1rem',
            color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '0.95rem',
          }}>
            <div style={{ fontSize: '2rem', lineHeight: 1, marginBottom: '0.4rem' }} aria-hidden="true">🖼️</div>
            No picture for this question — answer from the clue.
          </div>
        )}

        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.25rem',
          color: 'var(--color-text-primary)', fontSize: '1.125rem',
          fontFamily: 'var(--font-display)', boxShadow: 'var(--shadow-card)', textAlign: 'center',
        }}>
          {round.prompt || 'Look at the picture — which answer fits it?'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {round.options.map((opt, idx) => {
            let bg = 'var(--color-surface)'
            let border = 'var(--color-border)'
            let color = 'var(--color-text-primary)'
            if (selected !== null) {
              if (idx === round.correctIndex) { bg = 'var(--color-success)'; border = 'var(--color-success)'; color = '#fff' }
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

export default function PictureAnswerActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Picture Answer" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <PictureAnswerGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
