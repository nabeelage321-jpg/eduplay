'use client'

import { useState } from 'react'
import { PROMPT_GAME_TYPES, type PromptDraft, type PromptGameType } from '@/lib/prompt-to-game'
import { FILTER_SUBJECTS, FILTER_GRADES } from '@/lib/filters'
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 700,
  marginBottom: '0.35rem',
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

/**
 * GUIDED PROMPT BUILDER (2026-11-01) — both options live side by side:
 * Guided (pick subject + grade, tap a recommended topic) and Free
 * (type any prompt, with the same recommendations as suggestions).
 * Neither removes the other; both call the same /api/prompt-to-game
 * route and produce the same editable draft and approval flow.
 *
 * Recommendation chips are plain topic names only — never a claim
 * about a curriculum, a count, or a rating. Math table chips are
 * built locally by the existing route (f6b5cff fix), so they work
 * even when the free trivia service is down; other topics go through
 * that same route and show its plain error if the service is down.
 * Subject/grade use the exact DB values from src/lib/filters.ts
 * (e.g. "Math", not "Mathematics"; "pre-k", not "Pre-K"), so the
 * saved game carries them instead of saving blank.
 */
const TOPIC_RECOMMENDATIONS: Record<string, string[]> = {
  English: ['Animals', 'Colours', 'My family', 'Food words'],
  Urdu: ['Urdu words for animals', 'Urdu colours', 'My family in Urdu'],
  Science: ['Parts of a plant', 'The solar system', 'Animals and their homes', 'The water cycle'],
  Islamiyat: ['Five Pillars of Islam', 'Good manners', 'Daily prayers'],
  'Social Studies': ['My community', 'Maps and directions', 'Festivals'],
  'Computer Science': ['Parts of a computer', 'Internet safety', 'Computer parts'],
  Art: ['Colours', 'Shapes', 'Drawing tools'],
  'Physical Education': ['Healthy habits', 'Sports', 'Exercise'],
  Geography: ['Continents', 'Oceans', 'Maps'],
  History: ['Famous landmarks', 'Old and new'],
  'General Knowledge': ['Animals', 'The world around us', 'Famous places'],
  Biology: ['Parts of a plant', 'The human body', 'Animals'],
  Chemistry: ['Water', 'Air', 'States of matter'],
  Physics: ['Light', 'Sound', 'Motion'],
}

const DEFAULT_CHIPS: string[] = ['Table of 2', 'Animals', 'Parts of a plant']

function chipStyle(selected: boolean): React.CSSProperties {
  return {
    minHeight: '48px', padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
    border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
    background: selected ? 'var(--color-primary-light)' : 'var(--color-surface)',
    color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 700,
  }
}

