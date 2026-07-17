'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, isRTL } from './shared'

const GRID_SIZE = 12
const DIRECTIONS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
]

interface PlacedWord {
  word: string
  clue: string
  cells: [number, number][]
}

function buildWordSearch(words: string[]): { grid: string[][]; placed: PlacedWord[]; clues: string[] } {
  const grid: string[][] = Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(''))
  const placed: PlacedWord[] = []
  const clueMap: Record<string, string> = {}

  for (const word of words) {
    const w = word.toUpperCase().replace(/\s/g, '')
    let ok = false
    for (let attempt = 0; attempt < 200 && !ok; attempt++) {
      const [dr, dc] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]
      const r = Math.floor(Math.random() * GRID_SIZE)
      const c = Math.floor(Math.random() * GRID_SIZE)
      if (r + dr * (w.length - 1) < 0 || r + dr * (w.length - 1) >= GRID_SIZE) continue
      if (c + dc * (w.length - 1) < 0 || c + dc * (w.length - 1) >= GRID_SIZE) continue
      let fits = true
      for (let i = 0; i < w.length; i++) {
        const cell = grid[r + dr * i][c + dc * i]
        if (cell && cell !== w[i]) { fits = false; break }
      }
      if (!fits) continue
      const cells: [number, number][] = []
      for (let i = 0; i < w.length; i++) {
        grid[r + dr * i][c + dc * i] = w[i]
        cells.push([r + dr * i, c + dc * i])
      }
      placed.push({ word: w, clue: '', cells })
      ok = true
    }
  }
  // Fill blanks
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++)
      if (!grid[r][c]) grid[r][c] = letters[Math.floor(Math.random() * letters.length)]

  return { grid, placed, clues: words }
}

export default function WordsearchActivity({ items, locale, onComplete }: ActivityProps) {
  const words = items.map((i) => i.answer)
  const clues = items.map((i) => i.prompt)
  const [{ grid, placed }] = useState(() => buildWordSearch(words))
  const [selecting, setSelecting] = useState(false)
  const [selection, setSelection] = useState<[number, number][]>([])
  const [found, setFound] = useState<Set<string>>(new Set())
  const [score, setScore] = useState(0)
  const rtl = isRTL(locale)

  function cellKey(r: number, c: number) { return `${r},${c}` }

  function startSelect(r: number, c: number) {
    setSelecting(true)
    setSelection([[r, c]])
  }

  function extendSelect(r: number, c: number) {
    if (!selecting) return
    const start = selection[0]
    if (!start) return
    // Only allow straight lines
    const dr = Math.sign(r - start[0])
    const dc = Math.sign(c - start[1])
    const len = Math.max(Math.abs(r - start[0]), Math.abs(c - start[1])) + 1
    const newSel: [number, number][] = []
    for (let i = 0; i < len; i++) {
      const nr = start[0] + dr * i
      const nc = start[1] + dc * i
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) newSel.push([nr, nc])
    }
    setSelection(newSel)
  }

  function endSelect() {
    setSelecting(false)
    const selStr = selection.map(([r, c]) => cellKey(r, c)).join('|')
    for (const pw of placed) {
      if (found.has(pw.word)) continue
      const pwStr = pw.cells.map(([r, c]) => cellKey(r, c)).join('|')
      const pwStrRev = [...pw.cells].reverse().map(([r, c]) => cellKey(r, c)).join('|')
      if (selStr === pwStr || selStr === pwStrRev) {
        const newFound = new Set(found).add(pw.word)
        setFound(newFound)
        setScore((s) => s + SCORE_PER_CORRECT)
        if (newFound.size === placed.length) onComplete(score + SCORE_PER_CORRECT)
        break
      }
    }
    setSelection([])
  }

  const selSet = new Set(selection.map(([r, c]) => cellKey(r, c)))
  const foundCells = new Set<string>()
  for (const pw of placed) {
    if (found.has(pw.word)) pw.cells.forEach(([r, c]) => foundCells.add(cellKey(r, c)))
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <span>Found: {found.size} / {placed.length}</span>
        <span>Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong></span>
      </div>

      {/* Word list */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
        {placed.map((pw, i) => (
          <span key={pw.word} style={{
            padding: '0.2rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            background: found.has(pw.word) ? 'var(--color-success)' : 'var(--color-surface)',
            color: found.has(pw.word) ? '#fff' : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            fontSize: '0.8rem',
            textDecoration: found.has(pw.word) ? 'line-through' : 'none',
            transition: 'all 0.3s',
          }}>
            {clues[i] || pw.word}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div
        onMouseLeave={endSelect}
        onTouchEnd={endSelect}
        style={{
          display: 'inline-grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 2rem)`,
          gap: '1px',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const key = cellKey(r, c)
            const isSelected = selSet.has(key)
            const isFound = foundCells.has(key)
            return (
              <div
                key={key}
                onMouseDown={() => startSelect(r, c)}
                onMouseEnter={() => extendSelect(r, c)}
                onMouseUp={endSelect}
                onTouchStart={() => startSelect(r, c)}
                onTouchMove={(e) => {
                  const touch = e.touches[0]
                  const el = document.elementFromPoint(touch.clientX, touch.clientY)
                  const rc = el?.getAttribute('data-cell')
                  if (rc) { const [rr, cc] = rc.split(',').map(Number); extendSelect(rr, cc) }
                }}
                data-cell={`${r},${c}`}
                role="gridcell"
                aria-label={`${letter} at row ${r + 1} column ${c + 1}`}
                style={{
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.2rem',
                  background: isFound ? 'var(--color-success)' : isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: (isFound || isSelected) ? '#fff' : 'var(--color-text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  fontFamily: 'monospace',
                }}
              >
                {letter}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
