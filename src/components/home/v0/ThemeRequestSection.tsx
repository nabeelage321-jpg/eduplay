'use client'

import { useEffect, useState } from 'react'
import { THEME_REQUEST_THRESHOLD, type AggregatedThemeRequest } from '@/lib/theme-requests'

// THEME REQUESTS (2026-11-07, build-list final 6, item 9). Sits below
// the 15 kids worlds, for SIGNED-IN users only — signed-out visitors
// see nothing of it. A user asks the EduPlay TEAM for a theme:
// "What theme do you want to add? Please message us." The request
// goes to the team only — never user-to-user chat (no user-to-user
// messaging exists on this platform). Identical requests aggregate
// into a count; a theme is flagged once it reaches 100 requests.
// The flag is only a flag: the team adds the theme in a later step.
// Before migration 009 runs, the API answers setupReady:false and
// this section says so plainly instead of faking a saved request.

interface RequestsResponse {
  requests?: AggregatedThemeRequest[]
  setupReady?: boolean
}

export default function ThemeRequestSection() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [requests, setRequests] = useState<AggregatedThemeRequest[]>([])
  const [setupReady, setSetupReady] = useState(true)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/session-role')
      .then((res) => (res.ok ? res.json() : { signedIn: false }))
      .then((data: { signedIn?: boolean }) => {
        if (!cancelled) setSignedIn(data.signedIn === true)
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function loadRequests() {
    try {
      const res = await fetch('/api/theme-requests')
      if (!res.ok) return
      const data = (await res.json()) as RequestsResponse
      setRequests(Array.isArray(data.requests) ? data.requests : [])
      setSetupReady(data.setupReady !== false)
    } catch {
      // A failed load leaves the previous list (or the empty state);
      // the form still reports its own result on submit.
    }
  }

  useEffect(() => {
    if (signedIn) loadRequests()
  }, [signedIn])

  // Signed-out visitors see nothing of this section.
  if (signedIn !== true) return null

  async function submit() {
    const themeName = name.trim()
    if (themeName.length < 1) {
      setNote('Tell us the theme name first.')
      return
    }
    setSending(true)
    setNote(null)
    try {
      const res = await fetch('/api/theme-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeName, message: message.trim() || undefined }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; alreadyRequested?: boolean }
      if (!res.ok) {
        setNote(data.error ?? 'Your request could not be saved. Try again.')
        return
      }
      if (data.alreadyRequested) {
        setNote(`You already asked for "${themeName}" — your request is counted once.`)
      } else {
        setNote(`Thanks — your request for "${themeName}" was sent to the EduPlay team.`)
        setName('')
        setMessage('')
      }
      await loadRequests()
    } catch {
      setNote('Your request could not be saved. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ marginTop: '2rem', borderRadius: '1.5rem', border: '2px dashed var(--color-primary)', background: 'var(--color-surface)', padding: '1.25rem' }}>
      <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        What theme do you want to add? Please message us.
      </h4>
      <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)' }}>
        Tell the EduPlay team which theme is missing. When 100 people ask for the same theme, we add it.
      </p>
      {!setupReady ? (
        <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
          Theme requests are not set up yet — check back soon.
        </p>
      ) : (
        <>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Theme name
              <input
                type="text"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Underwater Adventure"
                aria-label="Theme name"
                style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.6rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              />
            </label>
            <label style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Message for the team <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span>
              <input
                type="text"
                value={message}
                maxLength={500}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What should it look like?"
                aria-label="Message for the team"
                style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.6rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              />
            </label>
            <div>
              <button
                type="button"
                onClick={submit}
                disabled={sending}
                style={{ minHeight: '48px', borderRadius: '9999px', border: 'none', background: 'var(--color-primary)', padding: '0 1.5rem', fontSize: '1rem', fontWeight: 800, color: 'white', cursor: sending ? 'wait' : 'pointer' }}
              >
                {sending ? 'Sending…' : 'Send my theme request'}
              </button>
            </div>
            {note ? <p role="status" style={{ color: 'var(--color-text-primary)' }}>{note}</p> : null}
          </div>
          {requests.length > 0 ? (
            <div style={{ marginTop: '1.5rem' }}>
              <h5 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Most requested themes</h5>
              <ul style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', padding: 0 }}>
                {requests.slice(0, 10).map((r) => (
                  <li key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                    <strong>{r.name}</strong>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {r.count} {r.count === 1 ? 'request' : 'requests'}
                    </span>
                    {r.ready ? (
                      <span style={{ borderRadius: '9999px', background: 'var(--color-primary)', padding: '0.125rem 0.625rem', fontSize: '0.875rem', fontWeight: 800, color: 'white' }}>
                        Ready to add — {THEME_REQUEST_THRESHOLD} requests reached
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
