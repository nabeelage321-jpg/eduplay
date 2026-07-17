'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL } from './shared'

interface CatItem {
  id: string
  label: string
  category: string
  placed: boolean
}

export default function CategorizeActivity({ items, locale, onComplete }: ActivityProps) {
  // items: prompt = item label, answer = category name
  const categories = Array.from(new Set(items.map((i) => i.answer)))
  const [catItems, setCatItems] = useState<CatItem[]>([])
  const [buckets, setBuckets] = useState<Record<string, string[]>>({})
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)
  const rtl = isRTL(locale)

  useEffect(() => {
    const ci: CatItem[] = shuffleArray(items.map((item, i) => ({
      id: `ci-${i}`,
      label: item.prompt,
      category: item.answer,
      placed: false,
    })))
    setCatItems(ci)
    const b: Record<string, string[]> = {}
    categories.forEach((c) => { b[c] = [] })
    setBuckets(b)
  }, [items])

  function dropIntoBucket(category: string) {
    if (!draggedId) return
    const item = catItems.find((c) => c.id === draggedId)
    if (!item) return
    const isCorrect = item.category === category
    if (isCorrect) {
      setBuckets((prev) => ({ ...prev, [category]: [...prev[category], item.label] }))
      setCatItems((prev) => prev.map((c) => c.id === draggedId ? { ...c, placed: true } : c))
      const newScore = score + SCORE_PER_CORRECT
      setScore(newScore)
      const allPlaced = catItems.filter((c) => c.id !== draggedId).every((c) => c.placed)
      if (allPlaced) {
        setFinished(true)
        onComplete(newScore)
      }
    } else {
      setWrongFlash(category)
      setTimeout(() => setWrongFlash(null), 500)
    }
    setDraggedId(null)
  }

  const unplaced = catItems.filter((c) => !c.placed)

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🗂️</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>All Categorized!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score}</p>
      </motion.div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <span>Remaining: {unplaced.length}</span>
        <span>Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong></span>
      </div>

      {/* Draggable items */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', minHeight: '48px' }}>
        {unplaced.map((item) => (
          <motion.div
            key={item.id}
            draggable
            onDragStart={() => setDraggedId(item.id)}
            onDragEnd={() => setDraggedId(null)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            tabIndex={0}
            role="button"
            aria-label={`Item: ${item.label}. Drag to category.`}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius)',
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body)',
              cursor: 'grab',
              userSelect: 'none',
              boxShadow: 'var(--shadow)',
              opacity: draggedId === item.id ? 0.5 : 1,
            }}
          >
            {item.label}
          </motion.div>
        ))}
      </div>

      {/* Category buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(categories.length, 2)}, 1fr)`, gap: '0.75rem' }}>
        {categories.map((cat) => (
          <div
            key={cat}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropIntoBucket(cat)}
            aria-label={`Category: ${cat}`}
            style={{
              minHeight: '100px',
              border: `2px dashed ${wrongFlash === cat ? 'var(--color-danger)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '0.75rem',
              background: wrongFlash === cat ? 'color-mix(in srgb, var(--color-danger) 10%, var(--color-surface))' : 'var(--color-surface-alt)',
              transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            <h4 style={{
              color: 'var(--color-text-secondary)', fontSize: '0.8rem',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              marginBottom: '0.5rem', fontFamily: 'var(--font-display)',
            }}>
              {cat}
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {(buckets[cat] || []).map((label, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-success)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {label}
                </motion.span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Keyboard fallback: click item then click bucket */}
      {draggedId && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>
          Drop into a category above
        </p>
      )}
    </div>
  )
}
