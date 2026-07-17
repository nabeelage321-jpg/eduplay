'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'

export default function AnagramActivity({ items, locale, onComplete }: ActivityProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [tiles, setTiles] = useState<string[]>([])
  const [arranged, setArranged] = useState<(string | null)[]>([])
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)
  const item = items[currentIdx]

  useEffect(() => {
    if (!item) return
    const letters = item.answer.toUpperCase().split('')
    setTiles(shuffleArray(letters))
    setArranged(new Array(letters.length).fill(null))
  }, [currentIdx, item])

  function placeTile(letter: string, tileIdx: number) {
    const emptySlot = arranged.indexOf(null)
    if (emptySlot === -1) return
    const newArranged = [...arranged]
    newArranged[emptySlot] = letter
    const newTiles = [...tiles]
    newTiles[tileIdx] = ''
    setArranged(newArranged)
    setTiles(newTiles)
    if (newArranged.every((l) => l !== null)) {
      const word = newArranged.join('')
      const isCorrect = word.toUpperCase() === item.answer.toUpperCase()
      if (isCorrect) {
        const ns = score + SCORE_PER_CORRECT
        setScore(ns)
        setFeedback({ type: 'correct', msg: getRandomFeedback('correct') })
        setTimeout(() => {
          setFeedback(null)
          if (currentIdx + 1 >= items.length) { setFinished(true); onComplete(ns) }
          else setCurrentIdx((i) => i + 1)
        }, 1200)
      } else {
        setFeedback({ type: 'wrong', msg: getRandomFeedback('wrong') })
        setTimeout(() => {
          setFeedback(null)
          const letters = item.answer.toUpperCase().split('')
          setTiles(shuffleArray(letters))
          setArranged(new Array(letters.length).fill(null))
        }, 1000)
      }
    }
  }

  function removeFromArranged(slotIdx: number) {
    const letter = arranged[slotIdx]
    if (!letter) return
    const newArranged = [...arranged]; newArranged[slotIdx] = null
    const newTiles = [...tiles]
    const emptyTile = newTiles.indexOf('')
    if (emptyTile !== -1) newTiles[emptyTile] = letter; else newTiles.push(letter)
    setArranged(newArranged); setTiles(newTiles)
  }

  if (finished) return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
      <div style={{ fontSize: '3rem' }}>🔤</div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginTop: '0.5rem' }}>Anagram Complete!</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score}</p>
    </motion.div>
  )

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        {currentIdx + 1} / {items.length}
      </p>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.5rem',
        color: 'var(--color-text-primary)', fontSize: '1.1rem',
        fontFamily: 'var(--font-display)', boxShadow: 'var(--shadow-card)',
      }}>
        {item?.prompt}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {arranged.map((letter, i) => (
          <motion.button key={i} onClick={() => letter && removeFromArranged(i)}
            whileHover={letter ? { scale: 1.05 } : {}}
            aria-label={letter ? `Remove letter ${letter}` : `Empty slot ${i + 1}`}
            style={{
              width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius)',
              border: `2px solid ${letter ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: letter ? 'var(--color-primary)' : 'var(--color-surface-alt)',
              color: letter ? '#fff' : 'transparent', fontSize: '1rem', fontWeight: 700,
              cursor: letter ? 'pointer' : 'default', fontFamily: 'monospace', transition: 'all 0.15s',
            }}>
            {letter || '_'}
          </motion.button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {tiles.map((letter, i) => (
          letter ? (
            <motion.button key={i} onClick={() => placeTile(letter, i)}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
              aria-label={`Letter tile ${letter}`}
              style={{
                width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius)',
                border: '2px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text-primary)', fontSize: '1rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'monospace', boxShadow: 'var(--shadow)', transition: 'all 0.15s',
              }}>
              {letter}
            </motion.button>
          ) : <div key={i} style={{ width: '2.5rem', height: '2.5rem' }} />
        ))}
      </div>
      {item?.hint && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>💡 {item.hint}</p>}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} role="alert"
            style={{
              padding: '0.75rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', fontSize: '1rem', fontFamily: 'var(--font-display)',
            }}>
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ marginTop: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong>
      </div>
    </div>
  )
}
