'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityItem } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIResultPreviewProps {
  items: ActivityItem[]
  topic: string
  activityType: string
  locale: string
  grade: string
  onAddAll: (items: ActivityItem[]) => void
  onClose: () => void
  difficulty?: 'easy' | 'medium' | 'hard'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIResultPreview({
  items: initialItems,
  topic,
  activityType,
  locale,
  grade,
  onAddAll,
  onClose,
  difficulty = 'medium',
}: AIResultPreviewProps) {
  const [items, setItems] = useState<ActivityItem[]>(initialItems)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editPrompt, setEditPrompt] = useState('')
  const [editAnswer, setEditAnswer] = useState('')
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)

  const handleDelete = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleStartEdit = (index: number) => {
    setEditingIndex(index)
    setEditPrompt(items[index].prompt)
    setEditAnswer(items[index].answer)
  }

  const handleSaveEdit = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, prompt: editPrompt.trim(), answer: editAnswer.trim() }
          : item
      )
    )
    setEditingIndex(null)
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
  }

  const handleRegenerateItem = async (index: number) => {
    setRegeneratingIndex(index)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          activityType,
          itemCount: 2,
          locale,
          grade,
          difficulty,
        }),
      })
      if (res.ok) {
        const data = await res.json() as { items: ActivityItem[] }
        if (data.items?.[0]) {
          setItems((prev) =>
            prev.map((item, i) => (i === index ? data.items[0] : item))
          )
        }
      }
    } catch {
      // silently fail — user still has original item
    } finally {
      setRegeneratingIndex(null)
    }
  }

  const handleAddAll = () => {
    onAddAll(items)
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem 1.25rem',
          background: 'var(--color-surface-alt)',
          borderBlockEnd: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            ✨ {items.length} items generated
          </h3>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              margin: '0.25rem 0 0',
            }}
          >
            Review, edit, or delete items before adding to your activity
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 0.875rem',
              background: 'none',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Discard
          </button>
          <button
            onClick={handleAddAll}
            disabled={items.length === 0}
            style={{
              padding: '0.5rem 0.875rem',
              background: items.length === 0 ? 'var(--color-border)' : 'var(--gradient-btn)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-display)',
            }}
          >
            Add All to Activity ({items.length})
          </button>
        </div>
      </div>

      {/* Items list */}
      <ul
        style={{ listStyle: 'none', margin: 0, padding: '0.75rem', maxHeight: '60vh', overflowY: 'auto' }}
        role="list"
        aria-label="Generated activity items"
      >
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <motion.li
              key={`${index}-${item.prompt.slice(0, 10)}`}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              transition={{ duration: 0.2 }}
              style={{ marginBlockEnd: '0.5rem' }}
            >
              {editingIndex === index ? (
                <EditForm
                  prompt={editPrompt}
                  answer={editAnswer}
                  onPromptChange={setEditPrompt}
                  onAnswerChange={setEditAnswer}
                  onSave={() => handleSaveEdit(index)}
                  onCancel={handleCancelEdit}
                />
              ) : (
                <ItemCard
                  item={item}
                  index={index}
                  isRegenerating={regeneratingIndex === index}
                  onEdit={() => handleStartEdit(index)}
                  onDelete={() => handleDelete(index)}
                  onRegenerate={() => handleRegenerateItem(index)}
                />
              )}
            </motion.li>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <li
            style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem',
            }}
          >
            All items deleted. Generate again or go back.
          </li>
        )}
      </ul>
    </div>
  )
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  index,
  isRegenerating,
  onEdit,
  onDelete,
  onRegenerate,
}: {
  item: ActivityItem
  index: number
  isRegenerating: boolean
  onEdit: () => void
  onDelete: () => void
  onRegenerate: () => void
}) {
  return (
    <div
      style={{
        background: 'var(--color-background)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}
    >
      {/* Number */}
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: '1.5rem',
          height: '1.5rem',
          background: 'var(--color-primary)',
          color: '#fff',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          fontWeight: 700,
        }}
      >
        {index + 1}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            wordBreak: 'break-word',
          }}
        >
          {item.prompt}
        </p>
        <p
          style={{
            margin: '0.25rem 0 0',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            wordBreak: 'break-word',
          }}
        >
          ✓ {item.answer}
        </p>
        {item.hint && (
          <p
            style={{
              margin: '0.2rem 0 0',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
            }}
          >
            💡 {item.hint}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
        <ActionButton
          onClick={onRegenerate}
          disabled={isRegenerating}
          label="Regenerate this item"
          title="↻"
          color="var(--color-primary)"
        />
        <ActionButton
          onClick={onEdit}
          label="Edit this item"
          title="✎"
          color="var(--color-warning)"
        />
        <ActionButton
          onClick={onDelete}
          label="Delete this item"
          title="✕"
          color="var(--color-danger)"
        />
      </div>
    </div>
  )
}

function ActionButton({
  onClick,
  disabled = false,
  label,
  title,
  color,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
  title: string
  color: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        background: 'none',
        border: 'none',
        padding: '0.25rem 0.375rem',
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--color-text-muted)' : color,
        fontSize: '0.9rem',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          ;(e.currentTarget as HTMLButtonElement).style.background =
            'color-mix(in srgb, ' + color + ' 15%, transparent)'
        }
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
      }}
    >
      {title}
    </button>
  )
}

// ─── EditForm ─────────────────────────────────────────────────────────────────

function EditForm({
  prompt,
  answer,
  onPromptChange,
  onAnswerChange,
  onSave,
  onCancel,
}: {
  prompt: string
  answer: string
  onPromptChange: (v: string) => void
  onAnswerChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div
      style={{
        background: 'var(--color-surface-alt)',
        border: '1.5px solid var(--color-primary)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.75rem',
      }}
    >
      <label
        htmlFor="edit-prompt"
        style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBlockEnd: '0.25rem' }}
      >
        Question / Prompt
      </label>
      <textarea
        id="edit-prompt"
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        rows={2}
        style={{
          width: '100%',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem',
          fontSize: '0.85rem',
          background: 'var(--color-background)',
          color: 'var(--color-text-primary)',
          resize: 'vertical',
          fontFamily: 'var(--font-body)',
          boxSizing: 'border-box',
          marginBlockEnd: '0.5rem',
        }}
      />
      <label
        htmlFor="edit-answer"
        style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBlockEnd: '0.25rem' }}
      >
        Answer
      </label>
      <input
        id="edit-answer"
        type="text"
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        style={{
          width: '100%',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.5rem',
          fontSize: '0.85rem',
          background: 'var(--color-background)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
          boxSizing: 'border-box',
          marginBlockEnd: '0.75rem',
        }}
      />
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '0.4rem 0.75rem',
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!prompt.trim() || !answer.trim()}
          style={{
            padding: '0.4rem 0.875rem',
            background: !prompt.trim() || !answer.trim() ? 'var(--color-border)' : 'var(--color-success)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#fff',
            cursor: !prompt.trim() || !answer.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-display)',
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}
