'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'
import { diagramImageUrl, diagramImageCredit } from '@/lib/labelled-diagram'
import ScorePill from '@/components/game/ScorePill'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

interface Hotspot {
  id: string
  label: string
  x: number // percentage
  y: number // percentage
  answered: boolean
  correct: boolean | null
}

// LABELLED DIAGRAM — COMPLETE (batch-2 #7, owner 2026-11-07 13:15 PKT):
// the game needs a REAL diagram picture. The picture lives on the
// first item's imageUrl (the adapter copies the game's content.image
// onto every item for programme rows; the creator stores the
// teacher-picked URL on every item for teacher games).
//
// WITHOUT a picture the game does NOT play as a blind dot quiz —
// the old "Add an image URL to the first item" note sat inside a
// fully playable grid of dots, so a kid labelled dots on a blank
// surface. Now the player shows a clear "This game needs a picture"
// state instead: no dots, no labels, no score. A picture URL that
// fails to load falls back to the same state, never a broken image.
// The hotspot + label mechanic itself is UNCHANGED (tap a dot,
// pick its label; +10 per correct label).
//
// Hotspot positions: the dots sit on a fixed grid (they always did
// — the stored per-label x/y in programme content is not used by
// the player). Teacher-placed positions (tap the picture to place
// each label) is a follow-up build, not this one; the convert
// refusal ("needs an image with labels on it") still stands for
// games without one. Print stays not-printable in v1 (text-only
// worksheets cannot carry the picture).

export default function LabelledDiagramActivity({ items, locale, onComplete }: ActivityProps) {
  // items: prompt = hotspot label, answer = correct name, imageUrl = diagram image
  const imageUrl = diagramImageUrl(items)
  const imageCredit = diagramImageCredit(items)
  const [imageFailed, setImageFailed] = useState(false)
  const hasImage = Boolean(imageUrl) && !imageFailed
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
  const [correctCount, setCorrectCount] = useState(0)
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
    const newCorrect = isCorrect ? correctCount + 1 : correctCount
    if (isCorrect) {
      setScore(newScore)
      setCorrectCount(newCorrect)
    }
    setFeedback({ type: isCorrect ? 'correct' : 'wrong', msg: getRandomFeedback(isCorrect ? 'correct' : 'wrong') })
    playEduSound(isCorrect ? 'correct' : 'wrong', readInteractiveSoundOn())
    setHspots((prev) => prev.map((h) =>
      h.id === activeHotspot ? { ...h, answered: true, correct: isCorrect } : h
    ))
    setUsedOptions((prev) => new Set(prev).add(label))
    setActiveHotspot(null)
    setTimeout(() => {
      setFeedback(null)
      const allAnswered = hspots.every((h) => h.answered || h.id === activeHotspot)
      if (allAnswered) { setFinished(true); onComplete(newScore, { correctCount: newCorrect, totalCount: items.length }) }
    }, 800)
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🗺️</div>
        <h2 style={{ fontFamily: FUNKY_FONT }}>Diagram Labelled!</h2>
        <p style={{ marginTop: '0.5rem' }}>
          <ScorePill score={score} total={items.length * SCORE_PER_CORRECT} big />
        </p>
      </motion.div>
    )
  }

  // NO PICTURE, NO QUIZ (batch-2 #7): the labels sit on the picture
  // itself, so without one there is nothing to play — no dots, no
  // labels, no score. The maker is told exactly how to fix it.
  if (!hasImage) {
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🖼️</div>
        <h2 style={{ fontFamily: FUNKY_FONT, color: 'var(--color-text-primary)' }}>This game needs a picture</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
          The labels sit on a diagram picture — and this game does not have one yet, so there is nothing to label.
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Teachers: add a picture in the creator — open the game to edit, then use “Diagram picture”
          to pick or paste one. The picture goes to the owner for approval before the game can go public.
        </p>
      </div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.75rem 0.5rem', maxWidth: '560px', margin: '0 auto' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '0.5rem' }}>
        Click a hotspot (●) then select its label
      </p>

      {/* Diagram area — a real <img> (not a CSS background) so a
          broken URL falls back to the needs-a-picture state. */}
      <div style={{
        position: 'relative',
        border: '2px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        height: '240px',
        marginBottom: '0.25rem',
        overflow: 'hidden',
        background: 'var(--color-surface-alt)',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl ?? ''}
          alt=""
          onError={() => setImageFailed(true)}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
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
      {imageCredit ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', textAlign: 'center', margin: '0 0 0.75rem' }}>
          🖼️ {imageCredit}
        </p>
      ) : (
        <div style={{ marginBottom: '0.75rem' }} />
      )}

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
              color: '#fff', fontFamily: FUNKY_FONT, fontSize: '0.95rem',
            }}>
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.75rem', textAlign: 'center' }}>
        <ScorePill score={score} total={items.length * SCORE_PER_CORRECT} />
        {activeHotspot && <span style={{ marginInlineStart: '1rem' }}>← Select a label</span>}
      </p>
    </div>
  )
}
