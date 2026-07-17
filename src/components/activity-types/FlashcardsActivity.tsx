'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL } from './shared'

export default function FlashcardsActivity({ items, locale, onComplete }: ActivityProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<Set<number>>(new Set())
  const [unknown, setUnknown] = useState<Set<number>>(new Set())
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)
  const item = items[currentIdx]

  function flip() { setFlipped((f) => !f) }

  function markKnown() {
    const newKnown = new Set(known).add(currentIdx)
    setKnown(newKnown)
    advance(newKnown)
  }

  function markUnknown() {
    setUnknown((prev) => new Set(prev).add(currentIdx))
    advance(known)
  }

  function advance(k: Set<number>) {
    setFlipped(false)
    setTimeout(() => {
      if (currentIdx + 1 >= items.length) {
        setFinished(true)
        onComplete(k.size * 10)
      } else {
        setCurrentIdx((i) => i + 1)
      }
    }, 150)
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🃏</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Flashcards Done!</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
          ✅ Known: {known.size} / {items.length}
        </p>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Score: {known.size * 10}
        </p>
      </motion.div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '420px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <span>{currentIdx + 1} / {items.length}</span>
        <span>✅ {known.size} known</span>
      </div>

      {/* 3D flip card */}
      <div
        onClick={flip}
        role="button"
        aria-label={`Flashcard. ${flipped ? 'Answer: ' + item?.answer : 'Question: ' + item?.prompt}. Click to flip.`}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && flip()}
        style={{
          perspective: '1000px',
          cursor: 'pointer',
          marginBottom: '1.25rem',
          height: '200px',
        }}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          style={{
            width: '100%', height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-card)',
          }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              Question
            </span>
            <p style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.15rem', lineHeight: 1.5 }}>
              {item?.prompt}
            </p>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.75rem' }}>Tap to reveal</span>
          </div>
          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'var(--color-primary)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-card)',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              Answer
            </span>
            <p style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.25rem', lineHeight: 1.5 }}>
              {item?.answer}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Action buttons (only show when flipped) */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={markUnknown}
              aria-label="Mark as unknown, show again"
              style={{
                padding: '0.65rem 1.25rem', borderRadius: 'var(--radius)',
                border: '2px solid var(--color-danger)', background: 'var(--color-surface)',
                color: 'var(--color-danger)', fontFamily: 'var(--font-display)', fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              ✗ Still learning
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={markKnown}
              aria-label="Mark as known"
              style={{
                padding: '0.65rem 1.25rem', borderRadius: 'var(--radius)',
                border: 'none', background: 'var(--color-success)',
                color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.9rem',
                cursor: 'pointer', boxShadow: 'var(--shadow)',
              }}
            >
              ✓ Got it!
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
        {items.map((_, i) => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: known.has(i) ? 'var(--color-success)' : unknown.has(i) ? 'var(--color-danger)' : i === currentIdx ? 'var(--color-primary)' : 'var(--color-border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
    </div>
  )
}
