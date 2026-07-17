'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, isRTL, getRandomFeedback } from './shared'

export default function TrueFalseActivity({ items, locale, onComplete }: ActivityProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string; dir: 'left' | 'right' } | null>(null)
  const [finished, setFinished] = useState(false)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-150, 150], [-20, 20])
  const trueOpacity = useTransform(x, [0, 80], [0, 1])
  const falseOpacity = useTransform(x, [-80, 0], [1, 0])
  const rtl = isRTL(locale)

  const item = items[currentIdx]
  // Items whose answer is 'true' or 'false' (case-insensitive), or we treat non-empty answer as true
  const correctAnswer = item?.answer?.toLowerCase() === 'true' ? 'true' : 'false'

  function answer(choice: 'true' | 'false') {
    const isCorrect = choice === correctAnswer
    const newScore = isCorrect ? score + SCORE_PER_CORRECT : score
    if (isCorrect) setScore(newScore)
    setFeedback({ type: isCorrect ? 'correct' : 'wrong', msg: getRandomFeedback(isCorrect ? 'correct' : 'wrong'), dir: choice === 'true' ? 'right' : 'left' })
    setTimeout(() => {
      setFeedback(null)
      x.set(0)
      if (currentIdx + 1 >= items.length) {
        setFinished(true)
        onComplete(newScore)
      } else {
        setCurrentIdx((i) => i + 1)
      }
    }, 900)
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 80) answer('true')
    else if (info.offset.x < -80) answer('false')
    else x.set(0)
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>✅</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>True or False Done!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score}</p>
      </motion.div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        {currentIdx + 1} / {items.length} · Swipe right = True, left = False
      </p>

      <div style={{ position: 'relative', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
        {/* True label (right) */}
        <motion.div style={{ opacity: trueOpacity, position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}>
          <span style={{ fontSize: '2rem', color: 'var(--color-success)', fontWeight: 900 }}>✓</span>
        </motion.div>
        {/* False label (left) */}
        <motion.div style={{ opacity: falseOpacity, position: 'absolute', insetInlineStart: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}>
          <span style={{ fontSize: '2rem', color: 'var(--color-danger)', fontWeight: 900 }}>✗</span>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            style={{
              x, rotate,
              background: 'var(--color-surface)',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              width: '280px',
              minHeight: '140px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'grab',
              boxShadow: 'var(--shadow-card)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              userSelect: 'none',
            }}
            drag="x"
            dragConstraints={{ left: -200, right: 200 }}
            onDragEnd={handleDragEnd}
            whileTap={{ cursor: 'grabbing' }}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-label={`Statement: ${item?.prompt}. Swipe right for true, left for false.`}
          >
            {item?.prompt}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1rem' }}>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => answer('false')}
          aria-label="False"
          style={{
            padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)',
            border: '2px solid var(--color-danger)', background: 'var(--color-surface)',
            color: 'var(--color-danger)', fontFamily: 'var(--font-display)', fontSize: '1rem',
            cursor: 'pointer', fontWeight: 700,
          }}
        >
          ✗ False
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => answer('true')}
          aria-label="True"
          style={{
            padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)',
            border: '2px solid var(--color-success)', background: 'var(--color-surface)',
            color: 'var(--color-success)', fontFamily: 'var(--font-display)', fontSize: '1rem',
            cursor: 'pointer', fontWeight: 700,
          }}
        >
          ✓ True
        </motion.button>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              padding: '0.6rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.95rem',
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
