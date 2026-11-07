'use client'

import { useState } from 'react'
import type { OpenverseImage } from '@/lib/openverse'

// ─── Image picker (Openverse search-and-pick) ───────────────────
// IMAGE PICKER 2026-11-07 (owner 13:17 PKT): the teacher searches
// free CC-licensed pictures and picks ONE. Nothing is attached
// automatically — the pick goes back to the creator, and from there
// through the image-approval queue (migration 012) before the game
// can go public. A wrong picture must never come through the system:
// the picker shows the licence + creator under every result, and
// the stored credit line travels with the picture.

interface ImagePickerProps {
  /** Pre-filled search text — the game's topic or title. */
  defaultQuery: string
  /** Called with the picked picture's URL + credit line. Never auto-called. */
  onPick: (url: string, credit: string) => void
  onClose: () => void
}

export default function ImagePicker({ defaultQuery, onPick, onClose }: ImagePickerProps) {
  const [query, setQuery] = useState(defaultQuery)
  const [results, setResults] = useState<OpenverseImage[]>([])
  const [total, setTotal] = useState(0)
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')

  async function search(q: string) {
    const term = q.trim()
    if (term.length < 2) return
    setState('loading')
    try {
      const res = await fetch(`/api/images/search?q=${encodeURIComponent(term)}`)
      if (!res.ok) throw new Error('search failed')
      const data = (await res.json()) as { results?: OpenverseImage[]; total?: number }
      setResults(Array.isArray(data.results) ? data.results : [])
      setTotal(typeof data.total === 'number' ? data.total : 0)
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Search free pictures"
      style={{
        marginTop: '0.75rem', padding: '1rem',
        border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <h3 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1rem', margin: 0 }}>
          🔍 Search free pictures (Openverse)
        </h3>
        <button
          onClick={onClose}
          aria-label="Close picture search"
          style={{
            border: '2px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-primary)', borderRadius: '50%',
            width: '28px', height: '28px', cursor: 'pointer', fontSize: '1rem', fontWeight: 700,
          }}
        >
          ×
        </button>
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
        Free CC-licensed pictures only. You pick one — nothing is added automatically,
        and your pick goes to the owner for approval before the game can go public.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search(query)}
          placeholder="Search pictures — e.g. human heart"
          aria-label="Search pictures"
          style={{
            flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)',
            border: '2px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', outline: 'none', minWidth: 0,
          }}
        />
        <button
          onClick={() => search(query)}
          disabled={query.trim().length < 2 || state === 'loading'}
          style={{
            padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: 'none',
            background: 'var(--gradient-btn)', color: '#fff', fontFamily: 'var(--font-display)',
            fontSize: '0.875rem', cursor: query.trim().length < 2 || state === 'loading' ? 'not-allowed' : 'pointer',
            opacity: query.trim().length < 2 || state === 'loading' ? 0.5 : 1,
          }}
        >
          {state === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </div>

      {state === 'error' ? (
        <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem', margin: 0 }}>
          The picture search is unavailable right now. Try again in a moment — or paste a picture URL below instead.
        </p>
      ) : state === 'done' && results.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
          No pictures found for “{query}”. Try a different word — or paste a picture URL below instead.
        </p>
      ) : state === 'done' ? (
        <>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
            {total > 0 ? `${total} pictures found — showing ${results.length}. ` : ''}Tap one to use it.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => onPick(r.url, `${r.title} by ${r.creator} (${r.license}${r.licenseVersion ? ` ${r.licenseVersion}` : ''})`)}
                style={{
                  padding: 0, border: '2px solid var(--color-border)', borderRadius: 'var(--radius)',
                  background: 'var(--color-surface)', cursor: 'pointer', overflow: 'hidden', textAlign: 'left',
                }}
                aria-label={`Use picture: ${r.title}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.thumbnail} alt={r.title} loading="lazy" style={{ display: 'block', width: '100%', height: '90px', objectFit: 'cover' }} />
                <span style={{ display: 'block', padding: '0.35rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
                  {r.title}
                  <span style={{ display: 'block', color: 'var(--color-text-muted)' }}>
                    {r.creator} · {r.license}
                    {r.licenseVersion ? ` ${r.licenseVersion}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
