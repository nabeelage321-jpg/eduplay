'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cleanGameNumber } from '@/lib/game-number'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

interface FoundGame {
  id: string
  title: string
  type: string | null
  subject: string | null
  grade: string | null
  game_number: number | null
}

type Status = 'idle' | 'loading' | 'found' | 'not-found' | 'not-setup' | 'error'

// GAME NUMBER (batch 1, final list 11–14, 2026-11-07): the SPECIAL
// PLACE to enter a game number. Maker = Edit the original. Non-maker
// = Play, or "Make my own game" (remix — the original never changes).
// Everyone = play only. Signed-in users can save the number here.
export default function GameNumberClient({ locale, initialNumber }: { locale: string; initialNumber?: string }) {
  const router = useRouter()
  const [input, setInput] = useState(() => {
    const n = cleanGameNumber(initialNumber ?? null)
    return n === null ? '' : String(n)
  })
  const [status, setStatus] = useState<Status>('idle')
  const [game, setGame] = useState<FoundGame | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [remixing, setRemixing] = useState(false)
  const didAutoLookup = useRef(false)

  async function lookup(numberText: string) {
    const number = cleanGameNumber(numberText)
    if (number === null) {
      setStatus('idle')
      setMessage('Enter a game number (up to 6 digits).')
      setGame(null)
      return
    }
    setStatus('loading')
    setMessage(null)
    setGame(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/game-number?number=${number}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.setupReady === false) {
          setStatus('not-setup')
          setMessage(data.error ?? 'Game numbers are not set up yet.')
        } else if (res.status === 404) {
          setStatus('not-found')
          setMessage(data.error ?? 'No game with that number yet.')
        } else {
          setStatus('error')
          setMessage(data.error ?? 'Something went wrong. Try again.')
        }
        return
      }
      setGame(data.activity as FoundGame)
      setIsOwner(data.isOwner === true)
      setStatus('found')
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Check your connection and try again.')
    }
  }

  // The 40-games selection panel links here with ?number= — look it
  // up on arrival, once.
  useEffect(() => {
    if (didAutoLookup.current) return
    didAutoLookup.current = true
    if (cleanGameNumber(initialNumber ?? null) !== null) {
      void lookup(initialNumber ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveNumber() {
    if (!game?.game_number) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/saved-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameNumber: game.game_number }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setMessage('Sign in to save game numbers — you will find them in Dashboard "My saved games".')
        return
      }
      if (!res.ok) {
        setMessage(data.error ?? 'Could not save this number. Try again.')
        return
      }
      setSaved(true)
      setMessage(data.alreadySaved ? 'This number is already in your saved games.' : 'Saved! Find it later in Dashboard "My saved games".')
    } catch {
      setMessage('Something went wrong. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function remix() {
    if (!game) return
    setRemixing(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/activities/${game.id}/remix`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setMessage('Sign in to make your own game from this one.')
        return
      }
      if (!res.ok) {
        setMessage(data.error ?? 'Could not make your own game. Try again.')
        return
      }
      // Your own copy is made — open it in the editor so you can
      // change it into yours.
      router.push(`/${locale}/create?edit=${data.activity.id}`)
    } catch {
      setMessage('Something went wrong. Check your connection and try again.')
    } finally {
      setRemixing(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontFamily: FUNKY_FONT, fontSize: '1.75rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
        🔢 Find a game by number
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
        A teacher or parent gave you a game number? Type it here and the game opens.
        If it is your game you can edit it — if it is someone else&apos;s, you can play it
        or make your own game from it.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); void lookup(input) }}
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
      >
        <label htmlFor="game-number-input" className="sr-only">Game number</label>
        <input
          id="game-number-input"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 100123"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
          style={{
            flex: 1, minHeight: '56px', padding: '0.75rem 1rem', fontSize: '1.25rem',
            fontFamily: FUNKY_FONT, borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            minHeight: '56px', padding: '0.75rem 1.5rem', border: 'none',
            borderRadius: 'var(--radius-lg)', background: 'var(--gradient-btn)',
            color: '#fff', fontFamily: FUNKY_FONT, fontSize: '1.1rem', cursor: 'pointer',
            opacity: status === 'loading' ? 0.6 : 1,
          }}
        >
          {status === 'loading' ? 'Finding…' : 'Find game'}
        </button>
      </form>

      {message ? (
        <p role="status" style={{
          padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
          background: status === 'found' || saved
            ? 'color-mix(in srgb, var(--color-success) 15%, var(--color-surface))'
            : 'color-mix(in srgb, var(--color-warning) 15%, var(--color-surface))',
          border: `2px solid ${status === 'found' || saved ? 'var(--color-success)' : 'var(--color-warning)'}`,
          color: 'var(--color-text-primary)', marginBottom: '1rem',
        }}>
          {message}
        </p>
      ) : null}

      {status === 'found' && game ? (
        <div style={{
          background: 'var(--color-surface)', border: '2px solid var(--color-primary)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-card)',
        }}>
          <p style={{
            display: 'inline-block', padding: '0.25rem 0.85rem', borderRadius: '9999px',
            background: 'linear-gradient(135deg, #ff6b9d, #a855f7 50%, #3b82f6)',
            color: '#fff', fontFamily: FUNKY_FONT, fontWeight: 800, fontSize: '1rem',
            marginBottom: '0.75rem',
          }}>
            🔢 Game No. {game.game_number}
          </p>
          <h2 style={{ fontFamily: FUNKY_FONT, fontSize: '1.5rem', color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>
            {game.title}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            {[game.type, game.subject, game.grade].filter(Boolean).join(' · ')}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href={`/${locale}/activity/${game.id}/play`}
              style={{
                padding: '0.75rem 1.5rem', background: 'var(--gradient-btn)', color: '#fff',
                borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: 700,
              }}
            >
              ▶ Play
            </Link>
            {isOwner ? (
              <Link
                href={`/${locale}/create?edit=${game.id}`}
                style={{
                  padding: '0.75rem 1.25rem', background: 'var(--color-surface-alt)',
                  color: 'var(--color-primary)', borderRadius: 'var(--radius)',
                  textDecoration: 'none', fontWeight: 600, border: '2px solid var(--color-primary)',
                }}
              >
                ✏️ Edit my game
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void remix()}
                disabled={remixing}
                style={{
                  padding: '0.75rem 1.25rem', background: 'var(--color-surface-alt)',
                  color: 'var(--color-primary)', borderRadius: 'var(--radius)',
                  fontWeight: 600, border: '2px solid var(--color-primary)', cursor: 'pointer',
                  opacity: remixing ? 0.6 : 1,
                }}
              >
                {remixing ? 'Making your game…' : '🔀 Make my own game from this'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void saveNumber()}
              disabled={saving || saved}
              style={{
                padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)',
                border: '2px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text-primary)', fontWeight: 600, cursor: 'pointer',
                opacity: saving || saved ? 0.6 : 1,
              }}
            >
              {saved ? '💾 Saved ✓' : saving ? 'Saving…' : '💾 Save this number'}
            </button>
          </div>
          {!isOwner ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '1rem', marginBottom: 0 }}>
              Making your own game copies this game into a new one that is yours to change.
              The original game is never changed.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
