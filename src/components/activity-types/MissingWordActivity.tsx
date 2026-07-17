'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'

export default function MissingWordActivity({ items, locale, onComplete }: ActivityProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)
  const item = items[currentIdx]

  // Build display: replace the answer word in the prompt with ___
  function getDisplayParts(prompt: string, answer: string): [string, string] {
    const regex = new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    const match = prompt.match(regex)
    if (match && match.index !== undefined) {
      return [prompt.slice(0, match.index), prompt.slice(match.index + match[0].length)]
    }
    // If answer not in prompt, treat prompt as sentence with blank already
    const idx = prompt.indexOf('___')
    if (idx !== -1) return [prompt.slice(0, idx), prompt.slice(idx + 3)]
    return [prompt, '']
  }

  const allAnswers = items.map((i) => i.answer)
  const options = shuffleArray([item?.answer, ...shuffleArray(allAnswers.filter((a) => a !== item?.answer)).slice(0, 3)]).filter(Boolean)
  const [before, after] = getDisplayParts(item?.prompt || '', item?.answer || '')

  function choose(opt: string) {
    if (selected) return
    setSelected(opt)
    const isCorrect = opt.toLowerCase() === item?.answer.toLowerCase()
    const newScore = isCorrect ? score + SCORE_PER_CORRECT : score
    if (isCorrect) setScore(newScore)
    setFeedback({ type: isCorrect ? 'correct' : 'wrong', msg: getRandomFeedback(isCorrect ? 'correct' : 'wrong') })
    setTimeout(() => {
      setFeedback(null)
      setSelected(null)
      if (currentIdx + 1 >= items.length) { setFinished(true); onComplete(newScore) }
      else setCurrentIdx((i) => i + 1)
    }, 1100)
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🔍</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Missing Word Done!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score}</p>
      </motion.div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        {currentIdx + 1} / {items.length} · Choose the missing word
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem 1.25rem',
            marginBottom: '1.5rem',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
            fontSize: '1.15rem',
            lineHeight: 1.8,
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {before}
          <span style={{
            display: 'inline-block',
            minWidth: '80px',
            borderBottom: '3px solid var(--color-primary)',
            margin: '0 0.35rem',
            color: selected ? 'var(--color-primary)' : 'transparent',
            fontWeight: 700,
          }}>
            {selected || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
          </span>
          {after}
        </motion.div>
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        {options.map((opt, i) => {
          let borderColor = 'var(--color-border)'
          let bg = 'var(--color-surface)'
          let color = 'var(--color-text-primary)'
          if (selected) {
            if (opt === item?.answer) { borderColor = 'var(--color-success)'; bg = 'var(--color-success)'; color = '#fff' }
            else if (opt === selected) { borderColor = 'var(--color-danger)'; bg = 'var(--color-danger)'; color = '#fff' }
          }
          return (
            <motion.button
              key={i}
              whileHover={!selected ? { scale: 1.03 } : {}}
              whileTap={!selected ? { scale: 0.97 } : {}}
              onClick={() => choose(opt)}
              disabled={!!selected}
              aria-label={`Option: ${opt}`}
              aria-pressed={selected === opt}
              style={{
                padding: '0.75rem', borderRadius: 'var(--radius)',
                border: `2px solid ${borderColor}`, background: bg, color,
                fontFamily: 'var(--font-body)', fontSize: '0.95rem',
                cursor: selected ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {opt}
            </motion.button>
          )
        })}
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
