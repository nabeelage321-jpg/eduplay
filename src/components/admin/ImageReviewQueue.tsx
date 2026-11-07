'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

// ─── Image review queue (client) ────────────────────────────────
// IMAGE REVIEW QUEUE (owner order 2026-11-07 13:19 PKT): the owner
// sees each pending picture with its game, who submitted it and
// when, then approves (picture goes into the game, visibility
// restored) or rejects it (picture dropped, game stays private).
// The approval record (who decided what and when) is kept by the
// API and shown under the decided tabs.

interface ApprovalRow {
  id: string
  activityId: string
  activityTitle: string
  activityType: string
  itemIndex: number | null
  imageUrl: string
  imageCredit: string
  status: string
  submittedBy: string
  submittedByName: string | null
  submittedAt: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
}

type Tab = 'pending' | 'approved' | 'rejected'

export default function ImageReviewQueue({ locale }: { locale: string }) {
  const [tab, setTab] = useState<Tab>('pending')
  const [rows, setRows] = useState<ApprovalRow[]>([])
  const [state, setState] = useState<'loading' | 'error' | 'denied' | 'not-setup' | 'done'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async (t: Tab) => {
    setState('loading')
    setError(null)
    try {
      const res = await fetch(`/api/image-approvals?status=${t}`)
      const data = (await res.json().catch(() => ({}))) as { approvals?: ApprovalRow[]; error?: string; setupReady?: boolean }
      if (res.status === 403) {
        setState('denied')
        return
      }
      if (res.status === 503 || data.setupReady === false) {
        setState('not-setup')
        return
      }
      if (!res.ok) throw new Error(data.error || 'Failed to load the queue')
      setRows(Array.isArray(data.approvals) ? data.approvals : [])
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the queue')
      setState('error')
    }
  }, [])

  useEffect(() => {
    load(tab)
  }, [tab, load])

  async function decide(id: string, action: 'approve' | 'reject') {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/image-approvals/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: notes[id] ?? '' }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || `Failed to ${action} the picture`)
      await load(tab)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusyId(null)
    }
  }

  if (state === 'denied') {
    return <p style={{ color: 'var(--color-text-muted)' }}>Only the EduPlay owner can review pictures.</p>
  }
  if (state === 'not-setup') {
    return (
      <p style={{ color: 'var(--color-text-muted)' }}>
        Image approval isn’t set up yet — run migration 012 in the Supabase SQL Editor first.
      </p>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['pending', 'approved', 'rejected'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            style={{
              padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
              border: tab === t ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
              background: tab === t ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))' : 'var(--color-surface)',
              color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)',
              fontSize: '0.875rem', cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {state === 'loading' ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : state === 'error' ? (
        <p role="alert" style={{ color: 'var(--color-danger)' }}>⚠️ {error}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>
          {tab === 'pending'
            ? 'No pictures waiting — nothing to review right now.'
            : `No ${tab} pictures yet.`}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {rows.map((row) => (
            <article
              key={row.id}
              style={{
                border: '2px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                background: 'var(--color-surface)', padding: '1rem',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.imageUrl}
                alt=""
                style={{ display: 'block', width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}
              />
              <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.1rem', margin: '0.75rem 0 0.25rem' }}>
                <Link href={`/${locale}/activity/${row.activityId}`} style={{ color: 'inherit' }}>
                  {row.activityTitle}
                </Link>
              </h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.25rem' }}>
                {row.activityType}
                {row.itemIndex !== null ? ` · question ${row.itemIndex + 1}` : ' · whole game'}
                {' · '}Submitted by {row.submittedByName ?? row.submittedBy}
                {' · '}
                {new Date(row.submittedAt).toLocaleDateString()}
              </p>
              {row.imageCredit ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                  🖼️ {row.imageCredit}
                </p>
              ) : null}
              {row.status !== 'pending' ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                  {row.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                  {row.reviewedBy ? ` by ${row.reviewedBy}` : ''}
                  {row.reviewedAt ? ` · ${new Date(row.reviewedAt).toLocaleDateString()}` : ''}
                  {row.reviewNote ? ` — “${row.reviewNote}”` : ''}
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    value={notes[row.id] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                    placeholder="Note to the teacher (optional)"
                    aria-label="Note to the teacher"
                    style={{
                      width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)',
                      border: '2px solid var(--color-border)', background: 'var(--color-surface)',
                      color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)',
                      fontSize: '0.875rem', outline: 'none', marginBottom: '0.5rem', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => decide(row.id, 'approve')}
                      disabled={busyId === row.id}
                      style={{
                        padding: '0.5rem 1.25rem', borderRadius: 'var(--radius)', border: 'none',
                        background: 'var(--color-success)', color: '#fff', fontFamily: 'var(--font-display)',
                        fontSize: '0.9rem', cursor: busyId === row.id ? 'not-allowed' : 'pointer',
                        opacity: busyId === row.id ? 0.6 : 1,
                      }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => decide(row.id, 'reject')}
                      disabled={busyId === row.id}
                      style={{
                        padding: '0.5rem 1.25rem', borderRadius: 'var(--radius)', border: 'none',
                        background: 'var(--color-danger)', color: '#fff', fontFamily: 'var(--font-display)',
                        fontSize: '0.9rem', cursor: busyId === row.id ? 'not-allowed' : 'pointer',
                        opacity: busyId === row.id ? 0.6 : 1,
                      }}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </>
              )}
              {error && busyId === row.id ? (
                <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
                  ⚠️ {error}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
