'use client'

import { motion } from 'framer-motion'

export { ACTIVITY_TYPE_META } from '@/lib/activity-type-meta'
import { ACTIVITY_TYPE_META } from '@/lib/activity-type-meta'

/**
 * SINGLE-GAME MAKER ENTRY (2026-11-04): a type hub page links to
 * /create?type=<slug> so a teacher can make one single game of that
 * type directly. Validate the query value against the known type list:
 * a valid slug is returned as-is, anything else (unknown slug, blank,
 * non-string) returns null and the creator simply opens with no type
 * preselected — never a crash, never an invented type.
 */
export function resolveInitialType(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null
  const slug = value.trim().toLowerCase()
  return ACTIVITY_TYPE_META.some((t) => t.slug === slug) ? slug : null
}

interface TypeSelectorProps {
  selected: string | null
  onSelect: (slug: string) => void
}

export default function TypeSelector({ selected, onSelect }: TypeSelectorProps) {
  return (
    <div>
      <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', marginBottom: '0.25rem', fontSize: '1.25rem' }}>
        Choose Activity Type
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        Select the type of activity you want to create
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '0.6rem',
      }}>
        {ACTIVITY_TYPE_META.map((type) => {
          const isSelected = selected === type.slug
          return (
            <motion.button
              key={type.slug}
              onClick={() => onSelect(type.slug)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              aria-pressed={isSelected}
              aria-label={`${type.name}: ${type.desc}`}
              style={{
                padding: '0.875rem 0.75rem',
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: isSelected ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))' : 'var(--color-surface)',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: isSelected ? 'var(--shadow-card)' : 'none',
                transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
              }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem', lineHeight: 1 }}>{type.icon}</div>
              <p style={{
                color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
                marginBottom: '0.2rem',
              }}>
                {type.name}
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.68rem', fontFamily: 'var(--font-body)', lineHeight: 1.3 }}>
                {type.desc}
              </p>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
