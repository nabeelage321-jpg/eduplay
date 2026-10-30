'use client'

import { useState } from 'react'

// APPROVAL BATCH 2026-10-30. First-time role setup only: a signed-in user
// with NO recorded role picks teacher/student/parent once. After that the
// server rejects self-change (see /api/users/[id]/role), so a student
// cannot switch themselves to teacher to bypass the approval gate.
export default function RoleSetup() {
  const [role, setRole] = useState('student')
  const [message, setMessage] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save() {
    setMessage(null)
    const res = await fetch('/api/users/me/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(data.error ?? 'Could not save your role.')
      return
    }
    setSaved(true)
  }

  if (saved) {
    return (
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
        Role saved: {role}. Refresh this page to see it.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <label htmlFor="role-setup" style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>
        I am a:
      </label>
      <select
        id="role-setup"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        style={{ minHeight: '48px', padding: '0.5rem', borderRadius: 'var(--radius)', fontSize: '1rem' }}
      >
        <option value="student">Student (kid creator)</option>
        <option value="teacher">Teacher</option>
        <option value="parent">Parent</option>
      </select>
      <button
        type="button"
        onClick={save}
        style={{
          minHeight: '48px', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius)',
          border: 'none', background: 'var(--gradient-btn)', color: '#fff', cursor: 'pointer',
        }}
      >
        Save role
      </button>
      {message ? (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', width: '100%', margin: 0 }}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
