'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL } from './shared'

interface Question {
  prompt: string
  options: string[]
  correctIdx: number
}

export default function GameshowQuizActivity({ items, locale, onComplete }: ActivityProps) {
  const [questions] = useState<Question[]>(() => {
    const allAnswers = items.map((i) => i.answer)
    return items.map((item) => {
      const wrong = shuffleArray(allAnswers.filter((a) => a !== item.answer)).slice(0, 3)
      const options = shuffleArray([item.answer, ...wrong])
      return { prompt: item.prompt, options, correctIdx: options.indexOf(item.answer) }
    })
  })
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false)
  const [skipUsed, setSkipUsed] = useState(false)
  const [eliminated, setEliminated] = useState<Set<number>>(new Set())
  const [lifelines, setLifelines] = useState({ fiftyFifty: 1, skip: 1 })
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [finished, setFinished] = useState(false)
  const [dramatic, setDramatic] = useState(false)
  const rtl = isRTL(locale)
  const q = questions[currentIdx]

  function choose(idx: number) {
    if (selected !== null || eliminated.has(idx)) return
    setSelected(idx)
    setDramatic(true)
    setTimeout(() => {
      setDramatic(false)
      setRevealed(true)
      const isCorrect = idx === q.correctIdx
      if (isCorrect) {
        setScore((s) => s + SCORE_PER_CORRECT * 2) // gameshow gets double points
        setFeedback('correct')
      } else {
        setFeedback('wrong')
      }
      setTimeout(() => {
        setFeedback(null)
        setSelected(null)
        setRevealed(false)
        setEliminated(new Set())
        if (currentIdx + 1 >= questions.length) {
          setFinished(true)
          onComplete(score + (idx === q.correctIdx ? SCORE_PER_CORRECT * 2 : 0))
        } else {
          setCurrentIdx((i) => i + 1)
        }
      }, 1500)
    }, 1200)
  }

  function useFiftyFifty() {
    if (lifelines.fiftyFifty === 0 || selected !== null) return
    const wrongIdxs = q.options.map((_, i) => i).filter((i) => i !== q.correctIdx && !eliminated.has(i))
    const toElim = shuffleArray(wrongIdxs).slice(0, 2)
    setEliminated((prev) => new Set([...prev, ...toElim]))
    setLifelines((prev) => ({ ...prev, fiftyFifty: 0 }))
  }

  function useSkip() {
    if (lifelines.skip === 0 || selected !== null) return
    setLifelines((prev) => ({ ...prev, skip: 0 }))
    setEliminated(new Set())
    if (currentIdx + 1 >= questions.length) { setFinished(true); onComplete(score) }
    else setCurrentIdx((i) => i + 1)
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🎬</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Gameshow Complete!</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>Final Score: {score}</p>
      </motion.div>
    )
  }

  const OPTION_LETTERS = ['A', 'B', 'C', 'D']

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{
      padding: '1rem', maxWidth: '560px', margin: '0 auto',
      background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-primary)', borderRadius: 'var(--radius)', padding: '0.5rem 1rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <span style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.85rem' }}>
          Question {currentIdx + 1}/{questions.length}
        </span>
        <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          💰 {score} pts
        </span>
      </div>

      {/* Question */}
      <motion.div
        key={currentIdx}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{
          background: 'var(--color-surface)', border: '2px solid var(--color-primary)',
          borderRadius: 'var(--radius-lg)', padding: '1.25rem',
          marginBottom: '1rem', textAlign: 'center',
          color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.1rem',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {dramatic && <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎵</div>}
        {q?.prompt}
      </motion.div>

      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
        {q?.options.map((opt, idx) => {
          const isElim = eliminated.has(idx)
          const isSelected = selected === idx
          const isCorrect = revealed && idx === q.correctIdx
          const isWrong = revealed && isSelected && idx !== q.correctIdx
          return (
            <motion.button
              key={idx}
              onClick={() => choose(idx)}
              whileHover={!isElim && selected === null ? { scale: 1.02 } : {}}
              animate={dramatic && isSelected ? { scale: [1, 1.05, 1] } : {}}
              transition={dramatic ? { repeat: Infinity, duration: 0.5 } : {}}
              disabled={isElim || selected !== null}
              aria-label={`Option ${OPTION_LETTERS[idx]}: ${opt}`}
              style={{
                padding: '0.75rem', borderRadius: 'var(--radius)',
                border: `2px solid ${isCorrect ? 'var(--color-success)' : isWrong ? 'var(--color-danger)' : isSelected ? 'var(--color-warning)' : 'var(--color-border)'}`,
                background: isCorrect ? 'var(--color-success)' : isWrong ? 'var(--color-danger)' : isSelected ? 'var(--color-warning)' : 'var(--color-surface)',
                color: (isCorrect || isWrong || isSelected) ? '#fff' : 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)', fontSize: '0.9rem',
                cursor: isElim || selected !== null ? 'not-allowed' : 'pointer',
                opacity: isElim ? 0.25 : 1,
                textAlign: rtl ? 'right' : 'left',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.2s',
              }}
            >
              <span style={{
                width: '1.4rem', height: '1.4rem', borderRadius: '50%',
                border: `1px solid ${isElim ? 'var(--color-border)' : 'currentColor'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
              }}>
                {OPTION_LETTERS[idx]}
              </span>
              {opt}
            </motion.button>
          )
        })}
      </div>

      {/* Lifelines */}
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
        <motion.button
          whileHover={lifelines.fiftyFifty > 0 ? { scale: 1.05 } : {}}
          onClick={useFiftyFifty}
          disabled={lifelines.fiftyFifty === 0 || selected !== null}
          aria-label="Use 50:50 lifeline"
          style={{
            padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
            border: '2px solid var(--color-warning)',
            background: lifelines.fiftyFifty === 0 ? 'var(--color-border)' : 'var(--color-surface)',
            color: lifelines.fiftyFifty === 0 ? 'var(--color-text-muted)' : 'var(--color-warning)',
            fontFamily: 'var(--font-display)', fontSize: '0.8rem', cursor: lifelines.fiftyFifty === 0 ? 'not-allowed' : 'pointer',
            opacity: lifelines.fiftyFifty === 0 ? 0.5 : 1,
          }}
        >
          50:50
        </motion.button>
        <motion.button
          whileHover={lifelines.skip > 0 ? { scale: 1.05 } : {}}
          onClick={useSkip}
          disabled={lifelines.skip === 0 || selected !== null}
          aria-label="Use skip lifeline"
          style={{
            padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
            border: '2px solid var(--color-primary)',
            background: lifelines.skip === 0 ? 'var(--color-border)' : 'var(--color-surface)',
            color: lifelines.skip === 0 ? 'var(--color-text-muted)' : 'var(--color-primary)',
            fontFamily: 'var(--font-display)', fontSize: '0.8rem', cursor: lifelines.skip === 0 ? 'not-allowed' : 'pointer',
            opacity: lifelines.skip === 0 ? 0.5 : 1,
          }}
        >
          ⏭ Skip
        </motion.button>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              marginTop: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius)',
              background: feedback === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1.1rem',
            }}>
            {feedback === 'correct' ? '🎉 Correct! +20 pts' : '❌ Wrong!'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
