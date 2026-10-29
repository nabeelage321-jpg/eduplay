'use client'

/** Batch 1 role picker — local choice only. Auth is NOT rewritten here:
 *  NextAuth is incomplete in this repo and is a separate batch. The chosen
 *  role is stored in localStorage so the Create heading can follow it,
 *  and will be replaced by the signed-in profile role when auth lands. */
export const ROLE_STORAGE_KEY = 'eduplay-creator-role'
export const ROLE_CHANGE_EVENT = 'eduplay-role-change'

export type CreatorRole = 'teacher' | 'student' | 'parent'

export const ROLE_OPTIONS: Array<{ value: CreatorRole; icon: string; label: string; copy: string }> = [
  { value: 'teacher', icon: '👩‍🏫', label: 'Teacher', copy: 'Create games for your students' },
  { value: 'student', icon: '🎓', label: 'Student', copy: 'Create games for your classmates' },
  { value: 'parent', icon: '👨‍👩‍👧', label: 'Parent-Creator', copy: 'Create games for your kids' },
]

export function roleCopy(role: CreatorRole): string {
  return ROLE_OPTIONS.find((o) => o.value === role)?.copy ?? ROLE_OPTIONS[0].copy
}

export function readStoredRole(): CreatorRole {
  if (typeof window === 'undefined') return 'teacher'
  const v = window.localStorage.getItem(ROLE_STORAGE_KEY)
  return v === 'student' || v === 'parent' ? v : 'teacher'
}

export function storeRole(role: CreatorRole) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ROLE_STORAGE_KEY, role)
  window.dispatchEvent(new CustomEvent(ROLE_CHANGE_EVENT, { detail: role }))
}

export default function RolePicker({ value, onChange }: { value: CreatorRole; onChange: (role: CreatorRole) => void }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <p style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        I am creating as…
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }} role="radiogroup" aria-label="Creator role">
        {ROLE_OPTIONS.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              style={{
                minHeight: '64px',
                padding: '0.75rem 0.5rem',
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: selected ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))' : 'var(--color-surface)',
                color: selected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              <span style={{ display: 'block', fontSize: '1.5rem', marginBottom: '0.25rem' }}>{opt.icon}</span>
              {opt.label}
            </button>
          )
        })}
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{roleCopy(value)}</p>
    </div>
  )
}
