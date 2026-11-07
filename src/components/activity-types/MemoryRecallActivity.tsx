'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, isRTL, shuffleArray } from './shared'
import ScorePill from '@/components/game/ScorePill'
import { HowToPlayButton, LivesHearts, QUESTION_CARD_STYLE, RoundPill, TimerChip } from '@/components/game/PlayChrome'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  MEMORY_RECALL_LIVES,
  MEMORY_RECALL_POINTS,
  MEMORY_RECALL_ROUND_SECONDS,
  MEMORY_RECALL_WARNING_SECONDS,
  buildMemoryRecallPairs,
  buildMemoryRecallRounds,
  type MemoryRecallPair,
  type MemoryRecallRound,
} from '@/lib/memory-recall'

/**
 * Memory Recall — EduPlay's own study-then-recall game (type
 * 37, fifth of the 8 remaining types toward 40).
 *
 * NOT a copy of any rival: no rival art, wording, or layout.
 * NOT a rename of Memory Match or Flashcards (audit,
 * 2026-11-04 — see lib/memory-recall.ts): Memory Match flips
 * face-down tiles to pair prompt with answer with everything
 * on screen, no lives, no timer; Flashcards reveal the answer
 * on tap and let the player grade themselves. Memory Recall
 * is different in kind: a STUDY phase shows every pair at
 * once, then a RECALL phase hides the pairs entirely and the
 * player answers each prompt from memory, under 3 lives and
 * a 30-second timer per round. The answer is never revealed
 * on demand during recall and the player never grades
 * themselves.
 *
 * Data: the standard creator item shape — prompt = what to
 * remember, answer = what to recall. Rounds are real items
 * only (see lib/memory-recall.ts); no new save path was
 * needed: the save route already stores prompt/answer for
 * every type, and the adapter passes creator rows through
 * untouched.
 *
 * Rules (exact):
 * - STUDY (untimed): every pair shown at once, in the game's
 *   own order. The player taps "Start recall" when ready.
 *   Once recall starts, the pairs are hidden and can never
 *   be peeked at again — that is the test.
 * - RECALL: 3 lives. 10 points per correct recall, score out
 *   of 10 x rounds. One round per usable item, rounds
 *   shuffled once per item content. Each round shows the
 *   prompt ONLY, plus options = the correct answer + up to
 *   3 other items' answers, shuffled. A single-item game
 *   has only its own answer to offer, so it plays with one
 *   option — playable, just easy, same as Quiz.
 * - Correct recall: +10, correct sound, score pop, next
 *   round after a short feedback beat. Wrong recall: -1
 *   life, wrong sound, shake/red, next round. The correct
 *   option shows green after answering, so a wrong recall
 *   still teaches the pair — but it never scores.
 * - 30 seconds per recall round. At 5 seconds left, one
 *   timer-warning sound. Time up: -1 life, "Time's up!",
 *   round skipped. The study phase has no timer.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win ("Memory Recall Complete!"). onComplete
 *   fires exactly once with the real score plus
 *   correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the recall timer
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
 *   Memory Recall (study its pairs, recall them; see
 *   convert.ts). Print: printable as a recall worksheet
 *   (prompt + writing line, key lists the answer — see
 *   print-worksheet.ts and PrintExport.tsx). Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 * - NOTE from the Maze Run / Speed Judge / Spell It /
 *   Picture Answer live checks: in draft Preview, the
 *   Preview shell shows its own generic "Preview Complete!"
 *   panel instead of this player's own win/lose wording.
 *   That is Preview design, not a bug here; the win/lose
 *   screens below still live in the player for saved play,
 *   with their real score.
 *
 * Stability (the 2026-11-02 quiz lesson): pairs and rounds
 * are built once per item CONTENT (fingerprint + ref
 * guard), never on render, so play-page timer ticks can
 * never reshuffle a game in progress. onComplete fires
 * exactly once per finished game.
 */

type RecallPhase = 'study' | 'recall'

interface MemoryRecallGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean, total?: number) => void
}