export default function PromptToGame({
  onApprove,
}: {
  /** Called with the edited draft. Nothing is saved or published here. */
  onApprove: (draft: PromptDraft) => void
}) {
  const [mode, setMode] = useState<'guided' | 'free'>('guided')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState<PromptGameType>('quiz')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<PromptDraft | null>(null)
  const [approved, setApproved] = useState(false)

  const subjectLabel = FILTER_SUBJECTS.find((s) => s.value === subject)?.label ?? subject
  const gradeLabel = FILTER_GRADES.find((g) => g.value === grade)?.label ?? grade

  /** Chips for the current subject (Math = tables 2–12, built locally
   *  by the route; other subjects = plain topic names). No subject
   *  picked yet → a small default set, so the free box is never bare. */
  function currentChips(): Array<{ label: string; prompt: string }> {
    if (subject === 'Math') {
      return Array.from({ length: 11 }, (_, i) => {
        const n = i + 2
        return { label: `Table of ${n}`, prompt: `make game for a table of ${n}` }
      })
    }
    const topics = subject ? TOPIC_RECOMMENDATIONS[subject] : undefined
    if (topics) {
      return topics.map((t) => ({
        label: t,
        prompt: gradeLabel ? `${t} for ${gradeLabel}` : t,
      }))
    }
    return DEFAULT_CHIPS.map((t) => ({
      label: t,
      prompt: t === 'Table of 2' ? 'make game for a table of 2' : t,
    }))
  }

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
    // Guided subject/grade flow into approval, so the saved game no
    // longer has a blank subject/grade (the amber warning from the
    // 2026-11-01 approve fix). Free prompts with no picks keep the
    // old behaviour: approval carries none, and the wizard warns.
    onApprove({ ...draft, items, subject: subject || undefined, grade: grade || undefined })
    setApproved(true)
  }

  const chips = currentChips()

  return (
    <div style={boxStyle}>
      <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: '0 0 0.25rem' }}>
        ✨ Make a game from a prompt
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
        Two ways to start — pick from lists, or type your own prompt.
        Both make the same editable draft. Approving only fills the
        creator — nothing is published until you save it yourself.
      </p>

      {/* Shared subject + grade: used by BOTH modes, so the saved game
          carries them either way. Values are exact DB values. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label htmlFor="prompt-subject" style={labelStyle}>Subject</label>
          <select
            id="prompt-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{ ...fieldStyle, minHeight: '48px' }}
          >
            <option value="">Pick a subject…</option>
            {FILTER_SUBJECTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="prompt-grade" style={labelStyle}>Grade</label>
          <select
            id="prompt-grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            style={{ ...fieldStyle, minHeight: '48px' }}
          >
            <option value="">Pick a grade…</option>
            {FILTER_GRADES.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
      </div>
      {(subject || grade) && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
          You picked: {subjectLabel || 'no subject yet'} · {gradeLabel || 'no grade yet'}
          {subject && grade ? ' — these will be saved with your game when you approve it.' : ' — pick both, and they will be saved with your game.'}
        </p>
      )}

      {/* Mode toggle — both options stay available, neither is hidden. */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }} role="radiogroup" aria-label="Prompt way">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'guided'}
          onClick={() => setMode('guided')}
          style={{
            minHeight: '48px', padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
            border: `2px solid ${mode === 'guided' ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: mode === 'guided' ? 'var(--gradient-btn)' : 'var(--color-surface)',
            color: mode === 'guided' ? '#fff' : 'var(--color-text-primary)',
            cursor: 'pointer', fontWeight: 700, flex: 1,
          }}
        >
          🧭 Guided — pick from lists
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'free'}
          onClick={() => setMode('free')}
          style={{
            minHeight: '48px', padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
            border: `2px solid ${mode === 'free' ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: mode === 'free' ? 'var(--gradient-btn)' : 'var(--color-surface)',
            color: mode === 'free' ? '#fff' : 'var(--color-text-primary)',
            cursor: 'pointer', fontWeight: 700, flex: 1,
          }}
        >
          ✍️ Free — type my own prompt
        </button>
      </div>

      {mode === 'guided' ? (
        <div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
            💡 What we recommend{subjectLabel ? ` for ${subjectLabel}` : ''}{gradeLabel ? ` · ${gradeLabel}` : ''} — tap one, it fills your prompt:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setPrompt(c.prompt)}
                style={chipStyle(prompt === c.prompt)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label htmlFor="prompt-game-input" style={labelStyle}>
            Your prompt (filled by the chip — you can still edit it)
          </label>
          <textarea
            id="prompt-game-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Tap a recommendation above, or type your own"
            rows={2}
            maxLength={200}
            style={{ ...fieldStyle, marginBottom: '0.75rem', resize: 'vertical' }}
          />
        </div>
      ) : (
        <div>
          <label htmlFor="prompt-game-input" style={labelStyle}>
            Your prompt
          </label>
          <textarea
            id="prompt-game-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. make game for a table of 2"
            rows={2}
            maxLength={200}
            style={{ ...fieldStyle, marginBottom: '0.75rem', resize: 'vertical' }}
          />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
            💡 Or tap a suggestion — it fills the box:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setPrompt(c.prompt)}
                style={chipStyle(prompt === c.prompt)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
          ✅ Draft approved — the page has moved to the Preview step below.
          Check it there, then use “Preview and Save”. It stays private
          until you choose to make it public.
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
