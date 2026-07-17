'use client'

import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityItem } from '@/types'

interface ItemEditorProps {
  items: ActivityItem[]
  onChange: (items: ActivityItem[]) => void
  activityType: string
}

const ITEM_HINTS: Record<string, { prompt: string; answer: string }> = {
  quiz: { prompt: 'Question', answer: 'Correct answer' },
  'match-up': { prompt: 'Left item', answer: 'Right match' },
  anagram: { prompt: 'Hint or definition', answer: 'Word to unscramble' },
  crossword: { prompt: 'Clue', answer: 'Answer word' },
  wordsearch: { prompt: 'Clue (optional)', answer: 'Word to find' },
  'spin-wheel': { prompt: 'Label', answer: 'Label (same)' },
  'balloon-pop': { prompt: 'Question', answer: 'Correct answer' },
  'whack-a-mole': { prompt: 'Question', answer: 'Correct answer' },
  'true-false': { prompt: 'Statement', answer: 'true or false' },
  categorize: { prompt: 'Item label', answer: 'Category name' },
  order: { prompt: 'Item (in correct order)', answer: 'Position (auto)' },
  'fill-blank': { prompt: 'Sentence with ___ blank', answer: 'Missing word' },
  'labelled-diagram': { prompt: 'Label name', answer: 'Label name (same)' },
  flashcards: { prompt: 'Front of card', answer: 'Back of card' },
  'missing-word': { prompt: 'Sentence (word can be included)', answer: 'Missing word' },
  unjumble: { prompt: 'Context hint (optional)', answer: 'Correct sentence' },
  'gameshow-quiz': { prompt: 'Question', answer: 'Correct answer' },
  hangman: { prompt: 'Hint or category', answer: 'Word to guess' },
  'random-wheel': { prompt: 'Name or topic', answer: 'Name or topic' },
  'open-box': { prompt: 'Box label', answer: 'Hidden content' },
}

const fieldStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius)',
  border: '2px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  outline: 'none',
  minWidth: 0,
}

function emptyItem(): ActivityItem {
  return { prompt: '', answer: '', hint: '', imageUrl: '' }
}

export default function ItemEditor({ items, onChange, activityType }: ItemEditorProps) {
  const hints = ITEM_HINTS[activityType] ?? { prompt: 'Prompt', answer: 'Answer' }
  const dragIdx = useRef<number | null>(null)

  function add() {
    onChange([...items, emptyItem()])
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  function update(idx: number, field: keyof ActivityItem, value: string) {
    const next = items.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    onChange(next)
  }

  function dragStart(idx: number) { dragIdx.current = idx }
  function dragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === idx) return
    const next = [...items]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(idx, 0, moved)
    dragIdx.current = idx
    onChange(next)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div>
          <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: 0 }}>
            Add Items
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
            {items.length} item{items.length !== 1 ? 's' : ''} · drag to reorder
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={add}
          aria-label="Add item"
          style={{
            padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
            border: 'none', background: 'var(--gradient-btn)',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.875rem',
            cursor: 'pointer', boxShadow: 'var(--shadow)', flexShrink: 0,
          }}
        >
          + Add Item
        </motion.button>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 1fr 32px', gap: '0.4rem', marginBottom: '0.35rem', padding: '0 0.25rem' }}>
        <span />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>
          {hints.prompt}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>
          {hints.answer}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>
          Hint (opt.)
        </span>
        <span />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflowY: 'auto', paddingRight: '0.25rem' }}>
        <AnimatePresence initial={false}>
          {items.map((item, idx) => (
            <motion.div
              key={idx}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.18 }}
              draggable
              onDragStart={() => dragStart(idx)}
              onDragOver={(e) => dragOver(e, idx)}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr 1fr 1fr 32px',
                gap: '0.4rem',
                alignItems: 'center',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                padding: '0.4rem 0.5rem',
              }}
            >
              {/* Drag handle */}
              <span
                aria-hidden="true"
                style={{ color: 'var(--color-text-muted)', cursor: 'grab', fontSize: '1rem', textAlign: 'center', userSelect: 'none' }}
              >
                ⠿
              </span>

              {/* Prompt */}
              <input
                type="text"
                value={item.prompt}
                onChange={(e) => update(idx, 'prompt', e.target.value)}
                placeholder={hints.prompt}
                aria-label={`Item ${idx + 1} ${hints.prompt}`}
                style={fieldStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
              />

              {/* Answer */}
              <input
                type="text"
                value={item.answer}
                onChange={(e) => update(idx, 'answer', e.target.value)}
                placeholder={hints.answer}
                aria-label={`Item ${idx + 1} ${hints.answer}`}
                style={fieldStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
              />

              {/* Hint */}
              <input
                type="text"
                value={item.hint ?? ''}
                onChange={(e) => update(idx, 'hint', e.target.value)}
                placeholder="Optional hint…"
                aria-label={`Item ${idx + 1} hint`}
                style={fieldStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
              />

              {/* Remove */}
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => remove(idx)}
                disabled={items.length <= 1}
                aria-label={`Remove item ${idx + 1}`}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  border: '2px solid var(--color-danger)',
                  background: 'transparent', color: 'var(--color-danger)',
                  cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', fontWeight: 700,
                  opacity: items.length <= 1 ? 0.3 : 1,
                  flexShrink: 0,
                }}
              >
                ×
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {items.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '2rem',
          color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)',
          border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
          marginTop: '0.5rem',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
          Click "Add Item" to get started
        </div>
      )}

      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => onChange([...items, emptyItem(), emptyItem(), emptyItem()])}
          style={{
            padding: '0.4rem 0.875rem', borderRadius: 'var(--radius)',
            border: '2px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          + Add 3 at once
        </motion.button>
      </div>
    </div>
  )
}
