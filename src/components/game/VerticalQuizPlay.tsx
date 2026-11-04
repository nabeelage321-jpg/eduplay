'use client'

/**
 * VERTICAL VIDEO MODE — interactive player (2026-11-04, section C).
 *
 * A phone-shaped vertical play view for an existing Quiz game: big
 * question, big options, a per-question timer, no sign-in. It plays
 * the game's REAL questions (built by buildVerticalQuestions, the
 * same correct + up-to-3-distractors shape Quiz uses) and changes
 * nothing about the original game: no scoring rule, life, timer, or
 * win rule is altered, and the original game is never mutated or
 * re-saved. This is a presentation only.
 *
 * Scope notes, stated plainly:
 * - Score here is display only. The device streak (lib/streak.ts)
 *   counts finishes on the normal play page only in v1; finishing
 *   here does not touch the streak. That is a stated v1 limit, not
 *   a hidden difference.
 * - The per-question timer is the normal Quiz timer (30s). The
 *   recorded video slideshow (VerticalVideoMaker) is a separate
 *   watchable summary with its own fixed timings, not this timer.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityItem, SupportedLocale } from '@/types'
import { SCORE_PER_CORRECT, TIMER_DEFAULT, isRTL } from '@/components/activity-types/shared'
import { buildVerticalQuestions, type VerticalQuestion } from '@/lib/video-mode'

interface VerticalQuizPlayProps {
  items: ActivityItem[]
  locale: SupportedLocale
  gameTitle: string
}

export default function VerticalQuizPlay({ items, locale, gameTitle }: VerticalQuizPlayProps) {
  const [questions, setQuestions] = useState<VerticalQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIMER_DEFAULT)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)

  const itemsFingerprint = items.map((i) => `${i.prompt}\u0000${i.answer ?? ''}`).join('\u0001')
  const builtForRef = useRef<string | null>(null)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentRef = useRef(0)
  const scoreRef = useRef(0)
  const questionsRef = useRef<VerticalQuestion[]>([])
  const timeUpRef = useRef(false)
  useEffect(() => { currentRef.current = current }, [current])
  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => () => { if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current) }, [])

  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    if (advanceTimeoutRef.current) { clearTimeout(advanceTimeoutRef.current); advanceTimeoutRef.current = null }
    setQuestions(buildVerticalQuestions(items))
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setTimeLeft(TIMER_DEFAULT)
    setFeedback(null)
    setFinished(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsFingerprint, items])

  function advance() {
    setSelected(null)
    setFeedback(null)
    setTimeLeft(TIMER_DEFAULT)
    timeUpRef.current = false
    const qs = questionsRef.current
    if (qs.length === 0) return
    if (currentRef.current + 1 >= qs.length) setFinished(true)
    else setCurrent((c) => c + 1)
  }

  useEffect(() => {
    if (selected !== null || finished || questions.length === 0) return
    const id = setInterval(() => setTimeLeft((t) => (t > 1 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [selected, finished, questions.length, current])

  useEffect(() => { timeUpRef.current = false }, [current])
  useEffect(() => {
    if (timeLeft !== 0 || selected !== null || finished || questions.length === 0 || timeUpRef.current) return
    timeUpRef.current = true
    setFeedback({ type: 'wrong', msg: "Time's up!" })
    advanceTimeoutRef.current = setTimeout(advance, 1400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, selected, finished, questions.length])

  function handleSelect(idx: number) {
    if (selected !== null) return
    const q = questions[current]
    if (!q) return
    setSelected(idx)
    if (idx === q.correctIndex) {
      setScore((s) => s + SCORE_PER_CORRECT)
      setFeedback({ type: 'correct', msg: 'Correct!' })
    } else {
      setFeedback({ type: 'wrong', msg: `Not quite — the answer was: ${q.answer}` })
    }
    advanceTimeoutRef.current = setTimeout(advance, 1400)
  }

  function restart() {
    if (advanceTimeoutRef.current) { clearTimeout(advanceTimeoutRef.current); advanceTimeoutRef.current = null }
    setQuestions(buildVerticalQuestions(items))
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setTimeLeft(TIMER_DEFAULT)
    setFeedback(null)
    setFinished(false)
    timeUpRef.current = false
  }

  if (questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
        <p>This game has no questions to play vertically yet.</p>
      </div>
    )
  }

  const timerPct = (timeLeft / TIMER_DEFAULT) * 100

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      data-testid="vertical-quiz-play"
      style={{
        width: '100%', maxWidth: '430px', margin: '0 auto',
        background: 'var(--color-surface)', border: '2px solid var(--color-border)',
        borderRadius: '28px', padding: '1.25rem', boxShadow: 'var(--shadow-card)',
      }}
    >
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
        📱 Vertical mode · {gameTitle}
      </p>
      {finished ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            Vertical Quiz Complete!
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
            Score: {score} / {questions.length * SCORE_PER_CORRECT}
          </p>
          <button
            type="button"
            onClick={restart}
            style={{
              marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)',
              border: 'none', background: 'var(--color-primary)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Play again
          </button>
        </motion.div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            <span>{current + 1} / {questions.length}</span>
            <span aria-live="polite" aria-label={`${timeLeft} seconds remaining`}>{timeLeft}s</span>
          </div>
          <div style={{ height: '6px', background: 'var(--color-border)', borderRadius: 'var(--radius)', marginBottom: '1.25rem' }}>
            <motion.div
              style={{
                height: '100%', borderRadius: 'var(--radius)',
                background: timerPct > 50 ? 'var(--color-success)' : timerPct > 20 ? 'var(--color-warning)' : 'var(--color-danger)',
              }}
              animate={{ width: `${timerPct}%` }} transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -24, opacity: 0 }} transition={{ duration: 0.25 }}
            >
              <div style={{
                background: 'var(--color-surface-alt)', border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', padding: '1.5rem 1.25rem', marginBottom: '1rem',
                color: 'var(--color-text-primary)', fontSize: '1.5rem', lineHeight: 1.4,
                fontFamily: 'var(--font-display)', textAlign: 'center',
              }}>
                {questions[current].prompt}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {questions[current].options.map((opt, idx) => {
                  let bg = 'var(--color-surface)'
                  let border = 'var(--color-border)'
                  let color = 'var(--color-text-primary)'
                  if (selected !== null) {
                    if (idx === questions[current].correctIndex) { bg = 'var(--color-success)'; border = 'var(--color-success)'; color = '#fff' }
                    else if (idx === selected) { bg = 'var(--color-danger)'; border = 'var(--color-danger)'; color = '#fff' }
                  }
                  return (
                    <motion.button
                      key={idx}
                      type="button"
                      onClick={() => handleSelect(idx)}
                      whileTap={selected === null ? { scale: 0.98 } : {}}
                      aria-pressed={selected === idx} aria-label={`Option ${idx + 1}: ${opt}`}
                      style={{
                        background: bg, border: `2px solid ${border}`, borderRadius: 'var(--radius-lg)',
                        padding: '1rem', color, fontSize: '1.15rem', cursor: selected !== null ? 'default' : 'pointer',
                        textAlign: 'center', fontFamily: 'var(--font-body)',
                      }}
                    >
                      {selected !== null && idx === questions[current].correctIndex ? '✓ ' : selected !== null && idx === selected ? '✗ ' : ''}{opt}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
                role="alert"
                style={{
                  marginTop: '1rem', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)',
                  background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
                  color: '#fff', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1.05rem',
                }}
              >
                {feedback.type === 'correct' ? '✅ ' : '❌ '}{feedback.msg}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
