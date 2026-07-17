'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'

interface Hotspot {
  id: string
  label: string
  x: number // percentage
  y: number // percentage
  answered: boolean
  correct: boolean | null
}

export default function LabelledDiagramActivity({ items, locale, onComplete }: ActivityProps) {
  // items: prompt = hotspot label, answer = correct name, imageUrl = diagram image
  const imageUrl = items[0]?.imageUrl || ''
  const [hotspots] = useState<Hotspot[]>(() =>
    items.map((item, i) => ({
      id: `hs-${i}`,
      label: item.answer,
      x: 20 + (i % 4) * 20,
      y: 20 + Math.floor(i / 4) * 30,
      answered: false,
      correct: null,
    }))
  )
  const [hspots, setHspots] = useState<Hotspot[]>(hotspots)
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null)
  const [options] = useState(() => shuffleArray(items.map((i) => i.answer)))
  const [usedOptions, setUsedOptions] = useState<Set<string>>(new Set())
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)

  function selectHotspot(id: string) {
    const hs = hspots.find((h) => h.id === id)
    if (hs?.answered) return
    setActiveHotspot((prev) => (prev === id ? null : id))
  }

  function assignLabel(label: string) {
    if (!activeHotspot) return
    const hs = hspots.find((h) => h.id === activeHotspot)
    if (!hs) return
    const isCorrect = hs.label === label
    const newScore = isCorrect ? score + SCORE_PER_CORRECT : score
    if (isCorrect) setScore(newScore)
    setFeedback({ type: isCorrect ? 'correct' : 'wrong', msg: getRandomFeedback(isCorrect ? 'correct' : 'wrong') })
    setHspots((prev) => prev.map((h) =>
      h.id === activeHotspot ? { ...h, answered: true, correct: isCorrect } : h
    ))
    setUsedOptions((prev) => new Set(prev).add(label))
    setActiveHotspot(null)
    setTimeout(() => {
      setFeedback(null)
      const allAnswered = hspots.every((h) => h.answered || h.id === activeHotspot)
      if (allAnswered) { setFinished(true); onComplete(newScore) }
    }, 800)
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🗺️</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Diagram Labelled!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score}</p>
      </motion.div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '560px', margin: '0 auto' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '0.5rem' }}>
        Click a hotspot (●) then select its label
      </p>

      {/* Diagram area */}
      <div style={{
        position: 'relative',
        background: imageUrl ? `url(${imageUrl}) center/cover` : 'var(--color-surface-alt)',
        border: '2px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        height: '240px',
        marginBottom: '1rem',
        overflow: 'hidden',
      }}>
        {!imageUrl && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.875rem',
          }}>
            Add an image URL to the first item
          </div>
        )}
        {hspots.map((hs) => (
          <button
            key={hs.id}
            onClick={() => selectHotspot(hs.id)}
            aria-label={`Hotspot ${hs.answered ? hs.label : 'unlabelled'}`}
            aria-pressed={activeHotspot === hs.id}
            style={{
              position: 'absolute',
              left: `${hs.x}%`,
              top: `${hs.y}%`,
              transform: 'translate(-50%, -50%)',
              width: '28px', height: '28px',
              borderRadius: '50%',
              border: `3px solid ${hs.answered ? (hs.correct ? 'var(--color-success)' : 'var(--color-danger)') : activeHotspot === hs.id ? 'var(--color-primary)' : '#fff'}`,
              background: hs.answered ? (hs.correct ? 'var(--color-success)' : 'var(--color-danger)') : activeHotspot === hs.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.85)',
              color: hs.answered || activeHotspot === hs.id ? '#fff' : 'var(--color-primary)',
              cursor: hs.answered ? 'default' : 'pointer',
              fontSize: '0.75rem', fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {hs.answered ? (hs.correct ? '✓' : '✗') : '●'}
          </button>
        ))}
        {/* Labels for answered hotspots */}
        {hspots.filter((h) => h.answered).map((hs) => (
          <div key={`label-${hs.id}`} style={{
            position: 'absolute',
            left: `${hs.x}%`,
            top: `calc(${hs.y}% + 18px)`,
            transform: 'translateX(-50%)',
            background: hs.correct ? 'var(--color-success)' : 'var(--color-danger)',
            color: '#fff',
            fontSize: '0.65rem',
            padding: '0.15rem 0.4rem',
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-body)',
            pointerEvents: 'none',
          }}>
            {hs.label}
          </div>
        ))}
      </div>

      {/* Label options */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.75rem' }}>
        {options.map((opt) => {
          const used = usedOptions.has(opt)
          return (
            <motion.button
              key={opt}
              whileHover={!used && activeHotspot ? { scale: 1.05 } : {}}
              whileTap={!used && activeHotspot ? { scale: 0.95 } : {}}
              onClick={() => !used && assignLabel(opt)}
              disabled={used || !activeHotspot}
              aria-label={`Label: ${opt}`}
              style={{
                padding: '0.4rem 0.75rem', borderRadius: 'var(--radius)',
                border: '2px solid var(--color-border)',
                background: used ? 'var(--color-border)' : activeHotspot ? 'var(--color-surface)' : 'var(--color-surface-alt)',
                color: used ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                fontSize: '0.875rem', fontFamily: 'var(--font-body)',
                cursor: used || !activeHotspot ? 'not-allowed' : 'pointer',
                textDecoration: used ? 'line-through' : 'none',
                opacity: used ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              {opt}
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              padding: '0.6rem', borderRadius: 'var(--radius)', textAlign: 'center',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.95rem',
            }}>
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', textAlign: 'center' }}>
        Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong>
        {activeHotspot && <span style={{ marginInlineStart: '1rem' }}>← Select a label</span>}
      </p>
    </div>
  )
}
