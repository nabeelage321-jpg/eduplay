'use client'

import { useEffect, useState } from 'react'
import {
  buildChallengeUrl,
  cleanChallengePin,
  isValidChallengePin,
  makeChallengePin,
} from '@/lib/challenges'
import { cleanGroupName } from '@/lib/guests'

/**
 * CHALLENGE MAKER v1 — sits on the saved-game detail page, under the
 * one-click host area. It renders ONLY for the signed-in teacher who
 * owns this game (same /api/my-activities ownership check the host
 * button uses); everyone else sees nothing, never an error.
 *
 * What it does: builds a shareable challenge LINK carrying the game,
 * a PIN, an optional group name, and a deadline. Copy it, or send it
 * via WhatsApp (real wa.me link, same pattern as the host share).
 *
 * What it does NOT do, stated on screen too: it does NOT store the
 * challenge on the server (no column, no migration, no API call in
 * this batch). A guest who opens the link can only actually join once
 * the teacher has started a live session with this PIN using Host
 * live game above — until then the challenge view honestly shows
 * "No results yet" and the join page reports the room as not found,
 * exactly as it does for any code with no live session. Results, when
 * they exist, come only from that live session's leaderboard.
 * Server-persistent challenges are phase 2, not this batch.
 */
interface ChallengeMakerProps {
  activityId: string
  locale: string
  activityTitle: string
}

export default function ChallengeMaker({ activityId, locale, activityTitle }: ChallengeMakerProps) {
  const [isOwner, setIsOwner] = useState<boolean | null>(null)
  const [pin, setPin] = useState('')
  const [group, setGroup] = useState('')
  const [deadline, setDeadline] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
    return () => {
      cancelled = true
    }
  }, [activityId])

  if (!isOwner) return null

  function createLink() {
    const cleanPin = cleanChallengePin(pin)
    if (!isValidChallengePin(cleanPin)) {
      setError('Enter a 6-letter PIN in the room-code format (for example, use Generate PIN).')
      setLink(null)
      return
    }
    if (!deadline) {
      setError('Pick a deadline date and time for this challenge.')
      setLink(null)
      return
    }
    const deadlineMs = new Date(deadline).getTime()
    if (Number.isNaN(deadlineMs)) {
      setError('That deadline could not be read. Pick a date and time again.')
      setLink(null)
      return
    }
    if (deadlineMs <= Date.now()) {
      setError('The deadline must be in the future.')
      setLink(null)
      return
    }
    setError(null)
    setLink(
      buildChallengeUrl(window.location.origin, locale, {
        gameId: activityId,
        pin: cleanPin,
        group: cleanGroupName(group) || null,
        deadline: new Date(deadlineMs).toISOString(),
      }),
    )
  }

  async function copyLink() {
    if (!link) return
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        const area = document.createElement('textarea')
        area.value = link
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        document.body.removeChild(area)
      }
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const shareText = link
    ? `Take my EduPlay challenge "${activityTitle}"! Challenge PIN: ${cleanChallengePin(pin)}. Beat the deadline: ${link}`
    : ''

  return (
    <section
      aria-label="Set a challenge"
      style={{
        padding: '1rem 1.25rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-card)',
        marginBottom: '1.5rem',
      }}
    >
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>🏆 Set a challenge</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
        Give this game a PIN, an optional group, and a deadline — then share the challenge link.
        Guests join with the PIN and their results come from the live session.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: 600 }}>
          Challenge PIN
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.toUpperCase())}
            placeholder="e.g. K7Q2XA"
            maxLength={6}
            aria-label="Challenge PIN"
            style={{ minHeight: '44px', padding: '0 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
          />
        </label>
        <button
          type="button"
          onClick={() => setPin(makeChallengePin())}
          style={{ alignSelf: 'flex-end', minHeight: '44px', padding: '0 1rem', borderRadius: '9999px', border: '1px solid var(--color-border)', background: 'var(--color-surface-alt)', fontWeight: 700 }}
        >
          Generate PIN
        </button>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: 600 }}>
          Group (optional)
          <input
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="e.g. Class 5A"
            maxLength={50}
            aria-label="Challenge group (optional)"
            style={{ minHeight: '44px', padding: '0 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: 600 }}>
          Deadline
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label="Challenge deadline"
            style={{ minHeight: '44px', padding: '0 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={createLink}
        style={{ marginTop: '1rem', minHeight: '48px', padding: '0 1.5rem', borderRadius: '9999px', background: 'var(--color-primary)', color: 'white', fontWeight: 800 }}
      >
        Make challenge link →
      </button>
      {error ? (
        <p role="alert" style={{ color: '#b91c1c', fontWeight: 600, marginTop: '0.75rem' }}>
          {error}
        </p>
      ) : null}
      {link ? (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ wordBreak: 'break-all', background: 'var(--color-surface-alt)', padding: '0.75rem', borderRadius: '0.5rem' }}>
            {link}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={copyLink}
              style={{ minHeight: '44px', padding: '0 1rem', borderRadius: '9999px', border: '1px solid var(--color-border)', fontWeight: 700 }}
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 1rem', borderRadius: '9999px', background: '#25D366', color: 'white', fontWeight: 700, textDecoration: 'none' }}
            >
              Share on WhatsApp
            </a>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.75rem' }}>
            Link only, in this version: this challenge is not stored on the server. Start a live
            session with this PIN (Host live game above) before guests join, or the join page will
            report the room as not found — and results appear only once that session exists.
            Server-persistent challenges come in phase 2.
          </p>
        </div>
      ) : null}
    </section>
  )
}
