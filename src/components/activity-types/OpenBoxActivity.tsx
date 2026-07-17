'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL } from './shared'

interface Box {
  id: number
  prompt: string
  answer: string
  imageUrl?: string
  revealed: boolean
}

export default function OpenBoxActivity({ items, locale, onComplete }: ActivityProps) {
  const [boxes, setBoxes] = useState<Box[]>(() =>
    items.map((item, i) => ({
      id: i, prompt: item.prompt, answer: item.answer,
      imageUrl: item.imageUrl, revealed: false,
    }))
  )
  const [revealCount, setRevealCount] = useState(0)
  const rtl = isRTL(locale)

  function openBox(id: number) {
    setBoxes((prev) => prev.map((b) => b.id === id ? { ...b, revealed: true } : b))
    const newCount = revealCount + 1
    setRevealCount(newCount)
    if (newCount >= items.length) {
      setTimeout(() => onComplete(items.length * 10), 600)
    }
  }

  const cols = items.length <= 4 ? 2 : items.length <= 9 ? 3 : 4

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        Tap each box to reveal what's inside! ({revealCount}/{items.length} opened)
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(cols, items.length)}, 1fr)`,
        gap: '0.6rem',
      }}>
        {boxes.map((box) => (
          <div key={box.id} style={{ perspective: '600px' }}>
            <motion.div
              animate={{ rotateY: box.revealed ? 180 : 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              style={{
                position: 'relative', width: '100%', paddingTop: '100%',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Front — closed box */}
              <motion.button
                onClick={() => !box.revealed && openBox(box.id)}
                whileHover={!box.revealed ? { scale: 1.05 } : {}}
                whileTap={!box.revealed ? { scale: 0.95 } : {}}
                aria-label={box.revealed ? `Box ${box.id + 1}: ${box.answer}` : `Box ${box.id + 1}: tap to open`}
                style={{
                  position: 'absolute', inset: 0,
                  backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                  borderRadius: 'var(--radius-lg)',
                  border: '3px solid var(--color-primary)',
                  background: 'var(--gradient-btn)',
                  cursor: box.revealed ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '0.25rem',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <span style={{ fontSize: '2rem' }}>🎁</span>
                <span style={{ color: '#fff', fontSize: '0.75rem', fontFamily: 'var(--font-display)' }}>
                  #{box.id + 1}
                </span>
              </motion.button>

              {/* Back — revealed content */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                borderRadius: 'var(--radius-lg)',
                border: '3px solid var(--color-success)',
                background: 'var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '0.25rem', padding: '0.5rem',
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
              }}>
                {box.imageUrl ? (
                  <img src={box.imageUrl} alt={box.answer}
                    style={{ width: '100%', height: '70%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                ) : (
                  <span style={{ fontSize: '1.5rem' }}>✨</span>
                )}
                <p style={{
                  color: 'var(--color-text-primary)', fontSize: '0.8rem',
                  fontFamily: 'var(--font-display)', textAlign: 'center',
                  lineHeight: 1.3, margin: 0,
                }}>
                  {box.answer}
                </p>
                {box.prompt && box.prompt !== box.answer && (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem', margin: 0 }}>
                    {box.prompt}
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      {revealCount === items.length && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{
            marginTop: '1rem', padding: '0.75rem', borderRadius: 'var(--radius)',
            background: 'var(--color-success)', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '1rem',
          }}
          role="alert"
        >
          🎉 All boxes opened!
        </motion.div>
      )}
    </div>
  )
}
