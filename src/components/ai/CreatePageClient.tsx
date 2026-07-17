'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import AIGeneratorPanel from '@/components/ai/AIGeneratorPanel'
import AIResultPreview from '@/components/ai/AIResultPreview'
import type { ActivityItem } from '@/types'

interface CreatePageClientProps {
  locale: string
}

type CreateMode = 'manual' | 'ai'

export default function CreatePageClient({ locale }: CreatePageClientProps) {
  const t = useTranslations('create')
  const tAi = useTranslations('ai')

  const [mode, setMode] = useState<CreateMode>('manual')
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [generatedItems, setGeneratedItems] = useState<ActivityItem[] | null>(null)
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  const [lastGenerationMeta, setLastGenerationMeta] = useState<{
    topic: string
    activityType: string
    grade: string
  } | null>(null)

  const handleItemsGenerated = (items: ActivityItem[]) => {
    setGeneratedItems(items)
    setIsPanelOpen(false)
  }

  const handleAddAllToActivity = (items: ActivityItem[]) => {
    setActivityItems((prev) => [...prev, ...items])
    setGeneratedItems(null)
  }

  const handleDiscardGenerated = () => {
    setGeneratedItems(null)
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--color-background)',
        paddingBlock: '2rem',
        paddingInline: 'clamp(1rem, 4vw, 2rem)',
      }}
    >
      {/* Page header */}
      <div style={{ maxWidth: '900px', marginInline: 'auto' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            marginBlockEnd: '0.5rem',
          }}
        >
          {t('title')}
        </h1>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '1rem',
            marginBlockEnd: '1.5rem',
          }}
        >
          {t('description')}
        </p>

        {/* Mode toggle */}
        <div
          role="group"
          aria-label="Creation mode"
          style={{
            display: 'inline-flex',
            background: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius)',
            padding: '0.25rem',
            gap: '0.25rem',
            marginBlockEnd: '2rem',
            border: '1px solid var(--color-border)',
          }}
        >
          <ModeButton
            active={mode === 'manual'}
            onClick={() => setMode('manual')}
            label={t('manualMode')}
            icon="✏️"
            ariaPressed={mode === 'manual'}
          />
          <ModeButton
            active={mode === 'ai'}
            onClick={() => setMode('ai')}
            label={tAi('generateWithAI')}
            icon="✨"
            ariaPressed={mode === 'ai'}
          />
        </div>

        <AnimatePresence mode="wait">
          {mode === 'manual' ? (
            <motion.div
              key="manual"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ManualCreator items={activityItems} onItemsChange={setActivityItems} />
            </motion.div>
          ) : (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <AICreatorSection
                locale={locale}
                generatedItems={generatedItems}
                lastMeta={lastGenerationMeta}
                activityItems={activityItems}
                onOpenPanel={() => setIsPanelOpen(true)}
                onAddAll={handleAddAllToActivity}
                onDiscard={handleDiscardGenerated}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Activity items summary (shared between modes) */}
        {activityItems.length > 0 && (
          <ActivitySummary items={activityItems} onClear={() => setActivityItems([])} />
        )}
      </div>

      {/* AI Generator Panel (slide-in) */}
      <AIGeneratorPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onItemsGenerated={(items) => {
          handleItemsGenerated(items)
          // Capture last meta for per-item regeneration
          setLastGenerationMeta({
            topic: 'last topic',
            activityType: 'quiz',
            grade: 'Grade 3',
          })
        }}
        locale={locale}
      />
    </main>
  )
}

// ─── ModeButton ───────────────────────────────────────────────────────────────

function ModeButton({
  active,
  onClick,
  label,
  icon,
  ariaPressed,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: string
  ariaPressed: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ariaPressed}
      style={{
        padding: '0.5rem 1.1rem',
        borderRadius: 'calc(var(--radius) - 2px)',
        border: 'none',
        background: active ? 'var(--color-primary)' : 'transparent',
        color: active ? '#fff' : 'var(--color-text-secondary)',
        fontFamily: 'var(--font-display)',
        fontSize: '0.875rem',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        transition: 'all 0.18s',
      }}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}

// ─── AICreatorSection ─────────────────────────────────────────────────────────

