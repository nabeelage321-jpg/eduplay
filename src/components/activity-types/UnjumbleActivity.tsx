'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'
import { playGameSound, readSoundOn } from '@/lib/game-sound'

interface WordToken {
  id: string
  word: string
  placed: boolean
}

export default function UnjumbleActivity({ items, locale, onComplete }: ActivityProps) {
  // items: prompt = jumbled hint or context, answer = correct sentence
  const [currentIdx, setCurrentIdx] = useState(0)
  const [tokens, setTokens] = useState<WordToken[]>([])
  const [arranged, setArranged] = useState<WordToken[]>([])
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)
  const item = items[currentIdx]

  // Sound is an extra layer only (colour + icon + text already signal
  // correct/wrong). Default is muted; the play-page sound button turns it on.
  useEffect(() => {
    if (feedback) playGameSound(feedback.type, readSoundOn())
  }, [feedback])

  useEffect(() => {
    if (!item) return
    const words = item.answer.split(' ').filter(Boolean)
    const shuffled: WordToken[] = shuffleArray(words.map((w, i) => ({ id: `w-${currentIdx}-${i}`, word: w, placed: false })))
    setTokens(shuffled)
    setArranged([])
  }, [currentIdx, item])

  function placeWord(token: WordToken) {
    if (token.placed) return
    const newArranged = [...arranged, { ...token, placed: true }]
    setArranged(newArranged)
    setTokens((prev) => prev.map((t) => t.id === token.id ? { ...t, placed: true } : t))

    // Auto-check when all placed
    if (newArranged.length === tokens.length) {
      const sentence = newArranged.map((t) => t.word).join(' ')
      const isCorrect = sentence.toLowerCase() === item.answer.toLowerCase()
      if (isCorrect) {
        const newScore = score + SCORE_PER_CORRECT
        setScore(newScore)
        setFeedback({ type: 'correct', msg: getRandomFeedback('correct') })
        setTimeout(() => {
          setFeedback(null)
          if (currentIdx + 1 >= items.length) { setFinished(true); onComplete(newScore) }
          else setCurrentIdx((i) => i + 1)
        }, 1100)
      } else {
        setFeedback({ type: 'wrong', msg: getRandomFeedback('wrong') })
        setTimeout(() => {
          setFeedback(null)
          // Reset
          setTokens((prev) => prev.map((t) => ({ ...t, placed: false })))
          setArranged([])
        }, 1000)
      }
    }
  }

  function removeWord(token: WordToken, idx: number) {
    setArranged((prev) => prev.filter((_, i) => i !== idx))
    setTokens((prev) => prev.map((t) => t.id === token.id ? { ...t, placed: false } : t))
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>📖</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Unjumble Done!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score}</p>
      </motion.div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        {currentIdx + 1} / {items.length} · Tap words to build the sentence
      </p>

      {item?.prompt && (
        <div style={{
          background: 'var(--color-surface-alt)', borderRadius: 'var(--radius)',
          padding: '0.6rem 1rem', marginBottom: '0.75rem',
          color: 'var(--color-text-secondary)', fontSize: '0.875rem',
          fontFamily: 'var(--font-body)',
        }}>
          💡 {item.prompt}
        </div>
      )}

      {/* Answer area */}
      <div style={{
        minHeight: '56px',
        border: `2px dashed ${arranged.length ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '0.6rem',
        marginBottom: '1rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.4rem',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-surface)',
        transition: 'border-color 0.2s',
      }}>
        {arranged.length === 0 && (
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Tap words below to add them here</span>
        )}
        <AnimatePresence>
          {arranged.map((token, i) => (
            <motion.button
              key={token.id}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              onClick={() => removeWord(token, i)}
              aria-label={`Remove word: ${token.word}`}
              style={{
                padding: '0.35rem 0.7rem',
                borderRadius: 'var(--radius)',
                border: '2px solid var(--color-primary)',
                background: 'var(--color-primary)',
                color: '#fff',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
              }}
            >
              {token.word}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Word bank */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.75rem' }}>
        {tokens.map((token) => (
          <motion.button
            key={token.id}
            onClick={() => placeWord(token)}
            whileHover={!token.placed ? { scale: 1.05 } : {}}
            whileTap={!token.placed ? { scale: 0.95 } : {}}
            aria-label={`Word: ${token.word}`}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius)',
              border: '2px solid var(--color-border)',
              background: token.placed ? 'var(--color-border)' : 'var(--color-surface)',
              color: token.placed ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-body)',
              cursor: token.placed ? 'default' : 'pointer',
              opacity: token.placed ? 0.4 : 1,
              transition: 'all 0.15s',
            }}
          >
            {token.word}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            className={feedback.type === 'correct' ? 'eduplay-feedback-correct' : 'eduplay-feedback-wrong'}
            style={{
              padding: '0.6rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.95rem',
            }}>
            {feedback.type === 'correct' ? '✅ ' : '❌ '}{feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
        Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong>
      </p>
    </div>
  )
}
