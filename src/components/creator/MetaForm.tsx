'use client'

import { motion } from 'framer-motion'

export interface ActivityMeta {
  title: string
  description: string
  subject: string
  grade: string
  locale: string
  curriculum: string
  tags: string
}

interface MetaFormProps {
  meta: ActivityMeta
  onChange: (meta: ActivityMeta) => void
}

const SUBJECTS = [
  'Mathematics', 'English', 'Science', 'Urdu', 'Social Studies',
  'History', 'Geography', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'Islamic Studies', 'Art', 'Music', 'Physical Education',
]

const GRADES = [
  'Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3',
  'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
  'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
]

const LOCALES = [
  { code: 'en', name: 'English' }, { code: 'ur', name: 'اردو (Urdu)' },
  { code: 'ar', name: 'العربية (Arabic)' }, { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'es', name: 'Español' }, { code: 'fr', name: 'Français' },
]

const CURRICULA = [
  'Pakistan (Federal Board)', 'Pakistan (Punjab Board)', 'Pakistan (KPK Board)',
  'Cambridge IGCSE', 'Oxford AQA', 'IB (International Baccalaureate)',
  'Common Core (USA)', 'National Curriculum (UK)', 'Other',
]

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: 'var(--radius)',
  border: '2px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-display)',
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: '0.35rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export default function MetaForm({ meta, onChange }: MetaFormProps) {
  function set(key: keyof ActivityMeta, value: string) {
    onChange({ ...meta, [key]: value })
  }

  return (
    <div>
      <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', marginBottom: '0.25rem', fontSize: '1.25rem' }}>
        Activity Details
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        Tell us about your activity
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Title */}
        <div>
          <label htmlFor="meta-title" style={labelStyle}>Title *</label>
          <input
            id="meta-title"
            type="text"
            value={meta.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Capitals of the World"
            required
            maxLength={120}
            aria-required="true"
            style={fieldStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
          />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>{meta.title.length}/120</span>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="meta-desc" style={labelStyle}>Description</label>
          <textarea
            id="meta-desc"
            value={meta.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Brief description of this activity…"
            maxLength={300}
            rows={2}
            style={{ ...fieldStyle, resize: 'vertical', minHeight: '64px' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
          />
        </div>

        {/* Subject + Grade */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="meta-subject" style={labelStyle}>Subject *</label>
            <select
              id="meta-subject"
              value={meta.subject}
              onChange={(e) => set('subject', e.target.value)}
              required
              style={fieldStyle}
            >
              <option value="">Select subject…</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="meta-grade" style={labelStyle}>Grade *</label>
            <select
              id="meta-grade"
              value={meta.grade}
              onChange={(e) => set('grade', e.target.value)}
              required
              style={fieldStyle}
            >
              <option value="">Select grade…</option>
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {/* Language + Curriculum */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label htmlFor="meta-locale" style={labelStyle}>Language *</label>
            <select
              id="meta-locale"
              value={meta.locale}
              onChange={(e) => set('locale', e.target.value)}
              style={fieldStyle}
            >
              {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="meta-curriculum" style={labelStyle}>Curriculum</label>
            <select
              id="meta-curriculum"
              value={meta.curriculum}
              onChange={(e) => set('curriculum', e.target.value)}
              style={fieldStyle}
            >
              <option value="">Select curriculum…</option>
              {CURRICULA.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="meta-tags" style={labelStyle}>Tags</label>
          <input
            id="meta-tags"
            type="text"
            value={meta.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="e.g. geography, capitals, world (comma-separated)"
            style={fieldStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
          />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>Separate tags with commas</span>
        </div>
      </div>
    </div>
  )
}
