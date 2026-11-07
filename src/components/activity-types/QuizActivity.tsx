'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityCompletion, ActivityProps } from './shared'
import { SCORE_PER_CORRECT, TIMER_DEFAULT, shuffleArray, isRTL, getRandomFeedback } from './shared'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import KidActionsBar from '@/components/game/KidActionsBar'
import ScorePill from '@/components/game/ScorePill'
import { QUESTION_CARD_STYLE, RoundPill, TimerChip } from '@/components/game/PlayChrome'
import type { ActivityItem } from '@/types'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

interface QuizQuestion {
  item: ActivityItem
  options: string[]
  correctIndex: number
}

// PLAY SHELL (2026-11-03): Quiz is the first type wrapped in the
// shared PlayShell. The inner game below reads the shell status so
// its own per-question countdown and feedback advance freeze while
// paused; the thin wrapper underneath lifts the real score and the
// finished flag up to the shell header. Every other type is untouched.
//
// INTRO (batch 1, final list item 4): the How-to-Play + name screen
// used to live HERE, Quiz-only. It is now the SHARED PlayIntro on
// the play page (all 40 types) — this file keeps no intro of its
// own, so a kid never sees two instruction screens. The name the
// intro collects is owned by the play page, which attaches it to
// the finish screen; this player only reports score + counts.
interface QuizGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean, total?: number) => void
}

