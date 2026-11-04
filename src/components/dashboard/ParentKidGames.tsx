'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TEST_APPROVALS_REQUIRED, TESTER_DEVICE_KEY, TESTER_NICKNAME_MAX } from '@/lib/social-approval'

// ─── Linked kids' games (Dashboard, parents only) ─────────────────────────
// A parent sees ONLY the games of kids linked to them, with each game's
// approval count. Approve here calls the same test-approve route every
// tester uses — a parent's approval counts as ONE of the 3, never a
// solo unlock. Remove takes a live game private again. Nickname for an
// approval is typed here (nicknames only, no account data is shown).
interface KidGame {
  id: string
  title: string
  type: string | null
  subject: string | null
  grade: string | null
  isPublic: boolean
  approvalStatus: string | null
  approvalCount: number
  kidName: string
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

export default function ParentKidGames({ locale }: { locale: string }) {
  const [games, setGames] = useState<KidGame[] | null>(null)
  const [setupReady, setSetupReady] = useState(true)
  const [nickname, setNickname] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/parent-links/games')
      .then((res) => (res.ok ? res.json() : { games: [] }))
      .then((data) => {
        if (cancelled) return
        setGames(Array.isArray(data.games) ? data.games : [])
        if (data.setupReady === false) setSetupReady(false)
      })
      .catch(() => {
        if (!cancelled) setGames([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function refresh() {
    const res = await fetch('/api/parent-links/games')
    const data = await res.json().catch(() => ({ games: [] }))
    if (Array.isArray(data.games)) setGames(data.games)
  }

  async function handleApprove(game: KidGame) {
    const name = nickname.trim()
    if (!name) {
      setNotice('Type a nickname first to approve.')
      return
    }
    setBusy(`approve:${game.id}`)
    setNotice(null)
    try {
      const res = await fetch(`/api/activities/${game.id}/test-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name, deviceKey: getOrCreateDeviceKey() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNotice(data.error ?? 'Approval could not be recorded.')
        return
      }
      setNotice(
        data.published
          ? `Thank you — your approval made it ${TEST_APPROVALS_REQUIRED}, so “${game.title}” is now public!`
          : `Thank you — your approval is counted for “${game.title}”.`,
      )
      await refresh()
    } catch {
      setNotice('Approval could not be recorded.')
    } finally {
      setBusy(null)
    }
  }

  async function handleRemove(game: KidGame) {
    setBusy(`remove:${game.id}`)
    setNotice(null)
    try {
      const res = await fetch(`/api/activities/${game.id}/remove`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNotice(data.error ?? 'Could not remove this game.')
        return
      }
      setNotice(`“${game.title}” is private again.`)
      await refresh()
    } catch {
      setNotice('Could not remove this game.')
    } finally {
      setBusy(null)
    }
  }

  if (games === null) return null
  if (!setupReady) {
    return (
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>My kids&apos; games</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Parent links are not set up yet (migration 008 has not been run).
        </p>
      </section>
    )
  }
  if (games.length === 0) {
    return (
      <section style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>My kids&apos; games</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          No kids linked yet. Ask your kid to send you their parent invite link, then open it while signed in.
        </p>
      </section>
    )
  }

  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>My kids&apos; games</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
        Your approval counts as one of the {TEST_APPROVALS_REQUIRED} test approvals — it never publishes
        a game on its own. Removing takes a live game private again.
      </p>
      <label htmlFor="parent-approve-nickname" style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>
        Your nickname for approvals
      </label>
      <input
        id="parent-approve-nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value.slice(0, TESTER_NICKNAME_MAX))}
        placeholder="E.g. Mama"
        maxLength={TESTER_NICKNAME_MAX}
        style={{ width: '100%', maxWidth: '320px', padding: '0.6rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', marginBottom: '1rem' }}
      />
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
        {games.map((game) => (
          <li
            key={game.id}
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}
          >
            <Link href={`/${locale}/activity/${game.id}`} style={{ fontWeight: 700, textDecoration: 'none', color: 'var(--color-primary)' }}>
              {game.title}
            </Link>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
              {game.kidName}
              {[game.type, game.subject, game.grade].filter(Boolean).join(' · ')}
              {game.isPublic ? ' · Public' : ' · Private'}
              {game.approvalStatus === 'pending' ? ` · ${game.approvalCount} of ${TEST_APPROVALS_REQUIRED} approvals` : ''}
              {game.approvalStatus === 'rejected' ? ' · Removed' : ''}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {game.approvalStatus === 'pending' ? (
                <button
                  type="button"
                  onClick={() => handleApprove(game)}
                  disabled={busy === `approve:${game.id}`}
                  className="btn-primary"
                  style={{ padding: '0.4rem 0.9rem', cursor: 'pointer' }}
                >
                  👍 Approve
                </button>
              ) : null}
              {game.isPublic ? (
                <button
                  type="button"
                  onClick={() => handleRemove(game)}
                  disabled={busy === `remove:${game.id}`}
                  style={{ padding: '0.4rem 0.9rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', cursor: 'pointer' }}
                >
                  Remove from public
                </button>
              ) : null}
              <Link href={`/${locale}/test/${game.id}`} style={{ padding: '0.4rem 0.9rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                Open test link
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {notice ? <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.75rem' }}>{notice}</p> : null}
    </section>
  )
}
