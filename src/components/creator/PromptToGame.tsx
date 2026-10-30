'use client'

import { useState } from 'react'
import { PROMPT_GAME_TYPES, type PromptDraft, type PromptGameType } from '@/lib/prompt-to-game'
import type { ActivityItem } from '@/types'

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

/** Editable draft list, shared by PromptToGame and ChapterScan. */
export function DraftEditor({
  draft,
  onChange,
}: {
  draft: PromptDraft
  onChange: (draft: PromptDraft) => void
}) {
  function editItem(i: number, key: 'prompt' | 'answer', value: string) {
    const items = draft.items.map((it, idx) =>
      idx === i ? { ...it, [key]: value } : it
    )
    onChange({ ...draft, items })
  }
  function removeItem(i: number) {
    onChange({ ...draft, items: draft.items.filter((_, idx) => idx !== i) })
  }
  return (
    <div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
        {draft.sourceNote}
        {draft.sourceUrl ? (
          <>
            {' '}
            <a href={draft.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
              Source
            </a>
          </>
        ) : null}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {draft.items.map((item, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              padding: '0.75rem',
              background: 'var(--color-surface-alt)',
            }}
          >
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Question / prompt {i + 1}
            </label>
            <input
              value={item.prompt}
              onChange={(e) => editItem(i, 'prompt', e.target.value)}
              style={{ ...fieldStyle, marginBottom: '0.5rem' }}
              aria-label={`Draft question ${i + 1}`}
            />
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Answer
            </label>
            <input
              value={item.answer}
              onChange={(e) => editItem(i, 'answer', e.target.value)}
              style={fieldStyle}
              aria-label={`Draft answer ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              style={{
                marginTop: '0.5rem', minHeight: '48px', padding: '0.5rem 1rem',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                background: 'var(--color-surface)', color: 'var(--color-text-muted)', cursor: 'pointer',
              }}
            >
              Remove this question
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PromptToGame({
  onApprove,
}: {
  /** Called with the edited draft. Nothing is saved or published here. */
  onApprove: (draft: PromptDraft) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState<PromptGameType>('quiz')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<PromptDraft | null>(null)
  const [approved, setApproved] = useState(false)

  async function makeDraft() {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    setApproved(false)
    try {
      const res = await fetch('/api/prompt-to-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), type }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not make a draft')
      setDraft(data.draft as PromptDraft)
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
    onApprove({ ...draft, items })
    setApproved(true)
  }

  return (
    <div style={boxStyle}>
      <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: '0 0 0.25rem' }}>
        ✨ Make a game from a prompt
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
        Type one prompt, get an editable draft, approve it — then Preview and Save.
        Nothing is published until you save it yourself.
      </p>

      <label htmlFor="prompt-game-input" style={{ display: 'block', fontWeight: 700, marginBottom: '0.35rem' }}>
        Your prompt
      </label>
      <textarea
        id="prompt-game-input"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. Animals for grade 3"
        rows={2}
        maxLength={200}
        style={{ ...fieldStyle, marginBottom: '0.75rem', resize: 'vertical' }}
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
        onClick={makeDraft}
        disabled={loading || !prompt.trim()}
        className="eduplay-primary-action"
        style={{
          width: '100%', border: 'none', borderRadius: 'var(--radius)',
          background: loading || !prompt.trim() ? 'var(--color-text-muted)' : 'var(--gradient-btn)',
          color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem',
          cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⏳ Making your draft…' : '✨ Make draft'}
      </button>

      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          ⚠️ {error}
        </p>
      )}
      {approved && (
        <p role="status" style={{ color: 'var(--color-success)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          ✅ Draft approved and sent to the creator below — check Preview, then Save.
          It stays private until you choose to make it public.
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
            ✅ Approve this draft
          </button>
        </div>
      )}
    </div>
  )
}
