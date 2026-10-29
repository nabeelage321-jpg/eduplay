'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL } from './shared'

interface Tile {
  id: number
  pairId: number
  text: string
  kind: 'prompt' | 'answer'
}

/**
 * Batch 1 — Memory Match (preview/activity component).
 * Tiles are built from the existing prompt/answer items: one tile per
 * prompt and one per answer. Match both tiles of a pair to score.
 * Large touch targets only (min 64px); no site-wide redesign.
 */
export default function MemoryMatchActivity({ items, locale, onComplete }: ActivityProps) {
  const [tiles, setTiles] = useState<Tile[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)

  useEffect(() => {
    const all: Tile[] = []
    items.forEach((item, i) => {
      all.push({ id: i * 2, pairId: i, text: item.prompt, kind: 'prompt' })
      all.push({ id: i * 2 + 1, pairId: i, text: item.answer, kind: 'answer' })
    })
    setTiles(shuffleArray(all))
    setFlipped([])
    setMatched(new Set())
    setScore(0)
    setFinished(false)
  }, [items])

  function flip(tile: Tile) {
    if (finished || flipped.length >= 2) return
    if (flipped.includes(tile.id) || matched.has(tile.pairId)) return
    const next = [...flipped, tile.id]
    setFlipped(next)
    if (next.length === 2) {
      const [a, b] = next.map((id) => tiles.find((t) => t.id === id)!)
      if (a && b && a.pairId === b.pairId) {
        const newMatched = new Set(matched).add(a.pairId)
        const newScore = score + SCORE_PER_CORRECT
        setMatched(newMatched)
        setScore(newScore)
        setFlipped([])
        if (newMatched.size === items.length) {
          setFinished(true)
          onComplete(newScore)
        }
      } else {
        setTimeout(() => setFlipped([]), 800)
      }
    }
  }

  if (items.length < 2) {
    return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Add at least 2 items to play Memory Match.</p>
  }

  if (finished) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🧠</div>
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: '0.5rem' }}>All Matched!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score}</p>
      </div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '640px', margin: '0 auto' }}>
      <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Flip two tiles. Match the prompt with its answer.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
        {tiles.map((tile) => {
          const isUp = flipped.includes(tile.id) || matched.has(tile.pairId)
          return (
            <motion.button
              key={tile.id}
              onClick={() => flip(tile)}
              whileTap={{ scale: 0.97 }}
              aria-label={isUp ? tile.text : 'Hidden tile'}
              style={{
                minHeight: '64px',
                padding: '0.9rem 0.75rem',
                borderRadius: 'var(--radius)',
                border: `2px solid ${matched.has(tile.pairId) ? 'var(--color-success)' : 'var(--color-border)'}`,
                background: isUp ? 'var(--color-surface)' : 'var(--color-primary)',
                color: isUp ? 'var(--color-text-primary)' : '#fff',
                cursor: matched.has(tile.pairId) ? 'default' : 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                opacity: matched.has(tile.pairId) ? 0.7 : 1,
              }}
            >
              {isUp ? tile.text : '❓'}
            </motion.button>
          )
        })}
      </div>
      <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        {matched.size} / {items.length} matched · Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong>
      </div>
    </div>
  )
}
