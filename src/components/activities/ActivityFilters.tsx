'use client'

import { motion } from 'framer-motion'
import { ACTIVITY_TYPE_META } from '@/components/creator/TypeSelector'

export interface FilterState {
  subject: string
  grade: string
  type: string
  locale: string
  search: string
  sort: 'newest' | 'popular' | 'az'
}

interface ActivityFiltersProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  resultCount?: number
}

const SUBJECTS = [
  '', 'Mathematics', 'English', 'Science', 'Urdu', 'Social Studies',
  'History', 'Geography', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
]

const GRADES = [
  '', 'Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
  'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
]

const LOCALES = [
  { code: '', name: 'All Languages' }, { code: 'en', name: 'English' },
  { code: 'ur', name: 'Urdu' }, { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' }, { code: 'es', name: 'Spanish' },
]

const selectStyle: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  borderRadius: 'var(--radius)',
  border: '2px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.85rem',
  outline: 'none',
  cursor: 'pointer',
}

export default function ActivityFilters({ filters, onChange, resultCount }: ActivityFiltersProps) {
  function set(key: keyof FilterState, value: string) {
    onChange({ ...filters, [key]: value })
  }

  const hasFilters = filters.subject || filters.grade || filters.type || filters.locale || filters.search

  return (
    <div>
      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '0.875rem' }}>
        <span style={{
          position: 'absolute', insetInlineStart: '0.875rem', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none',
        }}>
          🔍
        </span>
        <input
          type="search"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="Search activities…"
          aria-label="Search activities"
          style={{
            width: '100%',
            padding: '0.6rem 1rem 0.6rem 2.5rem',
            borderRadius: 'var(--radius)',
            border: '2px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
        />
      </div>

      {/* Filter row */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
        alignItems: 'center', marginBottom: '0.75rem',
      }}>
        <select value={filters.subject} onChange={(e) => set('subject', e.target.value)}
          aria-label="Filter by subject" style={selectStyle}>
          <option value="">All Subjects</option>
          {SUBJECTS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filters.grade} onChange={(e) => set('grade', e.target.value)}
          aria-label="Filter by grade" style={selectStyle}>
          <option value="">All Grades</option>
          {GRADES.filter(Boolean).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select value={filters.type} onChange={(e) => set('type', e.target.value)}
          aria-label="Filter by activity type" style={selectStyle}>
          <option value="">All Types</option>
          {ACTIVITY_TYPE_META.map((t) => <option key={t.slug} value={t.slug}>{t.icon} {t.name}</option>)}
        </select>

        <select value={filters.locale} onChange={(e) => set('locale', e.target.value)}
          aria-label="Filter by language" style={selectStyle}>
          {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>

        <select value={filters.sort} onChange={(e) => set('sort', e.target.value as FilterState['sort'])}
          aria-label="Sort activities" style={selectStyle}>
          <option value="newest">Newest</option>
          <option value="popular">Most Played</option>
          <option value="az">A–Z</option>
        </select>

        {hasFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => onChange({ subject: '', grade: '', type: '', locale: '', search: '', sort: 'newest' })}
            aria-label="Clear all filters"
            style={{
              padding: '0.45rem 0.75rem', borderRadius: 'var(--radius)',
              border: '2px solid var(--color-danger)', background: 'var(--color-surface)',
              color: 'var(--color-danger)', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            ✕ Clear
          </motion.button>
        )}
      </div>

      {/* Result count */}
      {resultCount !== undefined && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
          {resultCount} {resultCount === 1 ? 'activity' : 'activities'} found
        </p>
      )}
    </div>
  )
}
