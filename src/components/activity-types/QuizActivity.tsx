'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, TIMER_DEFAULT, shuffleArray, isRTL, getRandomFeedback } from './shared'
import type { ActivityItem } from '@/types'
import { playGameSound, readSoundOn } from '@/lib/game-sound'

interface QuizQuestion {
  item: ActivityItem
  options: string[]
  correctIndex: number
}

export default function QuizActivity({ items, locale, onComplete }: ActivityProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIMER_DEFAULT)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)

  // Sound is an extra layer only (colour + icon + text already signal
  // correct/wrong). Default is muted; the play-page sound button turns it on.
  useEffect(() => {
    if (feedback) playGameSound(feedback.type, readSoundOn())
  }, [feedback])

  useEffect(() => {
    const allAnswers = items.map((i) => i.answer)
    const qs: QuizQuestion[] = items.map((item) => {
      const wrong = shuffleArray(allAnswers.filter((a) => a !== item.answer)).slice(0, 3)
      const options = shuffleArray([item.answer, ...wrong])
      return { item, options, correctIndex: options.indexOf(item.answer) }
    })
    setQuestions(shuffleArray(qs))
  }, [items])

  const advance = useCallback(() => {
    setSelected(null)
    setFeedback(null)
    setTimeLeft(TIMER_DEFAULT)
    if (current + 1 >= questions.length) {
      setFinished(true)
      onComplete(score)
    } else {
      setCurrent((c) => c + 1)
    }
  }, [current, questions.length, score, onComplete])

  useEffect(() => {
    if (selected !== null || finished || questions.length === 0) return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id)
          setFeedback({ type: 'wrong', msg: "Time's up!" })
          setTimeout(advance, 1200)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [selected, finished, questions.length, current, advance])

  function handleSelect(idx: number) {
    if (selected !== null) return
    setSelected(idx)
    const q = questions[current]
    if (idx === q.correctIndex) {
      setScore((s) => s + SCORE_PER_CORRECT)
      setFeedback({ type: 'correct', msg: getRandomFeedback('correct') })
    } else {
      setFeedback({ type: 'wrong', msg: getRandomFeedback('wrong') })
    }
    setTimeout(advance, 1400)
  }

  if (questions.length === 0) return (
    <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
  )

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Quiz Complete!</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          Score: {score} / {questions.length * SCORE_PER_CORRECT}
        </p>
      </motion.div>
    )
  }

  const q = questions[current]
  const progress = (current / questions.length) * 100
  const timerPct = (timeLeft / TIMER_DEFAULT) * 100

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <span>{current + 1} / {questions.length}</span>
        <span aria-live="polite" aria-label={`${timeLeft} seconds remaining`}>{timeLeft}s</span>
      </div>
      <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: 'var(--radius)', marginBottom: '0.5rem' }}>
        <motion.div style={{ height: '100%', background: 'var(--color-primary)', borderRadius: 'var(--radius)' }}
          animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>
      <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
        <motion.div style={{
          height: '100%', borderRadius: 'var(--radius)',
          background: timerPct > 50 ? 'var(--color-success)' : timerPct > 20 ? 'var(--color-warning)' : 'var(--color-danger)',
        }} animate={{ width: `${timerPct}%` }} transition={{ duration: 1, ease: 'linear' }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ x: rtl ? -40 : 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }} exit={{ x: rtl ? 40 : -40, opacity: 0 }} transition={{ duration: 0.25 }}>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.25rem',
            color: 'var(--color-text-primary)', fontSize: '1.125rem',
            fontFamily: 'var(--font-display)', boxShadow: 'var(--shadow-card)',
          }}>
            {q.item.prompt}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {q.options.map((opt, idx) => {
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
      </AnimatePresence>
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            className={feedback.type === 'correct' ? 'eduplay-feedback-correct' : 'eduplay-feedback-wrong'}
            style={{
              marginTop: '1rem', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem',
            }}>
            {feedback.type === 'correct' ? '✅ ' : '❌ '}{feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong>
      </div>
    </div>
  )
}
