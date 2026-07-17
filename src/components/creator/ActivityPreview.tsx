'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import ActivityPlayer from '@/components/activity-types/ActivityPlayer'
import type { Activity, Audience, SupportedLocale, ActivityItem } from '@/types'
import type { ActivityMeta } from './MetaForm'
import { ACTIVITY_TYPE_META } from './TypeSelector'

interface ActivityPreviewProps {
  typeSlug: string
  meta: ActivityMeta
  items: ActivityItem[]
}

export default function ActivityPreview({ typeSlug, meta, items }: ActivityPreviewProps) {
  const [previewKey, setPreviewKey] = useState(0)
  const [finalScore, setFinalScore] = useState<number | null>(null)

  const typeMeta = ACTIVITY_TYPE_META.find((t) => t.slug === typeSlug)

  const mockActivity: Activity = {
    id: 'preview',
    title: meta.title || 'Untitled Activity',
    description: meta.description,
    type_id: typeSlug,
    locale: (meta.locale as SupportedLocale) || 'en',
    teacher_id: '',
    subject_id: meta.subject,
    grade_id: meta.grade,
    curriculum_id: meta.curriculum,
    topic_id: '',
    items: items.filter((i) => i.prompt || i.answer),
    is_public: true,
    tags: meta.tags.split(',').map((t) => t.trim()).filter(Boolean),
    play_count: 0,
    like_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  function restart() {
    setFinalScore(null)
    setPreviewKey((k) => k + 1)
  }

  return (
    <div>
      <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', marginBottom: '0.25rem', fontSize: '1.25rem' }}>
        Preview Activity
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Try your activity before saving — this is exactly how students will see it
      </p>

      {/* Activity metadata summary */}
      <div style={{
        background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)',
        padding: '0.875rem 1rem', marginBottom: '1rem',
        display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center',
      }}>
        <span style={{ fontSize: '1.5rem' }}>{typeMeta?.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0 }}>
            {mockActivity.title}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>
            {typeMeta?.name} · {meta.subject || 'No subject'} · {meta.grade || 'No grade'} · {mockActivity.items?.length ?? 0} items
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={restart}
          aria-label="Restart preview"
          style={{
            padding: '0.4rem 0.875rem', borderRadius: 'var(--radius)',
            border: '2px solid var(--color-primary)', background: 'var(--color-surface)',
            color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          ↺ Restart
        </motion.button>
      </div>

      {(mockActivity.items?.length ?? 0) === 0 ? (
        <div style={{
          textAlign: 'center', padding: '2.5rem',
          border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
          color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          No items to preview. Go back and add some items first.
        </div>
      ) : finalScore !== null ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{
            textAlign: 'center', padding: '2rem',
            background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--color-success)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <h3 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Preview Complete!</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>Final score: {finalScore}</p>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={restart}
            style={{
              marginTop: '1rem', padding: '0.6rem 1.5rem', borderRadius: 'var(--radius)',
              border: 'none', background: 'var(--gradient-btn)',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.9rem',
              cursor: 'pointer', boxShadow: 'var(--shadow)',
            }}
          >
            ↺ Play Again
          </motion.button>
        </motion.div>
      ) : (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '1rem',
          boxShadow: 'var(--shadow-card)', minHeight: '320px',
        }}>
          <ActivityPlayer
            key={previewKey}
            activity={mockActivity}
            theme="ladies"
            locale={(meta.locale as SupportedLocale) || 'en'}
            onComplete={(score) => setFinalScore(score)}
          />
        </div>
      )}
    </div>
  )
}
