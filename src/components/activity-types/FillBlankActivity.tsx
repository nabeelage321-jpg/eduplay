'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'

export default function FillBlankActivity({ items, locale, onComplete }: ActivityProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rtl = isRTL(locale)
  const item = items[currentIdx]

  // Build sentence parts: prompt contains ___ for blank
  function getParts(prompt: string): [string, string] {
    const idx = prompt.indexOf('___')
    if (idx === -1) return [prompt, '']
    return [prompt.slice(0, idx), prompt.slice(idx + 3)]
  }

  const [before, after] = getParts(item?.prompt || '')

  // Options for tap mode (4 choices)
  const allAnswers = items.map((i) => i.answer)
  const options = shuffleArray([item?.answer, ...shuffleArray(allAnswers.filter((a) => a !== item?.answer)).slice(0, 3)]).filter(Boolean)

  function submit(answer?: string) {
    const val = (answer ?? typed).trim()
    if (!val) return
    const isCorrect = val.toLowerCase() === item?.answer.toLowerCase()
    if (isCorrect) {
      const newScore = score + SCORE_PER_CORRECT
      setScore(newScore)
      setFeedback({ type: 'correct', msg: getRandomFeedback('correct') })
      setTimeout(() => {
        setFeedback(null)
        setTyped('')
        if (currentIdx + 1 >= items.length) { setFinished(true); onComplete(newScore) }
        else { setCurrentIdx((i) => i + 1); inputRef.current?.focus() }
      }, 1000)
    } else {
      setFeedback({ type: 'wrong', msg: getRandomFeedback('wrong') })
      setTimeout(() => { setFeedback(null); setTyped('') }, 900)
    }
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>📝</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Fill in the Blank Done!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score}</p>
      </motion.div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        {currentIdx + 1} / {items.length}
      </p>

      {/* Sentence with blank */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1rem',
            marginBottom: '1.25rem',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            lineHeight: 1.8,
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {before}
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            aria-label="Fill in the blank"
            placeholder="___"
            style={{
              display: 'inline-block',
              width: `${Math.max(80, typed.length * 12 + 24)}px`,
              borderBottom: '2px solid var(--color-primary)',
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              background: 'transparent',
              color: 'var(--color-primary)',
              fontSize: '1.1rem',
              fontFamily: 'var(--font-display)',
              textAlign: 'center',
              outline: 'none',
              margin: '0 0.25rem',
              padding: '0 0.25rem',
            }}
          />
          {after}
        </motion.div>
      </AnimatePresence>

      {/* Type submit */}
      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => submit()}
        disabled={!typed.trim()}
        aria-label="Submit answer"
        style={{
          padding: '0.6rem 1.5rem', borderRadius: 'var(--radius)',
          border: 'none', background: typed.trim() ? 'var(--gradient-btn)' : 'var(--color-border)',
          color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.95rem',
          cursor: typed.trim() ? 'pointer' : 'not-allowed',
          boxShadow: typed.trim() ? 'var(--shadow)' : 'none',
          marginBottom: '1rem',
        }}
      >
        Submit
      </motion.button>

      {/* Or choose option */}
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>or choose:</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
        {options.map((opt, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => submit(opt)}
            aria-label={`Option: ${opt}`}
            style={{
              padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
              border: '2px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            {opt}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              marginTop: '0.75rem', padding: '0.6rem', borderRadius: 'var(--radius)',
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
