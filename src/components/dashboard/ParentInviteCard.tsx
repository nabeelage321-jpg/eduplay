'use client'

import { useState } from 'react'
import { buildParentLink } from '@/lib/social-approval'

// ─── Parent invite card (Dashboard, kid creators only) ────────────────────
// The kid taps once; the server returns (or reuses) an invite code and
// this card shows the parent link to copy. The parent opens it while
// signed in and accepts it — from then on the parent sees the kid's
// games in their own Dashboard. No kid email or password is involved:
// the kid profile is name-only under the parent account.
export default function ParentInviteCard({ locale }: { locale: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleInvite() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/parent-links', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not create a parent invite.')
        return
      }
      setLink(buildParentLink(window.location.origin, locale, data.code))
    } catch {
      setError('Could not create a parent invite.')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem' }}>👨‍👩‍👧 Link a parent</h2>
      <p style={{ color: 'var(--color-text-muted)', margin: '0 0 0.75rem' }}>
        Send this link to your parent. Once they accept it, they can see your games,
        approve them (one of your 3 test approvals), and remove a game if it is not suitable.
        A parent&apos;s approval alone never publishes a game.
      </p>
      {!link ? (
        <button
          type="button"
          onClick={handleInvite}
          disabled={loading}
          className="btn-primary"
          style={{ padding: '0.5rem 1rem', cursor: loading ? 'wait' : 'pointer' }}
        >
          {loading ? 'Creating…' : 'Create parent invite link'}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={copyLink}
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', cursor: 'pointer' }}
          >
            {copied ? 'Link copied!' : 'Copy parent link'}
          </button>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.5rem 0 0', wordBreak: 'break-all' }}>
            {link}
          </p>
        </>
      )}
      {error ? <p style={{ color: 'var(--color-text-secondary)', margin: '0.5rem 0 0' }}>{error}</p> : null}
    </section>
  )
}
