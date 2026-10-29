'use client'

import { useState, useEffect } from 'react'
import { ROLE_STORAGE_KEY, ROLE_CHANGE_EVENT, roleCopy, type CreatorRole } from './RolePicker'

/**
 * Batch 1 — role-aware Create heading. Reads the role chosen in the
 * Create flow (localStorage, see RolePicker); defaults to Teacher.
 * This is a display-only interim: real auth/profile roles are a
 * separate batch and will replace this localStorage read.
 */
export default function CreatePageHeader() {
  const [role, setRole] = useState<CreatorRole>('teacher')

  useEffect(() => {
    const read = () => {
      const v = window.localStorage.getItem(ROLE_STORAGE_KEY)
      setRole(v === 'student' || v === 'parent' ? v : 'teacher')
    }
    read()
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail === 'student' || detail === 'parent' || detail === 'teacher') setRole(detail)
      else read()
    }
    window.addEventListener(ROLE_CHANGE_EVENT, onCustom)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener(ROLE_CHANGE_EVENT, onCustom)
      window.removeEventListener('storage', read)
    }
  }, [])

  const heading =
    role === 'parent'
      ? '✨ Create a Game for Your Kids'
      : role === 'student'
        ? '✨ Create a Game for Your Classmates'
        : '✨ Create Activity'

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '1rem',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
          marginBottom: '0.2rem',
        }}
      >
        {heading}
      </h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        {roleCopy(role)} — build an interactive learning experience in minutes
      </p>
    </div>
  )
}
