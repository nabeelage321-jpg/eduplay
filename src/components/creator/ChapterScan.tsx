'use client'

import { useRef, useState } from 'react'
import { PROMPT_GAME_TYPES, type PromptDraft, type PromptGameType } from '@/lib/prompt-to-game'
import { DraftEditor } from './PromptToGame'

const boxStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '2px solid var(--color-secondary)',
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

/**
 * Student chapter-scan → prompt-to-game.
 *
 * What actually works in this batch:
 * - Paste chapter text, or upload a .txt/.md file (read in the browser).
 * - The game is built from that chapter's own sentences — no invented facts.
 * What does NOT work yet, stated plainly in the UI:
 * - Photo/PDF text extraction (OCR) is not installed in this batch: no
 *   OCR library and no paid OCR key are used. A photo/PDF can be
 *   attached as a reference, but its text is NOT read — paste the
 *   chapter text or upload a .txt file instead.
 * Student games are private by default (see ActivityCreator approval
 * path) and are only shareable after the creator saves them; the share
 * link is the game's play page + ready caption, never a watermark and
 * never a child's name or photo.
 */
export default function ChapterScan({
  onApprove,
}: {
  onApprove: (draft: PromptDraft) => void
}) {
  const [chapterText, setChapterText] = useState('')
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState<PromptGameType>('quiz')
  const [fileName, setFileName] = useState('')
  const [photoNote, setPhotoNote] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<PromptDraft | null>(null)
  const [approved, setApproved] = useState(false)
  const textFileRef = useRef<HTMLInputElement>(null)
  const photoFileRef = useRef<HTMLInputElement>(null)

  function handleTextFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    setPhotoNote(false)
    const reader = new FileReader()
    reader.onload = () => setChapterText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  function handlePhotoFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    // Honest limit: no OCR in this batch, so the file's text is not read.
    setPhotoNote(true)
  }

  async function makeChapterGame() {
    if (chapterText.trim().length < 100) {
      setError('Add at least a few sentences of chapter text first (paste it, or upload a .txt file).')
      return
    }
    if (!prompt.trim()) {
      setError('Give your chapter game a prompt, for example “chapter three”.')
      return
    }
    setLoading(true)
    setError(null)
    setApproved(false)
    try {
      const res = await fetch('/api/prompt-to-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), type, chapterText }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not make a chapter game')
      setDraft(data.draft as PromptDraft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not make a chapter game')
    } finally {
      setLoading(false)
    }
  }

  function approve() {
    if (!draft) return
    const items = draft.items.filter((i) => i.prompt.trim() && i.answer.trim())
    if (items.length < 2) {
      setError('Keep at least 2 complete questions to approve this draft.')
      return
    }
    onApprove({ ...draft, items })
    setApproved(true)
  }

  return (
    <div style={boxStyle}>
      <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: '0 0 0.25rem' }}>
        📖 I made the game of my chapter
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
        Add your chapter, give a prompt, get a game you can share with friends.
        Your game stays private until you save it — and a teacher or parent should
        check it before it goes public.
      </p>

      <label htmlFor="chapter-text" style={{ display: 'block', fontWeight: 700, marginBottom: '0.35rem' }}>
        Chapter text
      </label>
      <textarea
        id="chapter-text"
        value={chapterText}
        onChange={(e) => setChapterText(e.target.value)}
        placeholder="Paste your chapter here…"
        rows={5}
        style={{ ...fieldStyle, marginBottom: '0.75rem', resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <input
          ref={textFileRef}
          type="file"
          accept=".txt,.md,text/plain"
          style={{ display: 'none' }}
          onChange={(e) => handleTextFile(e.target.files?.[0])}
        />
        <input
          ref={photoFileRef}
          type="file"
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => handlePhotoFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => textFileRef.current?.click()}
          style={{ minHeight: '48px', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 700 }}
        >
          📄 Upload chapter (.txt)
        </button>
        <button
          type="button"
          onClick={() => photoFileRef.current?.click()}
          style={{ minHeight: '48px', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 700 }}
        >
          🖼️ Upload photo / PDF
        </button>
      </div>
      {fileName && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
          File: {fileName}
        </p>
      )}
      {photoNote && (
        <p role="alert" style={{ color: 'var(--color-warning)', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
          ⚠️ Photo/PDF text is not read in this version — no OCR is installed and no paid
          key is used. Paste the chapter text above (or upload a .txt file) and the game
          will be made from that text only.
        </p>
      )}

      <label htmlFor="chapter-prompt" style={{ display: 'block', fontWeight: 700, marginBottom: '0.35rem' }}>
        Your prompt — what should this game be called?
      </label>
      <input
        id="chapter-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. chapter three"
        maxLength={200}
        style={{ ...fieldStyle, marginBottom: '0.75rem' }}
      />
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }} role="radiogroup" aria-label="Game type">
        {PROMPT_GAME_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={type === t.id}
            onClick={() => setType(t.id)}
            style={{
              minHeight: '48px', padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
              border: `2px solid ${type === t.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: type === t.id ? 'var(--gradient-btn)' : 'var(--color-surface)',
              color: type === t.id ? '#fff' : 'var(--color-text-primary)',
              cursor: 'pointer', fontWeight: 700,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={makeChapterGame}
        disabled={loading}
        className="eduplay-primary-action"
        style={{
          width: '100%', border: 'none', borderRadius: 'var(--radius)',
          background: loading ? 'var(--color-text-muted)' : 'var(--gradient-btn)',
          color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⏳ Making your chapter game…' : '📖 Make my chapter game'}
      </button>

      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          ⚠️ {error}
        </p>
      )}
      {approved && (
        <p role="status" style={{ color: 'var(--color-success)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          ✅ Chapter game approved and sent to the creator below — check Preview, then Save.
          It stays private until you choose to make it public, and sharing uses the play-page
          link + caption (no watermark, no name or photo in the share).
        </p>
      )}

      {draft && (
        <div style={{ marginTop: '1.25rem' }}>
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
            ✅ Approve this chapter game
          </button>
        </div>
      )}
    </div>
  )
}
