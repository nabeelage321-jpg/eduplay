'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DraftEditor } from './PromptToGame'
import { PENDING_PROMPT_DRAFT_KEY, type PromptDraft } from '@/lib/prompt-to-game'
import type { ActivityItem, SupportedLocale } from '@/types'

const boxStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '2px solid var(--color-primary)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.25rem',
  boxShadow: 'var(--shadow-card)',
  marginBottom: '1.5rem',
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 0.875rem',
  borderRadius: 'var(--radius)',
  border: '2px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '1rem',
  boxSizing: 'border-box',
}

interface VideoInfo {
  title: string
  author: string
  url: string
}

/**
 * VIDEO-TO-GAME v1 (owner order 2026-11-07): a creator pastes the
 * link of THEIR OWN public YouTube video and gets an editable Quiz
 * draft about it. The video is link-only — it is never downloaded,
 * stored, or re-uploaded — and the game links back to it.
 *
 * Reuses the prompt-to-game machinery end to end: the draft is the
 * same PromptDraft shape, the same DraftEditor reviews it, and
 * approving hands it to /create through the same sessionStorage key
 * ActivityCreator reads once on mount. Nothing is saved or
 * published here — /create still shows Preview first, and the game
 * stays private until the creator saves it.
 */
export default function VideoToGameClient({ locale }: { locale: SupportedLocale }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<PromptDraft | null>(null)
  const [video, setVideo] = useState<VideoInfo | null>(null)
  const [approved, setApproved] = useState(false)

  async function makeDraft() {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setApproved(false)
    setDraft(null)
    setVideo(null)
    try {
      const res = await fetch('/api/video-to-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: url.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not make a draft')
      setDraft(data.draft as PromptDraft)
      if (data.video) setVideo(data.video as VideoInfo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not make a draft')
    } finally {
      setLoading(false)
    }
  }

  function approve() {
    if (!draft) return
    const items = draft.items.filter((i: ActivityItem) => i.prompt.trim() && i.answer.trim())
    if (items.length < 2) {
      setError('Keep at least 2 complete questions to approve this draft.')
      return
    }
    // Same handoff as the prompt page: the approved draft goes to
    // /create through the PENDING-DRAFT key, which ActivityCreator
    // reads once on mount. Nothing is saved here.
    try {
      window.sessionStorage.setItem(
        PENDING_PROMPT_DRAFT_KEY,
        JSON.stringify({ ...draft, items })
      )
    } catch {
      router.push(`/${locale}/create?type=${draft.type}`)
      return
    }
    setApproved(true)
    router.push(`/${locale}/create`)
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>
        🎬 Make a Game from Your Video
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: '0 0 0.25rem' }}>
        Paste the link of your own public YouTube video — AI reads it and makes an editable Quiz draft about what it teaches.
      </p>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: '0 0 1.25rem' }}>
        Only your own videos. The video is never downloaded or re-uploaded — your game links back to it. Approving a draft only opens it in the creator. Nothing is published until you save it yourself.
      </p>

      <div style={boxStyle}>
        <label htmlFor="video-url-input" style={{ display: 'block', fontWeight: 700, marginBottom: '0.35rem' }}>
          Your YouTube video link
        </label>
        <input
          id="video-url-input"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          style={{ ...fieldStyle, marginBottom: '0.75rem' }}
        />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
          Public videos up to about 15 minutes. Private or unlisted videos do not work.
        </p>
        <button
          type="button"
          onClick={makeDraft}
          disabled={loading || !url.trim()}
          className="eduplay-primary-action"
          style={{
            width: '100%', border: 'none', borderRadius: 'var(--radius)',
            background: loading || !url.trim() ? 'var(--color-text-muted)' : 'var(--gradient-btn)',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem',
            cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Reading your video…' : '🎬 Make game from this video'}
        </button>

        {error && (
          <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
            ⚠️ {error}
          </p>
        )}
        {approved && (
          <p role="status" style={{ color: 'var(--color-success)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
            ✅ Draft approved — the page has moved to the creator. Check it there, then save it. It stays private until you choose to make it public.
          </p>
        )}
      </div>

      {draft && (
        <div style={{ marginTop: '1.25rem' }}>
          {video && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
              🎬 Made from:{' '}
              <a href={video.url} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
                {video.title}
              </a>
              {video.author ? ` by ${video.author}` : ''}
            </p>
          )}
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', margin: '0 0 0.25rem' }}>
            Draft: {draft.title}
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
            Edit anything below. Approving only fills the creator — it does not publish.
          </p>
          <DraftEditor draft={draft} onChange={setDraft} />
          <button
            type="button"
            onClick={approve}
            className="eduplay-primary-action"
            style={{
              width: '100%', marginTop: '1rem', border: 'none', borderRadius: 'var(--radius)',
              background: 'var(--gradient-btn)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            ✅ Approve this draft
          </button>
        </div>
      )}

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
        Want to build by hand instead?{' '}
        <Link href={`/${locale}/create`} style={{ color: 'var(--color-primary)' }}>
          Open the full creator →
        </Link>
      </p>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
        Just want to play?{' '}
        <Link href={`/${locale}/play-games`} style={{ color: 'var(--color-primary)' }}>
          Pick a game and play →
        </Link>
      </p>
    </div>
  )
}
