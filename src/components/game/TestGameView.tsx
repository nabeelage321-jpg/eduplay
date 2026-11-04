'use client'

import { useEffect, useState } from 'react'
import ActivityPlayer from '@/components/activity-types/ActivityPlayer'
import { adaptActivityItems } from '@/lib/activity-content'
import {
  TEST_APPROVALS_REQUIRED,
  TESTERS_TO_INVITE,
  TESTER_DEVICE_KEY,
  TESTER_NICKNAME_KEY,
  TESTER_NICKNAME_MAX,
  buildTestLink,
} from '@/lib/social-approval'
import type { Activity, SupportedLocale } from '@/types'

// ─── Test view for a pending kid game (kids social approval v1) ──────────
// A tester opens this page from the shareable test link (no account, no
// email, nickname only), plays the game, and taps Approve. One approval
// per device and per nickname, enforced by the server. At 3 approvals
// the game goes public automatically. Approval is NOT gated on finishing
// the game in v1 — the tester plays, then decides — and sharing the
// link never counts as an approval on its own.

interface TestStatus {
  setupReady: boolean
  message?: string
  approvalStatus: string | null
  isPublic: boolean
  approvalCount: number
  required: number
  testers: string[]
  creatorIsStudent: boolean
}

function getOrCreateDeviceKey(): string {
  try {
    const existing = window.localStorage.getItem(TESTER_DEVICE_KEY)
    if (existing && existing.trim().length > 0) return existing
    const created = `dev-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
    window.localStorage.setItem(TESTER_DEVICE_KEY, created)
    return created
  } catch {
    return `dev-${Math.random().toString(36).slice(2, 10)}`
  }
}

export default function TestGameView({ gameId, locale }: { gameId: string; locale: SupportedLocale }) {
  const [activity, setActivity] = useState<Activity | null>(null)
  const [status, setStatus] = useState<TestStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [approving, setApproving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    try {
      const last = window.localStorage.getItem(TESTER_NICKNAME_KEY)
      if (last) setNickname(last)
    } catch {
      // Private mode — nickname starts empty, as designed.
    }
    // SECURITY BATCH: content comes from the intentional test-game
    // path now, NOT the general route — the general route refuses
    // every non-public game to non-owners, which would break this
    // anonymous test flow. The test-game path serves pending kid
    // games (and already-public games) and refuses everything else.
    Promise.all([
      fetch(`/api/activities/${gameId}/test-game`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/activities/${gameId}/test-approve`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([gameJson, statusJson]) => {
        if (cancelled) return
        if (statusJson) setStatus(statusJson as TestStatus)
        if (!gameJson?.activity) {
          // A missing game fails BOTH fetches and shows the not-found
          // error. A game whose content is refused but whose status
          // loaded (removed, not gated, approved-but-private) renders
          // its status panel below instead of an error.
          if (!statusJson) {
            setError('This game was not found.')
          }
        } else {
          const row = gameJson.activity as Record<string, unknown>
          const items = adaptActivityItems(row as never)
          setActivity({
            ...(row as unknown as Activity),
            type_id: (row.type as string) ?? (row.type_id as string) ?? 'quiz',
            items,
          })
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError('This test page could not be loaded.')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [gameId])

  async function handleApprove() {
    const name = nickname.trim()
    if (!name) {
      setNotice('Type a nickname first — nicknames only, no account needed.')
      return
    }
    setApproving(true)
    setNotice(null)
    try {
      const res = await fetch(`/api/activities/${gameId}/test-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name, deviceKey: getOrCreateDeviceKey() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNotice(data.error ?? 'Approval could not be recorded.')
        return
      }
      try {
        window.localStorage.setItem(TESTER_NICKNAME_KEY, name)
      } catch {
        // Non-fatal.
      }
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              approvalCount: data.approvalCount ?? prev.approvalCount,
              testers: Array.isArray(data.testers) ? data.testers : prev.testers,
              isPublic: data.published ? true : prev.isPublic,
              approvalStatus: data.published ? 'approved' : prev.approvalStatus,
            }
          : prev,
      )
      setNotice(
        data.published
          ? 'Thank you — your approval made it 3, so this game is now public!'
          : `Thank you, ${name}! Your approval is counted.`,
      )
    } catch {
      setNotice('Approval could not be recorded. Try again.')
    } finally {
      setApproving(false)
    }
  }

  async function copyLink() {
    const link = buildTestLink(window.location.origin, locale, gameId)
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        Loading test game…
      </div>
    )
  }
  if (error) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{error ?? 'Game not found.'}</p>
      </div>
    )
  }

  const testLink = typeof window !== 'undefined' ? buildTestLink(window.location.origin, locale, gameId) : ''
  const isPublished = status?.isPublic === true && status?.approvalStatus === 'approved'
  const isRejected = status?.approvalStatus === 'rejected'
  const notGated = status?.setupReady === true && status?.creatorIsStudent === false

  // No content, but the status loaded: the game exists and its state
  // explains itself — removed, not gated, or approved-but-private
  // (a test link to a game that no longer needs testing). Render that
  // panel, not a not-found error. A genuinely missing game never
  // reaches here: it sets the error above.
  if (!activity) {
    return (
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Test game</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          You are testing a kid-made game. Play it, then approve it if it is good.
        </p>
        {status && !status.setupReady ? (
          <p style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            {status.message ?? 'Social approval is not set up yet.'}
          </p>
        ) : isRejected ? (
          <p style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            This game is not open for testing right now. Its creator can edit it to resubmit it.
          </p>
        ) : notGated ? (
          <p style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            This game does not need test approval — teachers, parents and creators publish directly.
          </p>
        ) : (
          <p style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            This game does not need test approval right now.
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{activity.title}</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
        You are testing a kid-made game. Play it, then approve it if it is good.
      </p>

      {status && !status.setupReady ? (
        <p style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
          {status.message ?? 'Social approval is not set up yet.'}
        </p>
      ) : isPublished ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 700, margin: 0 }}>✅ Approved by {TEST_APPROVALS_REQUIRED} testers — this game is now public!</p>
          <p style={{ margin: '0.5rem 0 0' }}>
            <a href={`/${locale}/activity/${gameId}/play`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Play it now</a>
            {' · '}
            <a href={`/${locale}/activity/${gameId}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Game page</a>
          </p>
        </div>
      ) : isRejected ? (
        <p style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
          This game is not open for testing right now. Its creator can edit it to resubmit it.
        </p>
      ) : notGated ? (
        <p style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
          This game does not need test approval — teachers, parents and creators publish directly.
        </p>
      ) : (
        <>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: 700, margin: 0 }}>
              🧪 {status?.approvalCount ?? 0} of {TEST_APPROVALS_REQUIRED} approvals
            </p>
            <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 0' }}>
              Send this game to {TESTERS_TO_INVITE} friends to test it — if {TEST_APPROVALS_REQUIRED} approve,
              it goes public. Sharing the link only spreads it; only approvals count.
            </p>
            {(status?.testers?.length ?? 0) > 0 ? (
              <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 0' }}>
                Approved by: {status?.testers.join(', ')}
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
          </div>

          <ActivityPlayer activity={activity} theme="kids" locale={locale} onComplete={() => {}} />

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '1rem', marginTop: '1.5rem' }}>
            <label htmlFor="tester-nickname" style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>
              Your nickname (only a nickname — no account, no email)
            </label>
            <input
              id="tester-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, TESTER_NICKNAME_MAX))}
              placeholder="E.g. Ayesha"
              maxLength={TESTER_NICKNAME_MAX}
              style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', marginBottom: '0.75rem' }}
            />
            <button
              type="button"
              onClick={handleApprove}
              disabled={approving}
              className="btn-primary"
              style={{ padding: '0.6rem 1.2rem', cursor: approving ? 'wait' : 'pointer' }}
            >
              {approving ? 'Recording…' : '👍 Approve this game'}
            </button>
            {notice ? <p style={{ color: 'var(--color-text-secondary)', margin: '0.75rem 0 0' }}>{notice}</p> : null}
          </div>
        </>
      )}
    </div>
  )
}
