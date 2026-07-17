'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'

interface Mole {
  id: number
  label: string
  isCorrect: boolean
  visible: boolean
  hit: boolean
}

export default function WhackAMoleActivity({ items, locale, onComplete }: ActivityProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [moles, setMoles] = useState<Mole[]>([])
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [timeLeft, setTimeLeft] = useState(20)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rtl = isRTL(locale)
  const item = items[currentIdx]

  const setupMoles = useCallback(() => {
    if (!item) return
    const allAnswers = items.map((i) => i.answer)
    const wrong = shuffleArray(allAnswers.filter((a) => a !== item.answer)).slice(0, 8)
    const opts = shuffleArray([...Array(3).fill(item.answer), ...wrong]).slice(0, 9)
    setMoles(opts.map((label, i) => ({ id: i, label, isCorrect: label === item.answer, visible: false, hit: false })))
    setTimeLeft(20)
  }, [item, items])

  useEffect(() => { setupMoles() }, [setupMoles])

  // Pop moles up randomly
  useEffect(() => {
    if (finished || moles.length === 0) return
    const interval = setInterval(() => {
      setMoles((prev) => {
        const hidden = prev.filter((m) => !m.visible && !m.hit).map((m) => m.id)
        if (hidden.length === 0) return prev
        const toShow = hidden[Math.floor(Math.random() * hidden.length)]
        return prev.map((m) => m.id === toShow ? { ...m, visible: true } : m)
      })
      // Hide a random visible mole after a bit
      setTimeout(() => {
        setMoles((prev) => {
          const visible = prev.filter((m) => m.visible && !m.hit).map((m) => m.id)
          if (visible.length === 0) return prev
          const toHide = visible[Math.floor(Math.random() * visible.length)]
          return prev.map((m) => m.id === toHide ? { ...m, visible: false } : m)
        })
      }, 1200)
    }, 700)
    return () => clearInterval(interval)
  }, [finished, moles.length])

  // Timer
  useEffect(() => {
    if (finished) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          advance(score)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [currentIdx, finished])

  function whack(id: number, isCorrect: boolean) {
    setMoles((prev) => prev.map((m) => m.id === id ? { ...m, visible: false, hit: true } : m))
    if (isCorrect) {
      const newScore = score + SCORE_PER_CORRECT
      setScore(newScore)
      setFeedback({ type: 'correct', msg: getRandomFeedback('correct') })
      setTimeout(() => {
        setFeedback(null)
        advance(newScore)
      }, 800)
    } else {
      setFeedback({ type: 'wrong', msg: getRandomFeedback('wrong') })
      setTimeout(() => setFeedback(null), 600)
    }
  }

  function advance(finalScore: number) {
    if (timerRef.current) clearInterval(timerRef.current)
    if (currentIdx + 1 >= items.length) {
      setFinished(true)
      onComplete(finalScore)
    } else {
      setCurrentIdx((i) => i + 1)
    }
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🔨</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Whack-a-Mole Done!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score}</p>
      </motion.div>
    )
  }

  const timerPct = (timeLeft / 20) * 100

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <span>{currentIdx + 1} / {items.length}</span>
        <span aria-live="polite">{timeLeft}s</span>
      </div>
      {/* Timer bar */}
      <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: 'var(--radius)', marginBottom: '0.75rem' }}>
        <motion.div style={{ height: '100%', background: timerPct > 50 ? 'var(--color-success)' : timerPct > 25 ? 'var(--color-warning)' : 'var(--color-danger)', borderRadius: 'var(--radius)' }}
          animate={{ width: `${timerPct}%` }} transition={{ duration: 1, ease: 'linear' }} />
      </div>

      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '0.875rem', marginBottom: '1rem',
        color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1rem',
        boxShadow: 'var(--shadow-card)',
      }}>
        🎯 {item?.prompt}
      </div>

      {/* Mole grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {moles.map((mole) => (
          <div key={mole.id} style={{ position: 'relative', height: '80px', overflow: 'hidden' }}>
            {/* Hole */}
            <div style={{
              position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: '72px', height: '20px',
              background: 'var(--color-text-primary)', borderRadius: '50%', opacity: 0.2,
            }} />
            <AnimatePresence>
              {mole.visible && !mole.hit && (
                <motion.button
                  initial={{ y: 60 }} animate={{ y: 10 }} exit={{ y: 60 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  onClick={() => whack(mole.id, mole.isCorrect)}
                  aria-label={`Mole: ${mole.label}`}
                  style={{
                    position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                    width: '64px', height: '64px', borderRadius: '50% 50% 40% 40%',
                    background: mole.isCorrect ? 'var(--color-success)' : 'var(--color-surface)',
                    border: `3px solid ${mole.isCorrect ? 'var(--color-success)' : 'var(--color-border)'}`,
                    cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
                    color: mole.isCorrect ? '#fff' : 'var(--color-text-primary)',
                    fontFamily: 'var(--font-body)', padding: '0.25rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  {mole.label.length > 12 ? mole.label.slice(0, 12) + '…' : mole.label}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              padding: '0.6rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', fontSize: '0.95rem', fontFamily: 'var(--font-display)',
            }}>
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
        Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong>
      </p>
    </div>
  )
}