function QuizGame({ items, locale, onComplete, onProgress }: QuizGameProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIMER_DEFAULT)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  // KID ACTIONS (batch 1, final list item 17): one hint per question
  // (removes ONE wrong answer), skip (0 points, move on), and see
  // the answer + why (reveals the correct answer; the "why" is the
  // question's own hint when it has one — never invented).
  const [hiddenIdx, setHiddenIdx] = useState<number | null>(null)
  const [answerRevealed, setAnswerRevealed] = useState(false)
  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()
  const onProgressRef = useRef(onProgress)
  useEffect(() => { onProgressRef.current = onProgress })
  useEffect(() => { onProgressRef.current(score, finished, questions.length * SCORE_PER_CORRECT) }, [score, finished])

  // GAME FEEL (2026-11-07, build-list item 4): Quiz now uses the
  // interactive sound system (default ON, same as Match Up) instead
  // of the old muted-by-default one, so correct/wrong are heard:
  // BATCH 1 (final list item 10): correct is CLAPPING, wrong is a
  // BLAST. Sound is an extra layer only (colour + icon + text
  // already signal correct/wrong). The play-page header toggle for
  // Quiz is the interactive toggle, so one tap mutes all of it.
  useEffect(() => {
    if (feedback) playEduSound(feedback.type, readInteractiveSoundOn())
  }, [feedback])

  // QUIZ RE-RENDER FIX (2026-11-02): the play page re-renders every
  // second for its elapsed timer, and ActivityPlayer used to rebuild a
  // brand-new `items` array on every render (adaptActivityItems maps
  // DB content afresh). The old effect depended on `items` identity,
  // so it re-shuffled the whole question list every second: the
  // question/answers the player had just tapped kept changing, the
  // counter stayed 1/10 and the score stayed 0. Questions are now
  // built once per question CONTENT, not per array identity: a
  // fingerprint of prompt+answer strings. Parent re-renders that
  // carry the same content are a no-op; a genuinely different game
  // (different content) still rebuilds and resets progress.
  const itemsFingerprint = items.map((i) => `${i.prompt}\u0000${i.answer ?? ''}`).join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    if (advanceTimeoutRef.current) { clearTimeout(advanceTimeoutRef.current); advanceTimeoutRef.current = null }
    pendingAdvanceRef.current = false
    const allAnswers = items.map((i) => i.answer)
    const qs: QuizQuestion[] = items.map((item) => {
      const wrong = shuffleArray(allAnswers.filter((a) => a !== item.answer)).slice(0, 3)
      const options = shuffleArray([item.answer, ...wrong])
      return { item, options, correctIndex: options.indexOf(item.answer) }
    })
    setQuestions(shuffleArray(qs))
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setTimeLeft(TIMER_DEFAULT)
    setFeedback(null)
    setFinished(false)
    setHiddenIdx(null)
    setAnswerRevealed(false)
  }, [itemsFingerprint, items])

  // Refs mirror the latest state so `advance` can be stable: the old
  // version closed over `current`/`score`/`onComplete`, and onComplete
  // is a new function on every play-page timer tick, so `advance`
  // changed every second, the timer effect churned, and a tap's
  // 1400ms timeout carried a stale score (on the last question the
  // final correct answer's +10 was lost from onComplete).
  const currentRef = useRef(0)
  const scoreRef = useRef(0)
  const questionsRef = useRef<QuizQuestion[]>([])
  const onCompleteRef = useRef(onComplete)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeUpRef = useRef(false)
  // True while a feedback advance timeout is armed (set when arming,
  // cleared when it fires). The pause effect below uses it to re-arm
  // the full feedback window on resume instead of dropping the advance.
  const pendingAdvanceRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { currentRef.current = current })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { questionsRef.current = questions })
  useEffect(() => () => { if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current) }, [])

  const advance = useCallback(() => {
    pendingAdvanceRef.current = false
    setSelected(null)
    setFeedback(null)
    setTimeLeft(TIMER_DEFAULT)
    setHiddenIdx(null)
    setAnswerRevealed(false)
    timeUpRef.current = false
    const qs = questionsRef.current
    if (qs.length === 0) return
    if (currentRef.current + 1 >= qs.length) {
      setFinished(true)
      // GAME FEEL: report correct/total counts so the play page can
      // tell good marks (>= 50%, fireworks) from a try-again finish.
      // Score is 10 per correct answer, so correct = score / 10.
      onCompleteRef.current(scoreRef.current, {
        correctCount: scoreRef.current / SCORE_PER_CORRECT,
        totalCount: qs.length,
      })
    } else {
      setCurrent((c) => c + 1)
    }
  }, [])

  // Timer only counts down. Time-up is handled by a separate effect
  // below: the old version called setFeedback/setTimeout from inside
  // a setTimeLeft updater (a side effect inside a state updater, which
  // React may run twice) and depended on the ever-changing `advance`.
  useEffect(() => {
    // The per-question countdown runs only while the shell is playing:
    // during Start/countdown the game is not visible yet, and while
    // paused the player's answer time must not drain away.
    if (selected !== null || finished || questions.length === 0 || shellStatus !== 'playing') return
    const id = setInterval(() => setTimeLeft((t) => (t > 1 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [selected, finished, questions.length, current, shellStatus])

  useEffect(() => { timeUpRef.current = false }, [current])
  useEffect(() => {
    if (timeLeft !== 0 || selected !== null || finished || questions.length === 0 || timeUpRef.current || shellStatus !== 'playing') return
    timeUpRef.current = true
    setFeedback({ type: 'wrong', msg: "Time's up!" })
    advanceTimeoutRef.current = setTimeout(advance, 1200)
    pendingAdvanceRef.current = true
  }, [timeLeft, selected, finished, questions.length, advance, shellStatus])

  // PLAY-SHELL PAUSE: a feedback advance timeout armed before pausing
  // would otherwise fire mid-pause and move the game on. Clear it on
  // pause and re-arm the full feedback window on resume, so resuming
  // continues exactly where play paused — never less answer time,
  // never a skipped question.
  useEffect(() => {
    if (shellStatus === 'paused') {
      if (advanceTimeoutRef.current) { clearTimeout(advanceTimeoutRef.current); advanceTimeoutRef.current = null }
    } else if (shellStatus === 'playing' && pendingAdvanceRef.current && advanceTimeoutRef.current === null && !finished) {
      advanceTimeoutRef.current = setTimeout(advance, 1400)
    }
  }, [shellStatus, finished, advance])

  function handleSelect(idx: number) {
    if (selected !== null) return
    const q = questions[current]
    if (!q) return
    // GAME FEEL: a click on every answer tap, before the
    // correct/wrong feedback sound that follows.
    playEduSound('click', readInteractiveSoundOn())
    setSelected(idx)
    if (idx === q.correctIndex) {
      setScore((s) => s + SCORE_PER_CORRECT)
      setFeedback({ type: 'correct', msg: getRandomFeedback('correct') })
    } else {
      setFeedback({ type: 'wrong', msg: getRandomFeedback('wrong') })
    }
    advanceTimeoutRef.current = setTimeout(advance, 1400)
    pendingAdvanceRef.current = true
  }

  // KID ACTIONS (batch 1, item 17) — hint, skip, see the answer.
  // All three keep the game's own rules: a hint removes ONE wrong
  // answer, a skip scores 0, and seeing the answer scores 0 too.
  function useHint() {
    if (selected !== null || hiddenIdx !== null || finished || shellStatus !== 'playing') return
    const q = questions[current]
    if (!q) return
    const wrongIdx = q.options.findIndex((_, i) => i !== q.correctIndex)
    if (wrongIdx === -1) return
    playEduSound('click', readInteractiveSoundOn())
    setHiddenIdx(wrongIdx)
  }
  function skipQuestion() {
    if (selected !== null || finished || shellStatus !== 'playing') return
    playEduSound('click', readInteractiveSoundOn())
    // -2 matches no option: nothing highlights, the timer freezes
    // (selected !== null), and the advance below moves on with 0.
    setSelected(-2)
    setFeedback({ type: 'wrong', msg: 'Skipped — 0 points' })
    advanceTimeoutRef.current = setTimeout(advance, 1200)
    pendingAdvanceRef.current = true
  }
  function revealAnswer() {
    if (selected !== null || finished || shellStatus !== 'playing') return
    const q = questions[current]
    if (!q) return
    playEduSound('click', readInteractiveSoundOn())
    // Selecting the correct index highlights it green (the render
    // below) but scores NOTHING — the score only changes in
    // handleSelect, which never runs for a reveal. The kid reads
    // the why, then taps "Got it" to move on.
    setSelected(q.correctIndex)
    setAnswerRevealed(true)
    setFeedback({ type: 'correct', msg: `The correct answer is "${q.item.answer}".` })
  }

  if (questions.length === 0) return (
    <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
  )

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontSize: '1.5rem', fontFamily: FUNKY_FONT, marginBottom: '0.5rem' }}>Quiz Complete!</h2>
        <p style={{ marginTop: '0.5rem' }}>
          <ScorePill score={score} total={questions.length * SCORE_PER_CORRECT} big />
        </p>
      </motion.div>
    )
  }

  const q = questions[current]
  const progress = (current / questions.length) * 100
  const timerPct = (timeLeft / TIMER_DEFAULT) * 100
  const canAct = selected === null && !finished && shellStatus === 'playing'

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.75rem 0.5rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <RoundPill>{current + 1} / {questions.length}</RoundPill>
        <TimerChip display={`${timeLeft}s`} warning={timeLeft <= 6} tickKey={timeLeft} label={`${timeLeft} seconds remaining`} />
      </div>
      <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: 'var(--radius)', marginBottom: '0.4rem' }}>
        <motion.div style={{ height: '100%', background: 'var(--color-primary)', borderRadius: 'var(--radius)' }}
          animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>
      <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: 'var(--radius)', marginBottom: '0.75rem' }}>
        <motion.div style={{
          height: '100%', borderRadius: 'var(--radius)',
          background: timerPct > 50 ? 'var(--color-success)' : timerPct > 20 ? 'var(--color-warning)' : 'var(--color-danger)',
        }} animate={{ width: `${timerPct}%` }} transition={{ duration: 1, ease: 'linear' }} />
      </div>
      {/* KID ACTIONS (batch 1, item 17): hint, skip, see the answer. */}
      <KidActionsBar
        onHint={canAct && hiddenIdx === null ? useHint : undefined}
        onSkip={canAct ? skipQuestion : undefined}
        onShowAnswer={canAct ? revealAnswer : undefined}
        hintUsed={hiddenIdx !== null}
        answerShown={answerRevealed}
      />
      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ x: rtl ? -40 : 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }} exit={{ x: rtl ? 40 : -40, opacity: 0 }} transition={{ duration: 0.25 }}>
          <div style={{
            ...QUESTION_CARD_STYLE,
            borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '0.75rem',
            color: 'var(--color-text-primary)', fontSize: '1.15rem',
            fontFamily: FUNKY_FONT, boxShadow: 'var(--shadow-card)',
          }}>
            {q.item.prompt}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {q.options.map((opt, idx) => {
              if (idx === hiddenIdx) return <div key={idx} aria-hidden="true" />
              let bg = 'var(--color-surface)'
              let border = 'var(--color-border)'
              let color = 'var(--color-text-primary)'
              if (selected !== null) {
                if (idx === q.correctIndex) { bg = 'var(--color-success)'; border = 'var(--color-success)'; color = '#fff' }
                else if (idx === selected) { bg = 'var(--color-danger)'; border = 'var(--color-danger)'; color = '#fff' }
              }
              return (
                <motion.button key={idx} onClick={() => handleSelect(idx)}
                  whileHover={selected === null ? { scale: 1.02 } : {}}
                  whileTap={selected === null ? { scale: 0.98 } : {}}
                  aria-pressed={selected === idx} aria-label={`Option ${idx + 1}: ${opt}`}
                  style={{
                    background: bg, border: `2px solid ${border}`, borderRadius: 'var(--radius)',
                    padding: '0.7rem 0.85rem', color, fontSize: '0.95rem',
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
      </AnimatePresence>
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            className={feedback.type === 'correct' ? 'eduplay-feedback-correct' : 'eduplay-feedback-wrong'}
            style={{
              marginTop: '0.75rem', padding: '0.7rem 1rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', textAlign: 'center', fontFamily: FUNKY_FONT, fontSize: '1rem',
            }}>
            {feedback.type === 'correct' ? '✅ ' : '❌ '}{feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
      {/* The WHY (batch 1, item 17): when the answer was revealed,
          the question's own hint explains it — never invented. */}
      {answerRevealed && q.item.hint ? (
        <p style={{
          marginTop: '0.75rem', padding: '0.7rem 1rem', borderRadius: 'var(--radius)',
          background: 'color-mix(in srgb, var(--color-warning) 16%, var(--color-surface))',
          border: '2px solid var(--color-warning)',
          color: 'var(--color-text-primary)', fontSize: '0.95rem', textAlign: 'center',
        }}>
          💡 Why: {q.item.hint}
        </p>
      ) : null}
      {answerRevealed ? (
        <button
          onClick={() => advance()}
          style={{
            marginTop: '0.75rem', width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: 'var(--color-primary)', color: '#fff', fontFamily: FUNKY_FONT,
            fontSize: '1.05rem', cursor: 'pointer',
          }}
        >
          Got it — next question →
        </button>
      ) : null}
      {/* TIMER FIX 2026-11-03: no second Score line here anymore.
          The shell header above already shows this same real score;
          two score displays on one screen confused players. The
          per-question countdown (timeLeft, above) is untouched —
          it is real gameplay, not a duplicate display. */}
    </div>
  )
}

export default function QuizActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellTotal, setShellTotal] = useState<number | undefined>(undefined)
  const [shellFinished, setShellFinished] = useState(false)
  // TIMER FIX 2026-11-03: the shell's elapsed seconds, kept in a ref
  // so the finish-time value is exact even if a state update is
  // still queued when the last question completes. It is attached to
  // the completion details so the play page can use it as its single
  // final Time instead of its own load-time timer.
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])

  // The name now comes from the SHARED intro on the play page (batch
  // 1, item 4) — this player reports score + counts + elapsed only.
  const handleComplete = useCallback((score: number, details?: ActivityCompletion) => {
    onComplete(score, {
      ...details,
      elapsedSeconds: elapsedRef.current,
    })
  }, [onComplete])

  return (
    <PlayShell title="Quiz" score={shellScore} finished={shellFinished} totalScore={shellTotal} onElapsed={handleElapsed} autoStart={autoStart}>
      <QuizGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f, t) => { setShellScore(s); setShellFinished(f); if (typeof t === 'number') setShellTotal(t) }}
      />
    </PlayShell>
  )
}
