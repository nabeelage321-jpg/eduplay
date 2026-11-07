'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL } from './shared'
import { detectOrderRule, orderHintText, type OrderRule } from '@/lib/order-rule'
import KidActionsBar from '@/components/game/KidActionsBar'
import ScorePill from '@/components/game/ScorePill'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

interface OrderItem {
  id: string
  label: string
  correctIndex: number
}

// ORDER RULE FIX (batch-2 #5, owner 2026-11-07 13:09 PKT): the
// "correct" order used to be the game's hidden list order, so a
// sensible list got marked wrong with no way to work out why. The
// order is now DEDUCIBLE: the rule is detected from the items
// themselves (see src/lib/order-rule.ts — alphabetical, oldest to
// newest, or smallest to largest), shown on the screen, and every
// item carries its order clue (the big first letter, the year, or
// the number itself). Drag, Check button, ✓/✗ feedback, and +10 per
// correct position are unchanged.

export default function OrderActivity({ items, locale, onComplete }: ActivityProps) {
  // items: prompt = label, answer = correct position (1-based string) or we use item order
  const [ordered, setOrdered] = useState<OrderItem[]>([])
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const rtl = isRTL(locale)
  // The rule this game can be solved by — detected from the items,
  // never guessed. Null when the words carry no deducible rule.
  const rule: OrderRule | null = detectOrderRule(items)
  // HINT (batch-2 #5, owner 13:12 PKT): 2 per game, 5 marks each —
  // the same hint economics as Categorize. The hint shows the YEAR
  // of one misplaced line when its text carries one ("Mughal — 1526"),
  // else the position the data carries ("MUGHAL goes 2nd of 5").
  // No year is ever invented: a bare label has none to show.
  const HINT_COST = 5
  const HINTS_TOTAL = 2
  const [hintsLeft, setHintsLeft] = useState(HINTS_TOTAL)
  const [hintShown, setHintShown] = useState<{ itemId: string; text: string } | null>(null)
  const allCorrect = ordered.length > 0 && ordered.every((item, i) => item.correctIndex === i)

  function useHint() {
    if (hintsLeft <= 0 || hintShown) return
    const misplacedIdx = ordered.findIndex((item, i) => item.correctIndex !== i)
    if (misplacedIdx === -1) return
    const target = ordered[misplacedIdx]
    playEduSound('click', readInteractiveSoundOn())
    setHintShown({
      itemId: target.id,
      text: orderHintText(target.label, target.correctIndex + 1, ordered.length),
    })
    setHintsLeft((h) => h - 1)
    setScore((s) => Math.max(0, s - HINT_COST))
  }

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
    setHintShown(null)
    playEduSound(res.every(Boolean) ? 'correct' : 'wrong', readInteractiveSoundOn())
    if (res.every(Boolean)) {
      setTimeout(
        () => onComplete(newScore, { correctCount: correct, totalCount: ordered.length }),
        1200,
      )
    }
  }

  function retry() {
    setOrdered(shuffleArray([...ordered]))
    setChecked(false)
    setResults([])
    setHintShown(null)
  }

  // The order clue, carried ON the item: the big first letter for
  // alphabetical, the year for chronological, the number itself for
  // numeric. No rule detected = the label as it is, nothing faked.
  function renderLabel(label: string) {
    if (rule?.clue === 'first-letter') {
      return (
        <>
          <span style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '1.2rem', fontFamily: FUNKY_FONT }}>
            {label.charAt(0)}
          </span>
          <span>{label.slice(1)}</span>
        </>
      )
    }
    if (rule?.clue === 'year') {
      const m = label.match(/\b(1\d{3}|20\d{2})\b/)
      if (m && m.index !== undefined) {
        return (
          <>
            <span>{label.slice(0, m.index)}</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 800, fontFamily: FUNKY_FONT }}>{m[0]}</span>
            <span>{label.slice(m.index + m[0].length)}</span>
          </>
        )
      }
    }
    if (rule?.clue === 'number') {
      return (
        <span style={{ color: 'var(--color-primary)', fontWeight: 800, fontFamily: FUNKY_FONT }}>{label}</span>
      )
    }
    return <span>{label}</span>
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.75rem 0.5rem', maxWidth: '480px', margin: '0 auto' }}>
      {rule ? (
        <div style={{
          background: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))',
          border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)',
          padding: '0.75rem 1rem', marginBottom: '0.75rem', textAlign: 'center',
        }}>
          <p style={{ fontFamily: FUNKY_FONT, fontSize: '1.05rem', color: 'var(--color-text-primary)', margin: 0 }}>
            📏 Order: {rule.label}
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            {rule.tip}
          </p>
        </div>
      ) : (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
          These words don&apos;t show an order rule (no A–Z, dates, or numbers to sort by) — put them in the order that makes sense to you, then tap Check Order.
        </p>
      )}

      {/* KID ACTIONS (batch 1, item 17): Hint only — 2 per game,
          5 marks each. Skip / see-the-answer do not map to ordering
          — they are hidden, never faked. */}
      <KidActionsBar
        onHint={hintsLeft > 0 && !hintShown && !allCorrect ? useHint : undefined}
        hintUsed={hintsLeft <= 0 || hintShown !== null || allCorrect}
        hintNote={hintsLeft > 0 ? `${hintsLeft} left · −${HINT_COST} marks each` : 'No hints left'}
      />
      <AnimatePresence>
        {hintShown ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            role="status"
            style={{
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)',
              background: 'color-mix(in srgb, var(--color-warning) 18%, var(--color-surface))',
              border: '2px solid var(--color-warning)',
              color: 'var(--color-text-primary)', fontSize: '1rem', textAlign: 'center',
              fontFamily: FUNKY_FONT, marginBottom: '0.75rem', marginTop: 0,
            }}
          >
            {hintShown.text} (−{HINT_COST} marks)
          </motion.p>
        ) : null}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {ordered.map((item, idx) => {
          const isCorrect = checked ? results[idx] : null
          const isHinted = hintShown?.itemId === item.id
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
                background: isHinted ? 'color-mix(in srgb, var(--color-warning) 18%, var(--color-surface))'
                  : isCorrect === true ? 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))'
                  : isCorrect === false ? 'color-mix(in srgb, var(--color-danger) 15%, var(--color-surface))'
                  : 'var(--color-surface)',
                border: `2px solid ${isHinted ? 'var(--color-warning)' : isCorrect === true ? 'var(--color-success)' : isCorrect === false ? 'var(--color-danger)' : 'var(--color-border)'}`,
                cursor: checked ? 'default' : 'grab',
                boxShadow: isHinted ? '0 0 14px rgba(245,158,11,0.5)' : 'var(--shadow)',
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
              <span style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', flex: 1, display: 'flex', alignItems: 'baseline', gap: '0.1rem' }}>
                {renderLabel(item.label)}
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
              color: '#fff', fontFamily: FUNKY_FONT, fontSize: '1rem',
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
              color: 'var(--color-primary)', fontFamily: FUNKY_FONT, fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Try Again
          </motion.button>
        )}
      </div>

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.75rem', textAlign: 'center' }}>
        <ScorePill score={score} />
      </p>
    </div>
  )
}
