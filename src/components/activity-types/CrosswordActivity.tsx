'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, isRTL } from './shared'

interface CWCell {
  letter: string
  row: number
  col: number
  number?: number
  across?: number
  down?: number
}

interface CWWord {
  word: string
  clue: string
  row: number
  col: number
  direction: 'across' | 'down'
  number: number
}

// Simple crossword builder: place words in a grid
function buildCrossword(items: { prompt: string; answer: string }[]): { grid: (CWCell | null)[][]; words: CWWord[]; size: number } {
  const SIZE = 13
  const grid: (CWCell | null)[][] = Array.from({ length: SIZE }, () => new Array(SIZE).fill(null))
  const words: CWWord[] = []
  let wordNum = 1

  // Place first word across in the middle
  const first = items[0]?.answer.toUpperCase().replace(/\s/g, '') || 'HELLO'
  const startCol = Math.floor((SIZE - first.length) / 2)
  const startRow = Math.floor(SIZE / 2)

  first.split('').forEach((letter, i) => {
    grid[startRow][startCol + i] = { letter, row: startRow, col: startCol + i, number: i === 0 ? wordNum : undefined, across: wordNum }
  })
  words.push({ word: first, clue: items[0]?.prompt || '', row: startRow, col: startCol, direction: 'across', number: wordNum })
  wordNum++

  // Place remaining words by finding intersections
  for (let wi = 1; wi < Math.min(items.length, 6); wi++) {
    const ans = items[wi]?.answer.toUpperCase().replace(/\s/g, '') || ''
    if (!ans) continue

    let placed = false
    // Try to intersect with existing letters
    for (let r = 1; r < SIZE - 1 && !placed; r++) {
      for (let c = 1; c < SIZE - 1 && !placed; c++) {
        const cell = grid[r][c]
        if (!cell) continue
        const idx = ans.indexOf(cell.letter)
        if (idx === -1) continue

        // Try placing down
        const dr = r - idx
        const dc = c
        if (dr >= 0 && dr + ans.length < SIZE) {
          let canPlace = true
          for (let i = 0; i < ans.length; i++) {
            const existing = grid[dr + i][dc]
            if (existing && existing.letter !== ans[i]) { canPlace = false; break }
            // Check adjacent (left/right must be empty unless same word)
            if (!existing) {
              if (grid[dr + i][dc - 1] || grid[dr + i][dc + 1]) { canPlace = false; break }
            }
          }
          // Check top/bottom clear
          if (canPlace && (grid[dr - 1]?.[dc] || grid[dr + ans.length]?.[dc])) canPlace = false

          if (canPlace) {
            ans.split('').forEach((letter, i) => {
              if (!grid[dr + i][dc]) {
                grid[dr + i][dc] = { letter, row: dr + i, col: dc, down: wordNum }
              } else {
                grid[dr + i][dc]!.down = wordNum
              }
            })
            if (!grid[dr][dc]!.number) grid[dr][dc]!.number = wordNum
            words.push({ word: ans, clue: items[wi].prompt, row: dr, col: dc, direction: 'down', number: wordNum })
            wordNum++
            placed = true
          }
        }
      }
    }
  }

  return { grid, words, size: SIZE }
}

