'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Parent invite acceptance (noindex page, signed-in parents only) ─────
// A parent opens the kid's invite link while signed in, taps Accept, and
// the kid's games appear in the parent's Dashboard. Accepting never
// approves a game — approval still goes through the test link, one
// approval at a time.
export default function ParentLinkAccept({ code, locale }: { code: string; locale: string }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function handleAccept() {
    setState('working')
    setMessage(null)
    try {
      const res = await fetch('/api/parent-links/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState('error')
        setMessage(data.error ?? 'This invite could not be accepted.')
        return
      }
      setState('done')
      setMessage(
        data.already
          ? `You are already linked to ${data.kidName}.`
          : `You are now linked to ${data.kidName}. Their games will show in your Dashboard.`,
      )
    } catch {
      setState('error')
      setMessage('This invite could not be accepted.')
    }
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>👨‍👩‍👧 Parent invite</h1>
      {!code ? (
        <p style={{ color: 'var(--color-text-muted)' }}>
          This link has no invite code. Ask your kid to send you their parent invite link again.
        </p>
      ) : state === 'done' ? (
        <>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{message}</p>
          <p style={{ marginTop: '1rem' }}>
            <Link href={`/${locale}/dashboard`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Go to Dashboard →
            </Link>
          </p>
        </>
      ) : (
        <>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Accepting links this kid&apos;s games to your Dashboard. You can approve them
            (one of 3 test approvals) and remove a live game if needed. Accepting alone
            never publishes a game.
          </p>
          <button
            type="button"
            onClick={handleAccept}
            disabled={state === 'working'}
            className="btn-primary"
            style={{ padding: '0.6rem 1.2rem', cursor: state === 'working' ? 'wait' : 'pointer' }}
          >
            {state === 'working' ? 'Accepting…' : 'Accept parent invite'}
          </button>
          {message ? <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.75rem' }}>{message}</p> : null}
        </>
      )}
    </div>
  )
}
