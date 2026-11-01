'use client'

import { useState } from 'react'

// PLACEHOLDER ONLY — the V0 ZIP contained no chatbot/mascot, and this
// batch invents no character, no name and no chat panel. This is a
// clearly-labelled button in an original star/book shape. Tapping it
// shows a short greeting and points to Browse/Create; it collects no
// data, opens no chat, and never pretends to be a human. A real mascot
// chatbot is a separate, owner-approved build.
export default function MascotButton() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'fixed', right: '1rem', bottom: '6.5rem', zIndex: 40 }} className="lg:bottom-6">
      {open && (
        <div
          role="status"
          style={{
            marginBottom: '0.75rem',
            maxWidth: '16rem',
            borderRadius: '1rem',
            border: '2px solid var(--color-border)',
            background: 'var(--color-surface)',
            padding: '1rem',
            boxShadow: '0 6px 0 0 var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          <p style={{ fontWeight: 800 }}>Hi! I&apos;m EduPlay&apos;s helper — coming soon.</p>
          <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)' }}>
            For now, try Browse Games or Start Creating. I don&apos;t collect any personal information.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="EduPlay helper (coming soon)"
        aria-expanded={open}
        title="EduPlay helper — coming soon"
        style={{
          display: 'flex',
          width: '64px',
          height: '64px',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '9999px',
          border: '2px solid var(--color-border)',
          background: 'var(--color-primary)',
          fontSize: '1.75rem',
          boxShadow: '0 4px 0 0 var(--color-primary-dark)',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true">⭐📚</span>
      </button>
    </div>
  )
}
