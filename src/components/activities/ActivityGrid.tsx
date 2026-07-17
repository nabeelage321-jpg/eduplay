'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import ActivityCard from './ActivityCard'
import type { Activity } from '@/types'

interface ActivityGridProps {
  activities: Activity[]
  locale: string
  loading?: boolean
  emptyMessage?: string
  currentUserId?: string
  onPrint?: (activity: Activity) => void
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow)',
    }}>
      {/* Header skeleton */}
      <div style={{
        height: '72px',
        background: 'var(--color-surface-alt)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[60, 50, 40].map((w) => (
            <div key={w} style={{
              height: '20px', width: `${w}px`,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface-alt)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
        <div style={{
          height: '14px', width: '70%',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-surface-alt)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      </div>
      <div style={{
        height: '44px',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface-alt)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

const SKELETON_COUNT = 8

export default function ActivityGrid({
  activities, locale, loading = false,
  emptyMessage = 'No activities found',
  currentUserId, onPrint,
}: ActivityGridProps) {
  const router = useRouter()

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1rem',
  }

  if (loading) {
    return (
      <div style={gridStyle} aria-busy="true" aria-label="Loading activities">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '3rem 1rem',
        color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎮</div>
        <p style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
          {emptyMessage}
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => router.push(`/${locale}/create`)}
          style={{
            padding: '0.6rem 1.5rem', borderRadius: 'var(--radius)',
            border: 'none', background: 'var(--gradient-btn)',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.9rem',
            cursor: 'pointer', boxShadow: 'var(--shadow)', marginTop: '0.5rem',
          }}
        >
          + Create First Activity
        </motion.button>
      </div>
    )
  }

  return (
    <div style={gridStyle} role="list" aria-label="Activities">
      {activities.map((activity, i) => (
        <motion.div
          key={activity.id}
          role="listitem"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.2 }}
        >
          <ActivityCard
            activity={activity}
            locale={locale}
            isOwner={!!currentUserId && currentUserId === activity.teacher_id}
            onPlay={() => router.push(`/${locale}/activity/${activity.id}/play`)}
            onEdit={() => router.push(`/${locale}/activity/${activity.id}/edit`)}
            onPrint={() => onPrint?.(activity)}
          />
        </motion.div>
      ))}
    </div>
  )
}
