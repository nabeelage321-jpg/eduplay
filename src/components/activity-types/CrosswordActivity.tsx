'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, isRTL } from './shared'
import { crosswordClue } from '@/lib/crossword-clue'
import KidActionsBar from '@/components/game/KidActionsBar'
import ScorePill from '@/components/game/ScorePill'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

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

// CROSSWORD BUILDER — BATCH 1 (final list item 22): two fixes.
//   1. REAL CLUES: a clue must never BE the answer. Programme
//      prompts like "History word: History" name the answer, so the
//      clue becomes "A History word with 7 letters" (length from
//      the answer itself — nothing invented). A teacher's real
//      question/definition is kept verbatim.
//   2. INTERSECTING GRID: every word after the first must CROSS an
//      existing word (across AND down are both tried, at every
//      shared letter), so the grid is a real crossword instead of
//      stacked columns. Words that cannot cross anything are left
//      out — never placed floating, never invented.
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
  words.push({ word: first, clue: crosswordClue(items[0]?.prompt || '', items[0]?.answer || ''), row: startRow, col: startCol, direction: 'across', number: wordNum })
  wordNum++

  function canPlaceDown(ans: string, r0: number, c: number): boolean {
    if (r0 < 0 || r0 + ans.length > SIZE) return false
    for (let i = 0; i < ans.length; i++) {
      const existing = grid[r0 + i][c]
      if (existing && existing.letter !== ans[i]) return false
      if (!existing) {
        if (grid[r0 + i][c - 1] || grid[r0 + i][c + 1]) return false
      }
    }
    if (grid[r0 - 1]?.[c] || grid[r0 + ans.length]?.[c]) return false
    return true
  }

  function canPlaceAcross(ans: string, r: number, c0: number): boolean {
    if (c0 < 0 || c0 + ans.length > SIZE) return false
    for (let i = 0; i < ans.length; i++) {
      const existing = grid[r][c0 + i]
      if (existing && existing.letter !== ans[i]) return false
      if (!existing) {
        if (grid[r - 1]?.[c0 + i] || grid[r + 1]?.[c0 + i]) return false
      }
    }
    if (grid[r]?.[c0 - 1] || grid[r]?.[c0 + ans.length]) return false
    return true
  }

  function placeDown(ans: string, r0: number, c: number) {
    ans.split('').forEach((letter, i) => {
      if (!grid[r0 + i][c]) {
        grid[r0 + i][c] = { letter, row: r0 + i, col: c, down: wordNum }
      } else {
        grid[r0 + i][c]!.down = wordNum
      }
    })
    if (!grid[r0][c]!.number) grid[r0][c]!.number = wordNum
  }

  function placeAcross(ans: string, r: number, c0: number) {
    ans.split('').forEach((letter, i) => {
      if (!grid[r][c0 + i]) {
        grid[r][c0 + i] = { letter, row: r, col: c0 + i, across: wordNum }
      } else {
        grid[r][c0 + i]!.across = wordNum
      }
    })
    if (!grid[r][c0]!.number) grid[r][c0]!.number = wordNum
  }

  // Place remaining words by finding intersections — across AND
  // down, at every shared letter, so each new word CROSSES the grid.
  for (let wi = 1; wi < Math.min(items.length, 10); wi++) {
    const ans = items[wi]?.answer.toUpperCase().replace(/\s/g, '') || ''
    if (!ans) continue

    let placed = false
    for (let r = 1; r < SIZE - 1 && !placed; r++) {
      for (let c = 1; c < SIZE - 1 && !placed; c++) {
        const cell = grid[r][c]
        if (!cell) continue
        // Every position where this crossing letter occurs in the
        // word — not just the first — is a candidate crossing.
        const indices: number[] = []
        for (let k = 0; k < ans.length; k++) if (ans[k] === cell.letter) indices.push(k)
        for (const idx of indices) {
          if (placed) break
          // Try placing down through this crossing letter.
          const dr = r - idx
          if (canPlaceDown(ans, dr, c)) {
            placeDown(ans, dr, c)
            words.push({ word: ans, clue: crosswordClue(items[wi].prompt, items[wi].answer), row: dr, col: c, direction: 'down', number: wordNum })
            wordNum++
            placed = true
            break
          }
          // Try placing across through this crossing letter.
          const dc = c - idx
          if (canPlaceAcross(ans, r, dc)) {
            placeAcross(ans, r, dc)
            words.push({ word: ans, clue: crosswordClue(items[wi].prompt, items[wi].answer), row: r, col: dc, direction: 'across', number: wordNum })
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
  // KID ACTIONS (batch 1, item 17): HINT reveals ONE letter of the
  // active word, once per word. Skip and see-the-answer do not map
  // to a grid — they are hidden, never faked.
  const [hintWords, setHintWords] = useState<Set<number>>(new Set())
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
      onComplete(newScore, { correctCount: newSolved.size, totalCount: words.length })
    }
  }

  const activeWordData = words.find((w) => w.number === activeWord)

  function useHint() {
    if (!activeWordData || solved.has(activeWordData.number) || hintWords.has(activeWordData.number)) return
    for (let i = 0; i < activeWordData.word.length; i++) {
      const r = activeWordData.direction === 'down' ? activeWordData.row + i : activeWordData.row
      const c = activeWordData.direction === 'across' ? activeWordData.col + i : activeWordData.col
      if (!userInput[cellKey(r, c)]) {
        const next = { ...userInput, [cellKey(r, c)]: activeWordData.word[i] }
        setUserInput(next)
        setHintWords((prev) => new Set(prev).add(activeWordData.number))
        checkWords(next)
        return
      }
    }
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.75rem 0.5rem', maxWidth: '600px', margin: '0 auto' }}>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem', fontSize: '0.85rem', textAlign: 'center' }}>
        Solved: {solved.size} / {words.length} · <ScorePill score={score} />
      </p>
      {/* KID ACTIONS (batch 1, item 17): Hint only. */}
      <KidActionsBar
        onHint={activeWordData && !solved.has(activeWordData.number) ? useHint : undefined}
        hintUsed={activeWordData ? hintWords.has(activeWordData.number) : false}
      />

      {/* Active clue */}
      {activeWordData && (
        <div style={{
          background: 'var(--color-primary)',
          color: '#fff',
          borderRadius: 'var(--radius)',
          padding: '0.5rem 0.75rem',
          marginBottom: '0.75rem',
          fontSize: '0.95rem',
          fontFamily: FUNKY_FONT,
        }}>
          {activeWordData.number}{activeWordData.direction === 'across' ? 'A' : 'D'}: {activeWordData.clue}
        </div>
      )}

      {/* Grid */}
      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
        <div style={{
          display: 'inline-grid',
          gridTemplateColumns: `repeat(${13}, 1.6rem)`,
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
                <div key={cellKey(r, c)} style={{ width: '1.6rem', height: '1.6rem', background: 'var(--color-text-primary)' }} />
              )
              const val = userInput[cellKey(r, c)] || ''
              const isSolved = (cell.across && solved.has(cell.across)) || (cell.down && solved.has(cell.down))
              return (
                <div key={cellKey(r, c)} style={{ position: 'relative', width: '1.6rem', height: '1.6rem', background: 'var(--color-surface)' }}>
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
