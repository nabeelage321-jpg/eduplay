'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'
import type { ActivityItem } from '@/types'

interface Balloon {
  id: string
  label: string
  isCorrect: boolean
  x: number
  color: string
  popped: boolean
}

const BALLOON_COLORS = [
  'var(--color-primary)',
  'var(--color-danger)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-primary-dark)',
]

export default function BalloonPopActivity({ items, locale, onComplete }: ActivityProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [balloons, setBalloons] = useState<Balloon[]>([])
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)
  const item = items[currentIdx]

  useEffect(() => {
    if (!item) return
    const allAnswers = items.map((i) => i.answer)
    const wrong = shuffleArray(allAnswers.filter((a) => a !== item.answer)).slice(0, 3)
    const opts = shuffleArray([item.answer, ...wrong])
    const bs: Balloon[] = opts.map((label, i) => ({
      id: `b-${currentIdx}-${i}`,
      label,
      isCorrect: label === item.answer,
      x: 10 + (i * 22) + Math.random() * 8,
      color: BALLOON_COLORS[i % BALLOON_COLORS.length],
      popped: false,
    }))
    setBalloons(bs)
  }, [currentIdx, item, items])

  function popBalloon(id: string, isCorrect: boolean) {
    setBalloons((prev) => prev.map((b) => b.id === id ? { ...b, popped: true } : b))
    if (isCorrect) {
      const newScore = score + SCORE_PER_CORRECT
      setScore(newScore)
      setFeedback({ type: 'correct', msg: getRandomFeedback('correct') })
      setTimeout(() => {
        setFeedback(null)
        if (currentIdx + 1 >= items.length) {
          setFinished(true)
          onComplete(newScore)
        } else {
          setCurrentIdx((i) => i + 1)
        }
      }, 1000)
    } else {
      setFeedback({ type: 'wrong', msg: getRandomFeedback('wrong') })
      setTimeout(() => setFeedback(null), 800)
    }
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🎈</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>All Balloons Popped!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score}</p>
      </motion.div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
        {currentIdx + 1} / {items.length}
      </p>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        marginBottom: '1rem',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-display)',
        fontSize: '1.1rem',
        boxShadow: 'var(--shadow-card)',
      }}>
        {item?.prompt}
      </div>

      {/* Balloon arena */}
      <div style={{ position: 'relative', height: '280px', overflow: 'hidden', marginBottom: '1rem' }}>
        <AnimatePresence>
          {balloons.map((b) => !b.popped && (
            <motion.button
              key={b.id}
              initial={{ y: 300, opacity: 1 }}
              animate={{ y: -20 }}
              transition={{ duration: 4 + Math.random() * 2, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
              onClick={() => popBalloon(b.id, b.isCorrect)}
              aria-label={`Balloon: ${b.label}`}
              style={{
                position: 'absolute',
                left: `${b.x}%`,
                bottom: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Balloon body */}
              <div style={{
                width: '64px',
                height: '80px',
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                background: b.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                padding: '0.25rem',
                textAlign: 'center',
                wordBreak: 'break-word',
                boxShadow: '2px 4px 8px rgba(0,0,0,0.25)',
                position: 'relative',
              }}>
                {b.label}
                {/* Shine */}
                <div style={{
                  position: 'absolute', top: '10px', left: '12px',
                  width: '14px', height: '10px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.4)',
                  transform: 'rotate(-30deg)',
                }} />
              </div>
              {/* String */}
              <div style={{ width: '2px', height: '30px', background: 'var(--color-text-muted)', opacity: 0.5 }} />
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Pop effects */}
        <AnimatePresence>
          {balloons.filter((b) => b.popped).map((b) => (
            <motion.div
              key={`pop-${b.id}`}
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{}}
              transition={{ duration: 0.4 }}
              style={{
                position: 'absolute',
                left: `${b.x}%`,
                top: '40%',
                fontSize: '1.5rem',
                pointerEvents: 'none',
              }}
            >
              💥
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', fontSize: '1rem', fontFamily: 'var(--font-display)',
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