export default function CrosswordActivity({ items, locale, onComplete }: ActivityProps) {
  const { grid, words } = buildCrossword(items.map((i) => ({ prompt: i.prompt, answer: i.answer })))
  const [userInput, setUserInput] = useState<Record<string, string>>({})
  const [solved, setSolved] = useState<Set<number>>(new Set())
  const [score, setScore] = useState(0)
  const [activeWord, setActiveWord] = useState<number | null>(words[0]?.number ?? null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const rtl = isRTL(locale)

  function cellKey(r: number, c: number) { return `${r}-${c}` }

  function handleInput(r: number, c: number, value: string) {
    const letter = value.slice(-1).toUpperCase()
    setUserInput((prev) => ({ ...prev, [cellKey(r, c)]: letter }))
    checkWords({ ...userInput, [cellKey(r, c)]: letter })
  }

  function checkWords(current: Record<string, string>) {
    const newSolved = new Set(solved)
    let newScore = score
    words.forEach((word) => {
      if (solved.has(word.number)) return
      const correct = word.word.split('').every((letter, i) => {
        const r = word.direction === 'down' ? word.row + i : word.row
        const c = word.direction === 'across' ? word.col + i : word.col
        return current[cellKey(r, c)] === letter
      })
      if (correct) {
        newSolved.add(word.number)
        newScore += SCORE_PER_CORRECT
      }
    })
    setSolved(newSolved)
    setScore(newScore)
    if (newSolved.size === words.length) {
      onComplete(newScore)
    }
  }

  const activeWordData = words.find((w) => w.number === activeWord)

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontSize: '0.85rem', textAlign: 'center' }}>
        Solved: {solved.size} / {words.length} · Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong>
      </p>

      {/* Active clue */}
      {activeWordData && (
        <div style={{
          background: 'var(--color-primary)',
          color: '#fff',
          borderRadius: 'var(--radius)',
          padding: '0.5rem 0.75rem',
          marginBottom: '0.75rem',
          fontSize: '0.9rem',
          fontFamily: 'var(--font-display)',
        }}>
          {activeWordData.number}{activeWordData.direction === 'across' ? 'A' : 'D'}: {activeWordData.clue}
        </div>
      )}

      {/* Grid */}
      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
        <div style={{
          display: 'inline-grid',
          gridTemplateColumns: `repeat(${13}, 1.8rem)`,
          gap: '1px',
          background: 'var(--color-border)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}>
          {Array.from({ length: 13 }, (_, r) =>
            Array.from({ length: 13 }, (_, c) => {
              const cell = grid[r][c]
              if (!cell) return (
                <div key={cellKey(r, c)} style={{ width: '1.8rem', height: '1.8rem', background: 'var(--color-text-primary)' }} />
              )
              const val = userInput[cellKey(r, c)] || ''
              const isSolved = (cell.across && solved.has(cell.across)) || (cell.down && solved.has(cell.down))
              return (
                <div key={cellKey(r, c)} style={{ position: 'relative', width: '1.8rem', height: '1.8rem', background: 'var(--color-surface)' }}>
                  {cell.number && (
                    <span style={{ position: 'absolute', top: '1px', insetInlineStart: '2px', fontSize: '0.45rem', color: 'var(--color-text-muted)', lineHeight: 1 }}>
                      {cell.number}
                    </span>
                  )}
                  <input
                    ref={(el) => { inputRefs.current[cellKey(r, c)] = el }}
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleInput(r, c, e.target.value)}
                    onFocus={() => {
                      const num = cell.across || cell.down
                      if (num) setActiveWord(num)
                    }}
                    aria-label={`Cell row ${r + 1} column ${c + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      background: isSolved ? 'color-mix(in srgb, var(--color-success) 20%, var(--color-surface))' : 'transparent',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: isSolved ? 'var(--color-success)' : 'var(--color-text-primary)',
                      outline: 'none',
                      textTransform: 'uppercase',
                      paddingTop: cell.number ? '0.5rem' : '0',
                      cursor: 'text',
                    }}
                  />
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Clues */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
        {(['across', 'down'] as const).map((dir) => (
          <div key={dir}>
            <h4 style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', fontSize: '0.7rem' }}>
              {dir}
            </h4>
            {words.filter((w) => w.direction === dir).map((w) => (
              <button
                key={w.number}
                onClick={() => setActiveWord(w.number)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: activeWord === w.number ? 'var(--color-primary-light)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.2rem 0.4rem',
                  color: solved.has(w.number) ? 'var(--color-success)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  textDecoration: solved.has(w.number) ? 'line-through' : 'none',
                  marginBottom: '0.2rem',
                }}
              >
                {w.number}. {w.clue}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
