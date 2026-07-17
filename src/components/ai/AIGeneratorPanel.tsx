'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { ActivityItem } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIGeneratorPanelProps {
  isOpen: boolean
  onClose: () => void
  onItemsGenerated: (items: ActivityItem[]) => void
  locale: string
}

interface UsageData {
  todayCount: number
  dailyLimit: number | null
  remaining: number | null
  isPremium: boolean
}

const ACTIVITY_TYPES = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'match-up', label: 'Match Up' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'true-false', label: 'True / False' },
  { value: 'fill-blank', label: 'Fill in the Blank' },
  { value: 'anagram', label: 'Anagram' },
  { value: 'wordsearch', label: 'Word Search' },
  { value: 'hangman', label: 'Hangman' },
  { value: 'categorize', label: 'Categorize' },
  { value: 'missing-word', label: 'Missing Word' },
  { value: 'unjumble', label: 'Unjumble' },
  { value: 'order', label: 'Order' },
]

const GRADES = [
  'Pre-K', 'KG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
  'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
]

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو' },
  { value: 'ar', label: 'العربية' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIGeneratorPanel({
  isOpen,
  onClose,
  onItemsGenerated,
  locale,
}: AIGeneratorPanelProps) {
  const t = useTranslations('ai')

  const [topic, setTopic] = useState('')
  const [activityType, setActivityType] = useState('quiz')
  const [itemCount, setItemCount] = useState(10)
  const [selectedLocale, setSelectedLocale] = useState(locale)
  const [grade, setGrade] = useState('Grade 3')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [generatedItems, setGeneratedItems] = useState<ActivityItem[] | null>(null)
  const [streamText, setStreamText] = useState('')

  // Fetch usage on panel open
  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/usage')
      if (res.ok) {
        const data = await res.json() as UsageData
        setUsage(data)
      }
    } catch {
      // non-critical
    }
  }, [])

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic')
      return
    }
    setError(null)
    setGeneratedItems(null)
    setIsGenerating(true)
    setStreamText('Thinking...')

    // Fake streaming text for UX
    const streamPhrases = [
      'Thinking...', 'Crafting questions...', 'Adding hints...', 'Almost ready...'
    ]
    let phraseIdx = 0
    const streamInterval = setInterval(() => {
      phraseIdx = (phraseIdx + 1) % streamPhrases.length
      setStreamText(streamPhrases[phraseIdx])
    }, 800)

    try {
      const res = await fetch('/api/ai/generate-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          activityType,
          itemCount,
          locale: selectedLocale,
          grade,
        }),
      })

      const data = await res.json() as {
        items?: ActivityItem[]
        error?: string
        code?: string
        dailyLimit?: number
        todayCount?: number
      }

      if (!res.ok) {
        if (data.code === 'LIMIT_REACHED') {
          setError(t('limitReached', { limit: data.dailyLimit ?? 10 }))
        } else {
          setError(data.error ?? 'Generation failed')
        }
        return
      }

      setGeneratedItems(data.items ?? [])
      void fetchUsage()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      clearInterval(streamInterval)
      setStreamText('')
      setIsGenerating(false)
    }
  }

  const handleAddAll = () => {
    if (generatedItems) {
      onItemsGenerated(generatedItems)
      setGeneratedItems(null)
      setTopic('')
      onClose()
    }
  }

  const isAtLimit =
    !usage?.isPremium && usage?.remaining !== null && (usage?.remaining ?? 0) <= 0

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 40,
            }}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            role="dialog"
            aria-label={t('panelTitle')}
            aria-modal="true"
            style={{
              position: 'fixed',
              insetBlockStart: 0,
              insetInlineEnd: 0,
              height: '100dvh',
              width: 'min(420px, 100vw)',
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-card)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBlockEnd: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--gradient-hero)',
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    margin: 0,
                  }}
                >
                  ✨ {t('generateWithAI')}
                </h2>
                {usage && !usage.isPremium && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      margin: '0.25rem 0 0',
                    }}
                  >
                    {t('usageCount', {
                      n: usage.todayCount,
                      limit: usage.dailyLimit ?? 10,
                    })}
                  </p>
                )}
                {usage?.isPremium && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-success)', margin: '0.25rem 0 0' }}>
                    ∞ {t('unlimited')}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close AI panel"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  color: 'var(--color-text-muted)',
                  padding: '0.25rem',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: '1.5rem', flex: 1 }}>
              {isAtLimit ? (
                <UpgradePrompt t={t} />
              ) : (
                <>
                  {/* Topic */}
                  <label style={labelStyle} htmlFor="ai-topic">
                    {t('topicLabel')}
                  </label>
                  <textarea
                    id="ai-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t('topicPlaceholder')}
                    maxLength={200}
                    rows={2}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      fontFamily: 'var(--font-body)',
                    }}
                  />

                  {/* Activity type */}
                  <label style={labelStyle} htmlFor="ai-type">
                    Activity Type
                  </label>
                  <select
                    id="ai-type"
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    style={inputStyle}
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>

                  {/* Grade */}
                  <label style={labelStyle} htmlFor="ai-grade">
                    Grade
                  </label>
                  <select
                    id="ai-grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    style={inputStyle}
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>

                  {/* Language */}
                  <label style={labelStyle} htmlFor="ai-locale">
                    Language
                  </label>
                  <select
                    id="ai-locale"
                    value={selectedLocale}
                    onChange={(e) => setSelectedLocale(e.target.value)}
                    style={inputStyle}
                  >
                    {LOCALES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>

                  {/* Item count slider */}
                  <label style={labelStyle} htmlFor="ai-count">
                    Number of items: <strong style={{ color: 'var(--color-primary)' }}>{itemCount}</strong>
                  </label>
                  <input
                    id="ai-count"
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={itemCount}
                    onChange={(e) => setItemCount(Number(e.target.value))}
                    aria-label={`Number of items: ${itemCount}`}
                    style={{ width: '100%', accentColor: 'var(--color-primary)', marginBlockEnd: '1.5rem' }}
                  />

                  {/* Error */}
                  {error && (
                    <p
                      role="alert"
                      style={{
                        color: 'var(--color-danger)',
                        fontSize: '0.875rem',
                        marginBlockEnd: '1rem',
                        padding: '0.75rem',
                        background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {error}
                    </p>
                  )}

                  {/* Generate button */}
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic.trim()}
                    aria-busy={isGenerating}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      background: isGenerating || !topic.trim()
                        ? 'var(--color-border)'
                        : 'var(--gradient-btn)',
                      color: isGenerating || !topic.trim()
                        ? 'var(--color-text-muted)'
                        : '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius)',
                      fontFamily: 'var(--font-display)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: isGenerating || !topic.trim() ? 'not-allowed' : 'pointer',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {isGenerating ? (
                      <span aria-live="polite">
                        <span aria-hidden="true">⚡ </span>
                        {streamText}
                      </span>
                    ) : (
                      '✨ Generate Activity'
                    )}
                  </button>

                  {/* Disclaimer */}
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginBlockStart: '0.75rem',
                      textAlign: 'center',
                    }}
                  >
                    ⚠️ {t('disclaimer')}
                  </p>

                  {/* Generated items preview */}
                  {generatedItems && generatedItems.length > 0 && (
                    <div style={{ marginBlockStart: '1.5rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBlockEnd: '0.75rem',
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            margin: 0,
                          }}
                        >
                          {generatedItems.length} items generated
                        </h3>
                        <button
                          onClick={handleAddAll}
                          style={{
                            background: 'var(--color-success)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.4rem 0.875rem',
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Add All →
                        </button>
                      </div>

                      {generatedItems.slice(0, 3).map((item, i) => (
                        <div
                          key={i}
                          style={{
                            background: 'var(--color-surface-alt)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.75rem',
                            marginBlockEnd: '0.5rem',
                            fontSize: '0.8rem',
                          }}
                        >
                          <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 600 }}>
                            {item.prompt}
                          </p>
                          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-muted)' }}>
                            → {item.answer}
                          </p>
                        </div>
                      ))}
                      {generatedItems.length > 3 && (
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-muted)',
                            textAlign: 'center',
                          }}
                        >
                          + {generatedItems.length - 3} more items
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UpgradePrompt({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2rem 1rem',
      }}
    >
      <p style={{ fontSize: '3rem', marginBlockEnd: '1rem' }}>🔒</p>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.1rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBlockEnd: '0.5rem',
        }}
      >
        Daily limit reached
      </h3>
      <p
        style={{
          color: 'var(--color-text-muted)',
          fontSize: '0.875rem',
          marginBlockEnd: '1.5rem',
        }}
      >
        {t('upgradePrompt')}
      </p>
      <a
        href="/pricing"
        style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          background: 'var(--gradient-btn)',
          color: '#fff',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          textDecoration: 'none',
          fontSize: '0.95rem',
        }}
      >
        Upgrade to Premium ✨
      </a>
      <p
        style={{
          marginBlockStart: '1rem',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
        }}
      >
        Limit resets at midnight
      </p>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBlockEnd: '0.35rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.75rem',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-background)',
  color: 'var(--color-text-primary)',
  fontSize: '0.9rem',
  marginBlockEnd: '1rem',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-body)',
}
