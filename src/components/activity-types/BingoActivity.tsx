'use client'

import { useState, useEffect, useMemo } from 'react'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL } from './shared'

/**
 * Batch 1 — Bingo (preview/activity component).
 * The card is built from the activity's own answers: 5×5 when there are
 * 24+ items, otherwise 3×3 (8 answers + FREE centre) when there are 8+
 * items. Prompts are called in random order; tap the matching answer.
 * A full row, column or diagonal is Bingo (+50 bonus, game ends).
 */
export default function BingoActivity({ items, locale, onComplete }: ActivityProps) {
  const size = items.length >= 24 ? 5 : 3
  const needed = size * size - 1
  const [card, setCard] = useState<string[]>([])
  const [promptOrder, setPromptOrder] = useState<number[]>([])
  const [callIndex, setCallIndex] = useState(0)
  const [marked, setMarked] = useState<Set<number>>(new Set())
  const [score, setScore] = useState(0)
  const [bingo, setBingo] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const rtl = isRTL(locale)

  useEffect(() => {
    const answers = shuffleArray(items.map((i) => i.answer)).slice(0, needed)
    const cells: string[] = []
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (size % 2 === 1 && r === Math.floor(size / 2) && c === Math.floor(size / 2)) {
          cells.push('FREE')
        } else {
          cells.push(answers[cells.filter((x) => x !== 'FREE').length] ?? '')
        }
      }
    }
    setCard(cells)
    setPromptOrder(shuffleArray(items.map((_, i) => i)))
    setCallIndex(0)
    const centre = Math.floor(size / 2) * size + Math.floor(size / 2)
    setMarked(size % 2 === 1 ? new Set([centre]) : new Set())
    setScore(0)
    setBingo(false)
  }, [items, size, needed])

  const lines = useMemo(() => {
    const out: number[][] = []
    for (let r = 0; r < size; r++) out.push(Array.from({ length: size }, (_, c) => r * size + c))
    for (let c = 0; c < size; c++) out.push(Array.from({ length: size }, (_, r) => r * size + c))
    out.push(Array.from({ length: size }, (_, i) => i * size + i))
    out.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)))
    return out
  }, [size])

  function hasBingo(m: Set<number>) {
    return lines.some((line) => line.every((cell) => m.has(cell)))
  }

  function tap(cellIndex: number) {
    if (bingo || marked.has(cellIndex)) return
    const itemIndex = promptOrder[callIndex]
    if (itemIndex === undefined) return
    const want = items[itemIndex].answer
    if (card[cellIndex] === want) {
      const newMarked = new Set(marked).add(cellIndex)
      const newScore = score + SCORE_PER_CORRECT
      setMarked(newMarked)
      setScore(newScore)
      if (hasBingo(newMarked)) {
        const finalScore = newScore + 50
        setScore(finalScore)
        setBingo(true)
        onComplete(finalScore)
      } else if (callIndex + 1 < promptOrder.length) {
        setCallIndex((i) => i + 1)
      }
    } else {
      setFlash(card[cellIndex])
      setTimeout(() => setFlash(null), 600)
    }
  }

  if (items.length < 8) {
    return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Add at least 8 items to play Bingo (3×3 card).</p>
  }

  const current = promptOrder[callIndex] !== undefined ? items[promptOrder[callIndex]] : null

  if (bingo) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🎱</div>
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: '0.5rem' }}>BINGO!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score} (includes +50 bingo bonus)</p>
      </div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Called prompt:</p>
      <p style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
        {current ? current.prompt : 'All prompts called'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, 1fr)`, gap: '0.5rem' }}>
        {card.map((cell, i) => {
          const isMarked = marked.has(i)
          const isFlash = flash === cell
          return (
            <button
              key={i}
              onClick={() => tap(i)}
              aria-label={cell}
              style={{
                minHeight: '64px',
                padding: '0.5rem',
                borderRadius: 'var(--radius)',
                border: `2px solid ${isMarked ? 'var(--color-success)' : isFlash ? 'var(--color-danger)' : 'var(--color-border)'}`,
                background: isMarked ? 'var(--color-success)' : 'var(--color-surface)',
                color: isMarked ? '#fff' : 'var(--color-text-primary)',
                cursor: isMarked ? 'default' : 'pointer',
                fontSize: '0.95rem', fontWeight: 600,
              }}
            >
              {cell}
            </button>
          )
        })}
      </div>
      <div style={{ marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        Marked: {marked.size} / {card.length} · Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong>
      </div>
    </div>
  )
}