function AICreatorSection({
  locale,
  generatedItems,
  lastMeta,
  activityItems,
  onOpenPanel,
  onAddAll,
  onDiscard,
}: {
  locale: string
  generatedItems: ActivityItem[] | null
  lastMeta: { topic: string; activityType: string; grade: string } | null
  activityItems: ActivityItem[]
  onOpenPanel: () => void
  onAddAll: (items: ActivityItem[]) => void
  onDiscard: () => void
}) {
  const tAi = useTranslations('ai')

  if (generatedItems && lastMeta) {
    return (
      <AIResultPreview
        items={generatedItems}
        topic={lastMeta.topic}
        activityType={lastMeta.activityType}
        locale={locale}
        grade={lastMeta.grade}
        onAddAll={onAddAll}
        onClose={onDiscard}
      />
    )
  }

  return (
    <div
      style={{
        borderRadius: 'var(--radius)',
        border: '2px dashed var(--color-border)',
        padding: 'clamp(2rem, 6vw, 4rem)',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '3.5rem', marginBlockEnd: '1rem' }}>✨</p>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.3rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBlockEnd: '0.5rem',
        }}
      >
        {tAi('generateWithAI')}
      </h2>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.95rem',
          marginBlockEnd: '1.75rem',
          maxWidth: '400px',
          marginInline: 'auto',
        }}
      >
        {tAi('topicLabel')}
      </p>
      <button
        onClick={onOpenPanel}
        style={{
          padding: '0.875rem 2rem',
          background: 'var(--gradient-btn)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: 'var(--shadow)',
        }}
      >
        ✨ {tAi('generateWithAI')}
      </button>

      {activityItems.length > 0 && (
        <p
          style={{
            marginBlockStart: '1.25rem',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
          }}
        >
          {activityItems.length} items already added. Generate more to combine.
        </p>
      )}
    </div>
  )
}

// ─── ManualCreator ────────────────────────────────────────────────────────────

function ManualCreator({
  items,
  onItemsChange,
}: {
  items: ActivityItem[]
  onItemsChange: (items: ActivityItem[]) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState('')

  const handleAdd = () => {
    if (!prompt.trim() || !answer.trim()) return
    onItemsChange([...items, { prompt: prompt.trim(), answer: answer.trim() }])
    setPrompt('')
    setAnswer('')
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        padding: '1.5rem',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBlockEnd: '1rem',
        }}
      >
        Add Items Manually
      </h2>
      <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label
            htmlFor="manual-prompt"
            style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBlockEnd: '0.3rem' }}
          >
            Question / Prompt
          </label>
          <input
            id="manual-prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. What is 2 + 2?"
            style={fieldStyle}
          />
        </div>
        <div>
          <label
            htmlFor="manual-answer"
            style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBlockEnd: '0.3rem' }}
          >
            Answer
          </label>
          <input
            id="manual-answer"
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="e.g. 4"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            style={fieldStyle}
          />
        </div>
      </div>
      <button
        onClick={handleAdd}
        disabled={!prompt.trim() || !answer.trim()}
        style={{
          marginBlockStart: '0.75rem',
          padding: '0.6rem 1.25rem',
          background: !prompt.trim() || !answer.trim() ? 'var(--color-border)' : 'var(--color-primary)',
          color: !prompt.trim() || !answer.trim() ? 'var(--color-text-muted)' : '#fff',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font-display)',
          fontSize: '0.875rem',
          fontWeight: 700,
          cursor: !prompt.trim() || !answer.trim() ? 'not-allowed' : 'pointer',
        }}
      >
        + Add Item
      </button>
    </div>
  )
}

// ─── ActivitySummary ──────────────────────────────────────────────────────────

function ActivitySummary({
  items,
  onClear,
}: {
  items: ActivityItem[]
  onClear: () => void
}) {
  return (
    <div
      style={{
        marginBlockStart: '2rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        padding: '1.25rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBlockEnd: '1rem',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Activity Items ({items.length})
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onClear}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              color: 'var(--color-danger)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Clear All
          </button>
          <button
            style={{
              padding: '0.4rem 1rem',
              background: 'var(--gradient-btn)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
            }}
          >
            Save Activity →
          </button>
        </div>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.4rem' }}>
        {items.map((item, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              gap: '0.75rem',
              fontSize: '0.82rem',
              color: 'var(--color-text-secondary)',
              padding: '0.5rem 0.75rem',
              background: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <span style={{ color: 'var(--color-primary)', fontWeight: 700, flexShrink: 0 }}>
              {i + 1}.
            </span>
            <span style={{ flex: 1 }}>{item.prompt}</span>
            <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>→ {item.answer}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.75rem',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-background)',
  color: 'var(--color-text-primary)',
  fontSize: '0.875rem',
  fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
}
