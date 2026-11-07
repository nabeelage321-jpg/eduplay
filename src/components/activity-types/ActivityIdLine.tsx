'use client'

import { useRef, useState } from 'react'

// TEACHER-ID BATCH 2026-11-02. The activity id used to live only in the URL,
// so a teacher playing a saved game could not see or copy it from the page
// itself. This line shows the page's OWN id under the title, with a Copy
// button. It renders no other field — never an email, teacher id, or any
// private value. Clipboard failure falls back to selecting the id text so
// the teacher can copy it manually.
//
// GAME NUMBER (batch 1, final list 11–14): when the game has a number
// (migration 011), it shows beside the id — "🔢 Game No. 123456". Before
// 011 runs, gameNumber is null and nothing is shown — never invented.
export default function ActivityIdLine({ id, gameNumber }: { id: string; gameNumber?: number | null }) {
  const [state, setState] = useState<'idle' | 'copied' | 'selected'>('idle')
  const idRef = useRef<HTMLSpanElement>(null)

  async function copyId() {
    try {
      await navigator.clipboard.writeText(id)
      setState('copied')
      window.setTimeout(() => setState('idle'), 2000)
    } catch {
      // Clipboard unavailable (permissions / non-secure context): select
      // the id text in place so it can be copied with Ctrl+C / Cmd+C.
      const node = idRef.current
      if (node) {
        const range = document.createRange()
        range.selectNodeContents(node)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
      setState('selected')
    }
  }

  return (
    <p
      style={{
        color: 'var(--color-text-muted)',
        fontSize: '0.8rem',
        margin: '0.25rem 0 0',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}
    >
      <span>
        Activity ID:{' '}
        <span ref={idRef} style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {id}
        </span>
      </span>
      {gameNumber != null ? (
        <span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>
          🔢 Game No. {gameNumber}
        </span>
      ) : null}
      <button
        type="button"
        onClick={copyId}
        aria-label="Copy activity id"
        style={{
          minHeight: '48px',
          minWidth: '48px',
          padding: '0.25rem 0.75rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          fontSize: '0.8rem',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {state === 'copied' ? 'Copied ✓' : state === 'selected' ? 'Selected — press Ctrl+C' : 'Copy'}
      </button>
    </p>
  )
}