function MemoryRecallGame({ items, locale, onComplete, onProgress }: MemoryRecallGameProps) {
  const [pairs, setPairs] = useState<MemoryRecallPair[]>([])
  const [rounds, setRounds] = useState<MemoryRecallRound[]>([])
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [phase, setPhase] = useState<RecallPhase>('study')
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(MEMORY_RECALL_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(MEMORY_RECALL_ROUND_SECONDS)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()

  // Build pairs and rounds once per content fingerprint
  // (prompt + answer: a changed pair rebuilds the game,
  // same as a changed question would).
  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    setPairs(buildMemoryRecallPairs(items))
    setRounds(buildMemoryRecallRounds(items, { shuffle: shuffleArray }))
    setShowHowto(false)
    setStarted(true)
    setPhase('study')
    setCurrent(0)
    setLives(MEMORY_RECALL_LIVES)
    setScore(0)
    setCorrectCount(0)
    setSelected(null)
    setTimeLeft(MEMORY_RECALL_ROUND_SECONDS)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(MEMORY_RECALL_LIVES)
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
  useEffect(() => { onProgress(score, finished, rounds.length * MEMORY_RECALL_POINTS) }, [score, finished, onProgress])

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

  // Finish sound once: win on Memory Recall Complete, lose on game over.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

  /** Advance after the current recall round ends. `lostLife` already applied. */
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
    setTimeLeft(MEMORY_RECALL_ROUND_SECONDS)
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

  // Recall timer: ticks only while the shell is playing, the
  // recall phase is active, the How-to-Play page is closed,
  // and the game is not finished. Pause and How-to-Play both
  // freeze it; it never drains away while the player cannot
  // answer. The study phase has no timer at all.
  useEffect(() => {
    if (shellStatus !== 'playing' || phase !== 'recall' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => setTimeLeft((t) => (t > 1 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [shellStatus, phase, showHowto, finished, rounds.length, current])

  useEffect(() => {
    if (timeLeft !== 0 || shellStatus !== 'playing' || phase !== 'recall' || showHowto || finished || rounds.length === 0) return
    loseLifeAndSkip("Time's up! You lost a life.")
  }, [timeLeft, shellStatus, phase, showHowto, finished, rounds.length, loseLifeAndSkip])

  // Timer warning: one short warning when 5 seconds remain.
  useEffect(() => {
    if (timeLeft !== MEMORY_RECALL_WARNING_SECONDS || shellStatus !== 'playing' || phase !== 'recall' || showHowto || finished) return
    if (warnedRoundRef.current === current) return
    warnedRoundRef.current = current
    playEduSound('timerWarning', readInteractiveSoundOn())
  }, [timeLeft, shellStatus, phase, showHowto, finished, current])

  function startPlaying() {
    playEduSound('click', readInteractiveSoundOn())
    completedRef.current = false
    setShowHowto(false)
    setStarted(true)
  }

  function startRecall() {
    playEduSound('click', readInteractiveSoundOn())
    setPhase('recall')
    setCurrent(0)
    setTimeLeft(MEMORY_RECALL_ROUND_SECONDS)
    warnedRoundRef.current = -1
  }

  function handleSelect(idx: number) {
    if (shellStatus !== 'playing' || phase !== 'recall' || showHowto || finished || advancingRef.current || selected !== null) return
    const round = rounds[current]
    if (!round) return
    setSelected(idx)
    if (idx === round.correctIndex) {
      playEduSound('correct', readInteractiveSoundOn())
      setScore((s) => s + MEMORY_RECALL_POINTS)
      scoreRef.current = scoreRef.current + MEMORY_RECALL_POINTS
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
    setPhase('study')
    setCurrent(0)
    setLives(MEMORY_RECALL_LIVES)
    setScore(0)
    setCorrectCount(0)
    setSelected(null)
    setTimeLeft(MEMORY_RECALL_ROUND_SECONDS)
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
        This game has no pairs to recall yet.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">💭</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Memory Recall</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Study the pairs, then recall them from memory — no peeking.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> first you STUDY: every prompt and its answer is shown at once, for as long as you want. When you are ready, tap &ldquo;Start recall&rdquo; — the pairs are hidden and never shown again. Then you RECALL: each round shows one prompt only, and you pick its answer from the options, from memory.</p>
          <p><strong>How scores are given:</strong> each correct recall earns {MEMORY_RECALL_POINTS} points. The game is scored out of {rounds.length * MEMORY_RECALL_POINTS} ({rounds.length} {rounds.length === 1 ? 'pair' : 'pairs'}).</p>
          <p><strong>Objective:</strong> recall every pair, without running out of lives.</p>
          <p><strong>Controls:</strong> tap &ldquo;Start recall&rdquo; when you have studied enough, then tap one answer option per round.</p>
          <p><strong>Lives:</strong> you start with {MEMORY_RECALL_LIVES} lives. A wrong recall costs 1 life, and so does letting a recall round&apos;s timer run out. The study phase has no timer and costs no lives.</p>
          <p><strong>Timer:</strong> {MEMORY_RECALL_ROUND_SECONDS} seconds per recall round. You hear one warning when {MEMORY_RECALL_WARNING_SECONDS} seconds are left. The timer pauses when you pause the game or re-read this page.</p>
          <p><strong>Rounds:</strong> one prompt per recall round, in shuffled order. The pairs are shown in the game&apos;s own order during study.</p>
          <p><strong>How you win and finish:</strong> recall every pair with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many you got right, and how many lives are left. Once recall starts, you cannot go back to study — that is the test.</p>
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
          {won ? 'Memory Recall Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
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

  // ---- Study phase: every pair visible, untimed. ----
  if (phase === 'study') {
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
          <span>📖 Study phase — take your time, no timer</span>
          <HowToPlayButton onClick={() => setShowHowto(true)} />
          <InteractiveSoundToggle />
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1rem' }}>
          Study these {pairs.length} {pairs.length === 1 ? 'pair' : 'pairs'}. When you are ready, start recall — the pairs will be hidden and you cannot peek at them again.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {pairs.map((pair, i) => (
            <div key={i} style={{
              display: 'flex', gap: '0.75rem', alignItems: 'center',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)', padding: '0.9rem 1rem',
            }}>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)', minWidth: '1.5rem' }}>{i + 1}.</span>
              <span style={{ flex: 1, color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>{pair.prompt}</span>
              <span style={{ color: 'var(--color-text-muted)' }} aria-hidden="true">→</span>
              <strong style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>{pair.answer}</strong>
            </div>
          ))}
        </div>
        <button
          onClick={startRecall}
          style={{
            width: '100%', padding: '0.9rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)',
            fontSize: '1.05rem', cursor: 'pointer',
          }}
        >
          Start recall — hide the pairs
        </button>
      </div>
    )
  }

  // ---- Recall phase: prompt only, options from memory. ----
  const round = rounds[current]
  if (!round) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  const timerPct = (timeLeft / MEMORY_RECALL_ROUND_SECONDS) * 100

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <LivesHearts lives={lives} maxLives={MEMORY_RECALL_LIVES} />
        <TimerChip display={`${timeLeft}s`} warning={timeLeft <= MEMORY_RECALL_WARNING_SECONDS} tickKey={timeLeft} label={`${timeLeft} seconds remaining`} />
        <RoundPill>Recall {current + 1} of {rounds.length}</RoundPill>
        <HowToPlayButton onClick={() => setShowHowto(true)} />
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
          💭 Recall from memory — the pairs are hidden now.
        </p>
        <div style={{
          ...QUESTION_CARD_STYLE,
          borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.25rem',
          color: 'var(--color-text-primary)', fontSize: '1.125rem',
          fontFamily: 'var(--font-display)', boxShadow: 'var(--shadow-card)', textAlign: 'center',
        }}>
          {round.prompt}
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

export default function MemoryRecallActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellTotal, setShellTotal] = useState<number | undefined>(undefined)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Memory Recall" score={shellScore} finished={shellFinished} totalScore={shellTotal} onElapsed={handleElapsed} autoStart={autoStart}>
      <MemoryRecallGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f, t) => { setShellScore(s); setShellFinished(f); if (typeof t === 'number') setShellTotal(t) }}
      />
    </PlayShell>
  )
}
