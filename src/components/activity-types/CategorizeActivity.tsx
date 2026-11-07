'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'
import KidActionsBar from '@/components/game/KidActionsBar'
import ScorePill from '@/components/game/ScorePill'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// CATEGORIZE REBUILD (batch-2 #4, owner 2026-11-07 13:06–13:07 PKT):
//   (a) Buckets VISIBLE — they used to sit at the bottom under a long
//       scrolling list of chips, so the kid had to scroll to see them.
//       Buckets now come FIRST (top of the screen), the balls below.
//   (b) A visible timer counts the time to finish the game.
//   (c) 2 HINTS, each costs 5 marks: the hint picks one unsorted ball
//       and lights up its right bucket (gold glow + pulse + 👉) and the
//       ball itself, so the kid can see exactly where it goes.
//   Buckets are BUILT like real baskets — a coloured rim with the
//   category name, a trapezoid body with woven stripes, one bright
//   colour per category — never plain dashed boxes.
//   The items are BALLS — round, glossy, colourful — and a correct
//   ball DROPS into its bucket with a spring bounce.
//   Tap-to-select works too (tap a ball, then tap its bucket) — the
//   intro already promised it ("Tap an item, then tap its group"),
//   but the player never wired it, so touch play was drag-only.
//   Scoring is unchanged: +10 per correct placement. The 5-mark hint
//   cost is the only deduction, and it never takes the score below 0.

interface CatItem {
  id: string
  label: string
  category: string
  placed: boolean
  color: string
}

// One bright colour per bucket — a bucket is always its own colour,
// so the categories are tellable apart at a glance.
const BUCKET_COLORS = [
  { main: '#ff6b9d', dark: '#e14d82', light: '#ffd9e6' },
  { main: '#3b82f6', dark: '#2563eb', light: '#dbeafe' },
  { main: '#22c55e', dark: '#16a34a', light: '#dcfce7' },
  { main: '#f59e0b', dark: '#d97706', light: '#fef3c7' },
  { main: '#a855f7', dark: '#9333ea', light: '#f3e8ff' },
  { main: '#14b8a6', dark: '#0d9488', light: '#ccfbf1' },
]

