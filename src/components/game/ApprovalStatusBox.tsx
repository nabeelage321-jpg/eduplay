'use client'

import { useEffect, useState } from 'react'
import {
  TEST_APPROVALS_REQUIRED,
  TESTERS_TO_INVITE,
  buildTestLink,
} from '@/lib/social-approval'

// ─── Approval status box on the game detail page ─────────────────────────
// Two audiences, one component, nothing for anyone else:
//  * The OWNER (proven via /api/my-activities, like HostLiveGame) of a
//    student-gated game: pending count + test link + tester nicknames,
//    the published state, or the removed state. Teachers/creators see
//    nothing here — their games need no test approval.
//  * A signed-in TEACHER/PARENT viewing a LIVE student-gated game:
//    a two-tap Remove button (server enforces the role; the UI never
//    decides). Removing takes the game private again.
// Everyone else sees nothing — never an error, never a leak.

interface TestStatus {
  setupReady: boolean
  approvalStatus: string | null
  isPublic: boolean
  approvalCount: number
  testers: string[]
  creatorIsStudent: boolean
}

export default function ApprovalStatusBox({ activityId, locale }: { activityId: string; locale: string }) {
  const [isOwner, setIsOwner] = useState<boolean | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [status, setStatus] = useState<TestStatus | null>(null)
  const [copied, setCopied] = useState(false)
  const [armed, setArmed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/my-activities')
      .then((res) => (res.ok ? res.json() : { activities: [] }))
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data.activities) ? data.activities : []
        setIsOwner(list.some((g: { id?: string }) => g.id === activityId))
      })
      .catch(() => {
        if (!cancelled) setIsOwner(false)
      })
    fetch('/api/session-role')
      .then((res) => (res.ok ? res.json() : { role: null }))
      .then((data) => {
        if (!cancelled) setRole(data.role ?? null)
      })
      .catch(() => {
        if (!cancelled) setRole(null)
      })
    fetch(`/api/activities/${activityId}/test-approve`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setStatus(data as TestStatus)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activityId])

  if (isOwner === null || !status || !status.setupReady || !status.creatorIsStudent) return null

  const testLink = typeof window !== 'undefined' ? buildTestLink(window.location.origin, locale, activityId) : ''

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(testLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function handleRemove() {
    if (!armed) {
      setArmed(true)
      return
    }
    setNotice(null)
    try {
      const res = await fetch(`/api/activities/${activityId}/remove`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNotice(data.error ?? 'Could not remove this game.')
        setArmed(false)
        return
      }
      setStatus((prev) => (prev ? { ...prev, isPublic: false, approvalStatus: 'rejected' } : prev))
      setNotice('Removed — this game is private again.')
      setArmed(false)
    } catch {
      setNotice('Could not remove this game.')
      setArmed(false)
    }
  }

  const boxStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem 1.25rem',
    marginTop: '1rem',
  }

  // Owner box (pending / published / removed).
  if (isOwner) {
    if (status.approvalStatus === 'approved' && status.isPublic) {
      return (
        <section style={boxStyle}>
          <p style={{ fontWeight: 700, margin: 0 }}>✅ Approved by {TEST_APPROVALS_REQUIRED} testers — now public!</p>
        </section>
      )
    }
    if (status.approvalStatus === 'rejected') {
      return (
        <section style={boxStyle}>
          <p style={{ fontWeight: 700, margin: 0 }}>Removed — edit this game to resubmit it for testing.</p>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 0' }}>
            A removed game is tested from scratch: earlier approvals do not carry over.
          </p>
        </section>
      )
    }
    if (status.approvalStatus === 'pending') {
      return (
        <section style={boxStyle}>
          <p style={{ fontWeight: 700, margin: 0 }}>
            🧪 Waiting for test approval — {status.approvalCount} of {TEST_APPROVALS_REQUIRED} approvals
          </p>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 0' }}>
            Send the test link to {TESTERS_TO_INVITE} friends. If {TEST_APPROVALS_REQUIRED} approve,
            your game goes public. Sharing only spreads the link — only approvals count.
          </p>
          {status.testers.length > 0 ? (
            <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 0' }}>
              Approved by: {status.testers.join(', ')}
            </p>
          ) : null}
          <button
            type="button"
            onClick={copyLink}
            style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', cursor: 'pointer' }}
          >
            {copied ? 'Link copied!' : 'Copy test link'}
          </button>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.5rem 0 0', wordBreak: 'break-all' }}>
            {testLink}
          </p>
        </section>
      )
    }
    return null
  }

  // Remover box: signed-in teacher/parent on a LIVE student-gated game.
  if ((role === 'teacher' || role === 'parent') && status.isPublic && status.approvalStatus === 'approved') {
    return (
      <section style={boxStyle}>
        <p style={{ fontWeight: 700, margin: 0 }}>Teacher / parent controls</p>
        <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 0' }}>
          If this game is not suitable, remove it from the public list. Its creator can edit it to resubmit it for testing.
        </p>
        <button
          type="button"
          onClick={handleRemove}
          style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: armed ? '#b91c1c' : 'var(--color-surface-alt)', color: armed ? '#fff' : 'inherit', cursor: 'pointer' }}
        >
          {armed ? 'Tap again to confirm removal' : 'Remove this game'}
        </button>
        {notice ? <p style={{ color: 'var(--color-text-secondary)', margin: '0.5rem 0 0' }}>{notice}</p> : null}
      </section>
    )
  }

  return null
}
