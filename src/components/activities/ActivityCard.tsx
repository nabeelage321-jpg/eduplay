'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Activity } from '@/types'
import { ACTIVITY_TYPE_META } from '@/components/creator/TypeSelector'

interface ActivityCardProps {
  activity: Activity
  locale: string
  onPlay?: () => void
  onEdit?: () => void
  onPrint?: () => void
  isOwner?: boolean
  compact?: boolean
}

export default function ActivityCard({
  activity, locale, onPlay, onEdit, onPrint, isOwner = false, compact = false,
}: ActivityCardProps) {
  const [copied, setCopied] = useState(false)
  const typeMeta = ACTIVITY_TYPE_META.find((t) => t.slug === activity.type_id)

  async function share() {
    const url = `${window.location.origin}/${locale}/activity/${activity.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: open share dialog
      if (navigator.share) navigator.share({ title: activity.title, url })
    }
  }

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: 'var(--shadow-card)' }}
      transition={{ duration: 0.15 }}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* Card header — colored band with type icon */}
      <div style={{
        background: 'var(--gradient-hero)',
        padding: compact ? '0.75rem' : '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
      }}>
        <span style={{ fontSize: compact ? '1.5rem' : '2rem' }}>{typeMeta?.icon ?? '🎮'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: compact ? '0.85rem' : '0.95rem',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {activity.title}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', margin: 0 }}>
            {typeMeta?.name ?? activity.type_id}
          </p>
        </div>
        {activity.is_public && (
          <span style={{
            background: 'rgba(255,255,255,0.2)', color: '#fff',
            fontSize: '0.65rem', padding: '0.15rem 0.4rem',
            borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)',
          }}>
            🌐
          </span>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: compact ? '0.6rem' : '0.875rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {/* Meta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {activity.subject_id && (
            <span style={{
              background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)',
              fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', fontFamily: 'var(--font-body)',
            }}>
              {activity.subject_id}
            </span>
          )}
          {activity.grade_id && (
            <span style={{
              background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)',
              fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', fontFamily: 'var(--font-body)',
            }}>
              {activity.grade_id}
            </span>
          )}
          {activity.locale && (
            <span style={{
              background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)',
              fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', fontFamily: 'var(--font-body)',
            }}>
              {activity.locale.toUpperCase()}
            </span>
          )}
        </div>

        {/* Stats */}
        {!compact && (
          <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
            <span>▶ {(activity.play_count ?? 0).toLocaleString()} plays</span>
            <span>♥ {(activity.like_count ?? 0).toLocaleString()}</span>
            <span>📝 {activity.items?.length ?? 0} items</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{
        padding: compact ? '0.5rem' : '0.6rem 0.875rem',
        borderTop: '1px solid var(--color-border)',
        display: 'flex', gap: '0.4rem',
      }}>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={onPlay}
          aria-label={`Play ${activity.title}`}
          style={{
            flex: 1, padding: '0.5rem',
            borderRadius: 'var(--radius)', border: 'none',
            background: 'var(--gradient-btn)', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '0.8rem',
            cursor: 'pointer', boxShadow: 'var(--shadow)',
          }}
        >
          ▶ Play
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={share}
          aria-label={`Share ${activity.title}`}
          title={copied ? 'Link copied!' : 'Share'}
          style={{
            padding: '0.5rem 0.6rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            background: copied ? 'var(--color-success)' : 'var(--color-surface)',
            color: copied ? '#fff' : 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)', fontSize: '0.85rem',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {copied ? '✓' : '🔗'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={onPrint}
          aria-label={`Print ${activity.title}`}
          title="Print worksheet"
          style={{
            padding: '0.5rem 0.6rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)', fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          🖨️
        </motion.button>

        {isOwner && (
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={onEdit}
            aria-label={`Edit ${activity.title}`}
            title="Edit activity"
            style={{
              padding: '0.5rem 0.6rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)', fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            ✏️
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
