'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL } from './shared'

interface OrderItem {
  id: string
  label: string
  correctIndex: number
}

export default function OrderActivity({ items, locale, onComplete }: ActivityProps) {
  // items: prompt = label, answer = correct position (1-based string) or we use item order
  const [ordered, setOrdered] = useState<OrderItem[]>([])
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const rtl = isRTL(locale)

  useEffect(() => {
    const oi: OrderItem[] = items.map((item, i) => ({
      id: `oi-${i}`,
      label: item.prompt,
      correctIndex: i,
    }))
    setOrdered(shuffleArray(oi))
    setChecked(false)
    setResults([])
  }, [items])

  function dragStart(idx: number) { setDraggedIdx(idx) }
  function dragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (draggedIdx === null || draggedIdx === idx) return
    const newOrder = [...ordered]
    const [moved] = newOrder.splice(draggedIdx, 1)
    newOrder.splice(idx, 0, moved)
    setOrdered(newOrder)
    setDraggedIdx(idx)
  }

  function checkOrder() {
    const res = ordered.map((item, i) => item.correctIndex === i)
    setResults(res)
    const correct = res.filter(Boolean).length
    const newScore = score + correct * SCORE_PER_CORRECT
    setScore(newScore)
    setChecked(true)
    if (res.every(Boolean)) setTimeout(() => onComplete(newScore), 1200)
  }

  function retry() {
    setOrdered(shuffleArray([...ordered]))
    setChecked(false)
    setResults([])
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '480px', margin: '0 auto' }}>
      <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
        Drag items into the correct order
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {ordered.map((item, idx) => {
          const isCorrect = checked ? results[idx] : null
          return (
            <motion.div
              key={item.id}
              layout
              draggable={!checked}
              onDragStart={() => dragStart(idx)}
              onDragOver={(e) => dragOver(e, idx)}
              aria-label={`Position ${idx + 1}: ${item.label}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius)',
                background: isCorrect === true ? 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))'
                  : isCorrect === false ? 'color-mix(in srgb, var(--color-danger) 15%, var(--color-surface))'
                  : 'var(--color-surface)',
                border: `2px solid ${isCorrect === true ? 'var(--color-success)' : isCorrect === false ? 'var(--color-danger)' : 'var(--color-border)'}`,
                cursor: checked ? 'default' : 'grab',
                boxShadow: 'var(--shadow)',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              <span style={{
                width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)',
                flexShrink: 0,
              }}>
                {idx + 1}
              </span>
              <span style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', flex: 1 }}>
                {item.label}
              </span>
              {isCorrect !== null && (
                <span style={{ fontSize: '1rem' }}>{isCorrect ? '✅' : '❌'}</span>
              )}
              {!checked && (
                <span style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>⠿</span>
              )}
            </motion.div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        {!checked ? (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={checkOrder}
            style={{
              padding: '0.75rem 1.75rem', borderRadius: 'var(--radius)',
              border: 'none', background: 'var(--gradient-btn)',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem',
              cursor: 'pointer', boxShadow: 'var(--shadow)',
            }}
          >
            Check Order
          </motion.button>
        ) : !results.every(Boolean) && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={retry}
            style={{
              padding: '0.75rem 1.75rem', borderRadius: 'var(--radius)',
              border: '2px solid var(--color-primary)', background: 'var(--color-surface)',
              color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Try Again
          </motion.button>
        )}
      </div>

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.75rem', textAlign: 'center' }}>
        Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong>
      </p>
    </div>
  )
}
