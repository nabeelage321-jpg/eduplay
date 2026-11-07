'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// GAME NUMBER (batch 1, final list 11–14, 2026-11-07): Dashboard
// "My saved games" — the numbers this signed-in user saved, with a
// play link and a remove button each. Before migration 011 the
// route answers setupReady:false and this section says plainly that
// game numbers are not set up yet — never an empty list pretending
// the user saved nothing.
interface SavedGame {
  id: string
  title: string
  type: string | null
  subject: string | null
  grade: string | null
  is_public: boolean | null
  game_number: number
}

export default function SavedGamesSection({ locale }: { locale: string }) {
  const [saved, setSaved] = useState<SavedGame[] | null>(null)
  const [notSetup, setNotSetup] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/saved-games')
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setLoadError(true)
          return
        }
        if (data.setupReady === false) setNotSetup(true)
        setSaved((data.saved ?? []) as SavedGame[])
      } catch {
        if (!cancelled) setLoadError(true)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  async function remove(gameNumber: number) {
    setRemoving(gameNumber)
    try {
      const res = await fetch('/api/saved-games', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameNumber }),
      })
      if (res.ok) {
        setSaved((prev) => (prev ?? []).filter((g) => g.game_number !== gameNumber))
      }
    } finally {
      setRemoving(null)
    }
  }

  if (loadError) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Your saved games could not be loaded.</p>
  }
  if (saved === null) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Loading saved games…</p>
  }
  if (notSetup) {
    return (
      <p style={{ color: 'var(--color-text-muted)' }}>
        Game numbers are not set up yet. The team is still setting this up —
        once they are, games you save by number will appear here.
      </p>
    )
  }
  if (saved.length === 0) {
    return (
      <p style={{ color: 'var(--color-text-muted)' }}>
        No saved game numbers yet. Find a game by its number and save it — it will appear here.
      </p>
    )
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
      {saved.map((game) => (
        <li
          key={game.game_number}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <Link
              href={`/${locale}/activity/${game.id}/play`}
              style={{ fontWeight: 700, textDecoration: 'none', color: 'var(--color-primary)' }}
            >
              {game.title}
            </Link>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
              🔢 Game No. {game.game_number}
              {[game.type, game.subject, game.grade].filter(Boolean).length > 0
                ? ` · ${[game.type, game.subject, game.grade].filter(Boolean).join(' · ')}`
                : ''}
              {game.is_public === false ? ' · Private' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void remove(game.game_number)}
            disabled={removing === game.game_number}
            style={{
              padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text-primary)', cursor: 'pointer', flexShrink: 0,
            }}
          >
            {removing === game.game_number ? 'Removing…' : 'Remove'}
          </button>
        </li>
      ))}
    </ul>
  )
}