const BALL_COLORS = ['#ff6b9d', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6', '#ef4444', '#f97316']

const HINT_COST = 5
const HINTS_TOTAL = 2
const HINT_MS = 3500

export default function CategorizeActivity({ items, locale, onComplete }: ActivityProps) {
  // items: prompt = item label, answer = category name
  const categories = Array.from(new Set(items.map((i) => i.answer)))
  const [catItems, setCatItems] = useState<CatItem[]>([])
  const [buckets, setBuckets] = useState<Record<string, string[]>>({})
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)
  // (b) Visible timer — counts UP from play start, shown as mm:ss.
  const [elapsed, setElapsed] = useState(0)
  // (c) 2 hints, 5 marks each. hintTarget lights up one ball and its
  // right bucket until the hint fades.
  const [hintsLeft, setHintsLeft] = useState(HINTS_TOTAL)
  const [hintTarget, setHintTarget] = useState<{ itemId: string; category: string } | null>(null)
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rtl = isRTL(locale)

  useEffect(() => {
    const ci: CatItem[] = shuffleArray(items.map((item, i) => ({
      id: `ci-${i}`,
      label: item.prompt,
      category: item.answer,
      placed: false,
      color: BALL_COLORS[i % BALL_COLORS.length],
    })))
    setCatItems(ci)
    const b: Record<string, string[]> = {}
    categories.forEach((c) => { b[c] = [] })
    setBuckets(b)
  }, [items])

  useEffect(() => {
    if (finished) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [finished])

  useEffect(() => () => { if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current) }, [])

  const unplaced = catItems.filter((c) => !c.placed)

  function placeIntoBucket(category: string, itemId: string | null) {
    if (!itemId) return
    const item = catItems.find((c) => c.id === itemId)
    if (!item || item.placed) return
    const isCorrect = item.category === category
    if (isCorrect) {
      if (hintTarget?.itemId === itemId) {
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
        setHintTarget(null)
      }
      setBuckets((prev) => ({ ...prev, [category]: [...prev[category], item.label] }))
      setCatItems((prev) => prev.map((c) => c.id === itemId ? { ...c, placed: true } : c))
      const newScore = score + SCORE_PER_CORRECT
      setScore(newScore)
      playEduSound('correct', readInteractiveSoundOn())
      const allPlaced = catItems.filter((c) => c.id !== itemId).every((c) => c.placed)
      if (allPlaced) {
        setFinished(true)
        onComplete(newScore, { correctCount: items.length, totalCount: items.length, elapsedSeconds: elapsed })
      }
    } else {
      setWrongFlash(category)
      playEduSound('wrong', readInteractiveSoundOn())
      setTimeout(() => setWrongFlash(null), 500)
    }
    setDraggedId(null)
    setSelectedId(null)
  }

  function useHint() {
    if (hintsLeft <= 0 || hintTarget) return
    const next = unplaced[0]
    if (!next) return
    playEduSound('click', readInteractiveSoundOn())
    setHintTarget({ itemId: next.id, category: next.category })
    setHintsLeft((h) => h - 1)
    // Each hint costs 5 marks, taken from the score at once — the
    // score never goes below 0.
    setScore((s) => Math.max(0, s - HINT_COST))
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
    hintTimeoutRef.current = setTimeout(() => setHintTarget(null), HINT_MS)
  }

  function bucketColor(cat: string) {
    const idx = categories.indexOf(cat)
    return BUCKET_COLORS[idx % BUCKET_COLORS.length]
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🗂️</div>
        <h2 style={{ fontFamily: FUNKY_FONT, marginTop: '0.5rem' }}>All Categorized!</h2>
        <p style={{ marginTop: '0.5rem' }}>
          <ScorePill score={score} total={items.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          ⏱ Time: {formatElapsed(elapsed)}
        </p>
      </motion.div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.75rem 0.5rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <span>Remaining: {unplaced.length}</span>
        <span aria-live="polite" aria-label={`Elapsed time ${formatElapsed(elapsed)}`}>⏱ {formatElapsed(elapsed)}</span>
        <ScorePill score={score} />
      </div>

      {/* KID ACTIONS (batch 1, item 17): Hint only — 2 per game,
          5 marks each. Skip / see-the-answer do not map to sorting
          — they are hidden, never faked. */}
      <KidActionsBar
        onHint={hintsLeft > 0 && !hintTarget ? useHint : undefined}
        hintUsed={hintsLeft <= 0 || hintTarget !== null}
        hintNote={hintsLeft > 0 ? `${hintsLeft} left · −${HINT_COST} marks each` : 'No hints left'}
      />

      {/* Buckets FIRST — visible without scrolling. Each one is a
          real basket: coloured rim + trapezoid striped body. */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(categories.length, 2)}, 1fr)`, gap: '0.75rem', marginBottom: '1rem' }}>
        {categories.map((cat) => {
          const color = bucketColor(cat)
          const isHinted = hintTarget?.category === cat
          const isWrong = wrongFlash === cat
          return (
            <div
              key={cat}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => placeIntoBucket(cat, draggedId)}
              onClick={() => { if (selectedId) placeIntoBucket(cat, selectedId) }}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && selectedId) { e.preventDefault(); placeIntoBucket(cat, selectedId) } }}
              tabIndex={0}
              role="button"
              aria-label={`Basket: ${cat}. Drop a ball here.`}
              style={{
                position: 'relative',
                cursor: selectedId ? 'pointer' : 'default',
                outline: isWrong ? '3px solid var(--color-danger)' : isHinted ? '3px solid #ffc93c' : 'none',
                outlineOffset: '2px',
                borderRadius: '12px',
              }}
            >
              {/* Rim */}
              <div style={{
                background: color.dark, borderRadius: '12px 12px 0 0',
                padding: '0.5rem 0.5rem 0.35rem', textAlign: 'center',
                position: 'relative', zIndex: 1,
              }}>
                <span style={{
                  color: '#fff', fontFamily: FUNKY_FONT, fontSize: '0.95rem',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  🧺 {cat}
                </span>
                {isHinted ? (
                  <span aria-hidden="true" style={{ position: 'absolute', right: '6px', top: '2px', fontSize: '1.2rem', lineHeight: 1 }}>👉</span>
                ) : null}
              </div>
              {/* Body — a bucket: wide at the top, narrower at the
                  bottom, with woven stripes. */}
              <motion.div
                animate={isHinted ? { scale: [1, 1.03, 1] } : {}}
                transition={isHinted ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } : {}}
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 88% 100%, 12% 100%)',
                  background: `repeating-linear-gradient(0deg, ${color.main} 0 10px, ${color.light} 10px 20px)`,
                  minHeight: '96px',
                  padding: '0.6rem 0.9rem 0.75rem',
                  display: 'flex', flexWrap: 'wrap', gap: '0.35rem',
                  alignContent: 'flex-start', justifyContent: 'center',
                  boxShadow: isHinted ? '0 0 18px #ffc93c' : 'none',
                }}
              >
                {(buckets[cat] || []).map((label, i) => (
                  <motion.span
                    key={`${cat}-${i}`}
                    initial={{ y: -28, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 13 }}
                    style={{
                      padding: '0.25rem 0.55rem',
                      borderRadius: '9999px',
                      background: '#fff',
                      color: '#26264a',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-body)',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }}
                  >
                    {label}
                  </motion.span>
                ))}
              </motion.div>
            </div>
          )
        })}
      </div>

      {/* Balls — round, glossy, colourful. Drag one up into its
          basket, or tap it then tap the basket. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', justifyContent: 'center', minHeight: '48px' }}>
        {unplaced.map((item) => {
          const isHinted = hintTarget?.itemId === item.id
          const isSelected = selectedId === item.id
          return (
            <motion.div
              key={item.id}
              draggable
              onDragStart={() => { setDraggedId(item.id); setSelectedId(null) }}
              onDragEnd={() => setDraggedId(null)}
              onClick={() => setSelectedId((s) => (s === item.id ? null : item.id))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedId((s) => (s === item.id ? null : item.id))
                }
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 1.12 }}
              animate={isHinted ? { scale: [1, 1.12, 1] } : {}}
              transition={isHinted ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : {}}
              tabIndex={0}
              role="button"
              aria-label={`Ball: ${item.label}. Drag it to a basket, or tap to select then tap a basket.`}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 42%), ${item.color}`,
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 800,
                fontFamily: FUNKY_FONT,
                cursor: 'grab',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '6px',
                lineHeight: 1.1,
                overflow: 'hidden',
                overflowWrap: 'break-word',
                border: isSelected || isHinted ? '3px solid #ffc93c' : '3px solid rgba(255,255,255,0.65)',
                boxShadow: isSelected || isHinted
                  ? '0 0 0 3px rgba(255,201,60,0.4), 0 4px 12px rgba(0,0,0,0.3)'
                  : '0 4px 10px rgba(0,0,0,0.25)',
                opacity: draggedId === item.id ? 0.5 : 1,
              }}
            >
              {item.label}
            </motion.div>
          )
        })}
      </div>

      {selectedId ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.6rem', textAlign: 'center' }}>
          Ball selected — now tap its basket 👆
        </p>
      ) : null}
      <AnimatePresence>
        {hintTarget ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              color: 'var(--color-text-primary)', fontSize: '0.9rem', marginTop: '0.6rem',
              textAlign: 'center', fontFamily: FUNKY_FONT,
            }}
          >
            💡 Look at the glowing basket — that&apos;s where this ball goes! (−{HINT_COST} marks)
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
