'use client'

import { useRef, useState } from 'react'
import { PROMPT_GAME_TYPES, type PromptDraft, type PromptGameType } from '@/lib/prompt-to-game'
import { FILTER_GRADES, FILTER_SUBJECTS } from '@/lib/filters'
import { DraftEditor } from './PromptToGame'
import { combineOcrPages, recognizeImages, type OcrProgress } from '@/lib/ocr'

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

const smallButtonStyle: React.CSSProperties = {
  minHeight: '48px',
  padding: '0.5rem 1rem',
  borderRadius: 'var(--radius)',
  border: '2px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  fontWeight: 700,
}

/**
 * Student chapter-scan → chapter game.
 *
 * MINIMAL INPUT (owner order 2026-11-07): the kid or teacher uploads a
 * chapter (paste, .txt file, or phone photos read on-device), then ONLY
 * picks subject, grade and game type from dropdowns and presses Make —
 * no typing of a prompt, a question, or an answer anywhere in this
 * flow. The chapter text itself is the only free input. The game title
 * is taken from the chapter's own first line (see deriveChapterTitle).
 * This box is its own separate flow on the create page — it is NOT the
 * prompt-to-game page (/en/prompt-to-game), which stays exactly as it
 * is; the two are never merged and never share a form.
 *
 * What works in this batch:
 * - Paste chapter text, or upload a .txt/.md file (read in the browser).
 * - NEW: scan chapter pages with the phone camera, or upload several
 *   photos, and read them with free on-device OCR (Tesseract.js).
 *   Photos are read on the device and are never uploaded anywhere.
 *   The scanned text is shown for checking FIRST — the game is only
 *   made after the user confirms the corrected text.
 * - The game is built from that chapter's facts, reworded in new words — never the book's exact sentences, no invented facts. (Comment only; the OCR upload/review flow itself is unchanged.)
 * What does NOT work yet, stated plainly in the UI:
 * - PDF text extraction: PDF-to-image OCR is a separate later batch.
 *   A PDF can be attached, but its text is NOT read.
 * - Printed English reads well; handwriting reads poorly; Urdu
 *   Nastaliq reads poorly with this free reader (a paid cloud OCR
 *   service is a later option, not a silent failure here).
 * Student games are private by default (see ActivityCreator approval
 * path) and are only shareable after the creator saves them; the share
 * link is the game's play page + ready caption, never a watermark and
 * never a child's name or photo.
 */
/**
 * The game title comes from the chapter itself — its first non-empty
 * line, cleaned up — so nobody has to type a prompt or a title.
 * The title is only a label: the questions are paraphrased from the
 * chapter's facts, never copied, and the creator can still rename the
 * game in the creator before saving.
 */
export function deriveChapterTitle(chapterText: string): string {
  const firstLine = chapterText
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .find((line) => line.length > 0)
  if (!firstLine) return 'My chapter game'
  return firstLine.slice(0, 80)
}

export default function ChapterScan({
  onApprove,
}: {
  onApprove: (draft: PromptDraft) => void
}) {
  const [chapterText, setChapterText] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [type, setType] = useState<PromptGameType>('quiz')
  const [fileName, setFileName] = useState('')
  const [pdfNote, setPdfNote] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<PromptDraft | null>(null)
  const [approved, setApproved] = useState(false)
  const textFileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const pdfRef = useRef<HTMLInputElement>(null)

  // --- Photo OCR state ---
  // Photos are kept in upload order. Scanned text lives in ocrText
  // ONLY until the user confirms it — it never reaches chapterText
  // (and therefore never reaches game-making) before confirmation.
  const [photos, setPhotos] = useState<File[]>([])
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null)
  const [ocrText, setOcrText] = useState<string | null>(null)
  const [ocrFailed, setOcrFailed] = useState<string[]>([])
  const [ocrUsed, setOcrUsed] = useState(false)

  function handleTextFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    setPdfNote(false)
    const reader = new FileReader()
    reader.onload = () => setChapterText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  function handlePhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) {
      setError('Those files are not photos. Choose image files, or use the camera.')
      return
    }
    setError(null)
    setPhotos((prev) => [...prev, ...images])
  }

  function handlePdfFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    // Honest limit: PDF-to-image OCR is a later batch, so PDF text is NOT read.
    setPdfNote(true)
  }

  async function runOcr() {
    if (photos.length === 0) return
    setError(null)
    setOcrText(null)
    setOcrFailed([])
    setOcrUsed(false)
    try {
      const pages = await recognizeImages(photos, setOcrProgress)
      const { text, failedNames } = combineOcrPages(pages)
      setOcrFailed(failedNames)
      if (!text) {
        setError(
          'No text could be read from these photos. Try again with a straighter, ' +
            'better-lit photo of printed text, or paste the chapter text instead.',
        )
        return
      }
      // Review screen opens: nothing is used until the user confirms it below.
      setOcrText(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the photos.')
    } finally {
      setOcrProgress(null)
    }
  }

  function useOcrText() {
    if (ocrText === null) return
    setChapterText(ocrText)
    setOcrText(null)
    setOcrUsed(true)
    setError(null)
  }

  async function makeChapterGame() {
    if (chapterText.trim().length < 100) {
      setError('Add at least a few sentences of chapter text first (paste it, upload a .txt file, or scan photos and use their text).')
      return
    }
    // Minimal input: subject + grade are picks, never typed. The game
    // title is taken from the chapter's own first line — no prompt is
    // typed anywhere in this flow.
    if (!subject) {
      setError('Pick a subject for your chapter game.')
      return
    }
    if (!grade) {
      setError('Pick a grade for your chapter game.')
      return
    }
    setLoading(true)
    setError(null)
    setApproved(false)
    try {
      const res = await fetch('/api/prompt-to-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: deriveChapterTitle(chapterText), type, chapterText }),
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
    // The subject/grade picked here travel with the draft, so the
    // creator saves them instead of leaving them blank (ActivityCreator
    // already reads draft.subject / draft.grade on approval).
    onApprove({ ...draft, items, subject: subject || undefined, grade: grade || undefined })
    setApproved(true)
  }

  const ocrReading = ocrProgress !== null
  const reviewOpen = ocrText !== null

  return (
    <div style={boxStyle}>
      <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: '0 0 0.25rem' }}>
        📖 I made the game of my chapter
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
        Add your chapter, pick the subject, grade and game type, press Make —
        no typing needed. Your game stays private until you save it — and a
        teacher or parent should check it before it goes public.
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
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => { handlePhotos(e.target.files); e.target.value = '' }}
        />
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { handlePhotos(e.target.files); e.target.value = '' }}
        />
        <input
          ref={pdfRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={(e) => handlePdfFile(e.target.files?.[0])}
        />
        <button type="button" onClick={() => textFileRef.current?.click()} style={smallButtonStyle}>
          📄 Upload chapter (.txt)
        </button>
        <button type="button" onClick={() => cameraRef.current?.click()} style={smallButtonStyle}>
          📷 Take photo
        </button>
        <button type="button" onClick={() => photoRef.current?.click()} style={smallButtonStyle}>
          🖼️ Upload photos
        </button>
        <button type="button" onClick={() => pdfRef.current?.click()} style={smallButtonStyle}>
          📄 Upload PDF
        </button>
      </div>
      {fileName && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
          File: {fileName}
        </p>
      )}
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
        Photos are read on this device with a free reader — they are never uploaded
        anywhere. Printed English reads well. Handwriting reads poorly. Urdu
        Nastaliq reads poorly with this free reader, so for an Urdu chapter paste
        the text instead for now.
      </p>
      {photos.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ fontWeight: 700, margin: '0 0 0.35rem' }}>
            {photos.length} photo{photos.length > 1 ? 's' : ''} added, in this order:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>
            {photos.map((photo, i) => (
              <li key={`${photo.name}-${i}`}>
                Page {i + 1}: {photo.name}{' '}
                <button
                  type="button"
                  aria-label={`Remove ${photo.name}`}
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={runOcr}
            disabled={ocrReading}
            className="eduplay-primary-action"
            style={{
              marginTop: '0.5rem', border: 'none', borderRadius: 'var(--radius)',
              background: ocrReading ? 'var(--color-text-muted)' : 'var(--gradient-btn)',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem',
              cursor: ocrReading ? 'not-allowed' : 'pointer',
            }}
          >
            {ocrReading
              ? `⏳ Reading photo ${ocrProgress?.current} of ${ocrProgress?.total}…`
              : '🔍 Read my photos'}
          </button>
        </div>
      )}
      {pdfNote && (
        <p role="alert" style={{ color: 'var(--color-warning)', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
          ⚠️ PDF text is not read in this version — PDF-to-image reading is a later
          step. For now, take photos of the pages instead, or paste the chapter text
          above (or upload a .txt file) and the game will be made from that text only.
        </p>
      )}

      {reviewOpen && (
        <div
          role="region"
          aria-label="Check the scanned text"
          style={{ border: '2px solid var(--color-primary)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '0.75rem' }}
        >
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', margin: '0 0 0.25rem' }}>
            🔍 Check the scanned text
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
            The reader can misread words — a blurry photo, glare, or a tilted page can
            change letters. Read every word below and fix anything wrong before you
            continue. Nothing is used for your game until you press “Use this text”.
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
            Your chapter game stays private until you save it and choose to make it
            public. Textbook pages are copyrighted — never publish a scanned chapter
            game as public without a teacher or parent checking it.
          </p>
          {ocrFailed.length > 0 && (
            <p role="alert" style={{ color: 'var(--color-warning)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
              ⚠️ These photos could not be read and were left out: {ocrFailed.join(', ')}.
              Try straighter, better-lit photos of those pages.
            </p>
          )}
          <textarea
            aria-label="Scanned chapter text — check and correct it"
            value={ocrText ?? ''}
            onChange={(e) => setOcrText(e.target.value)}
            rows={8}
            style={{ ...fieldStyle, marginBottom: '0.75rem', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={useOcrText}
              className="eduplay-primary-action"
              style={{
                border: 'none', borderRadius: 'var(--radius)',
                background: 'var(--gradient-btn)', color: '#fff',
                fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
              }}
            >
              ✅ Use this text
            </button>
            <button type="button" onClick={runOcr} style={smallButtonStyle}>
              ↺ Read photos again
            </button>
            <button type="button" onClick={() => { setOcrText(null); setOcrFailed([]) }} style={smallButtonStyle}>
              ✕ Discard scanned text
            </button>
          </div>
        </div>
      )}
      {ocrUsed && (
        <p role="status" style={{ color: 'var(--color-success)', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
          ✅ Scanned text added — check it in the Chapter text box above, then pick
          the subject, grade and game type below and make your game.
        </p>
      )}

      {/* Minimal input: only picks from here on — subject, grade, game
          type. No prompt is typed: the game title comes from the
          chapter's own first line (shown below, read-only). */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label htmlFor="chapter-subject" style={{ display: 'block', fontWeight: 700, marginBottom: '0.35rem' }}>
            Subject
          </label>
          <select
            id="chapter-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={fieldStyle}
          >
            <option value="">Pick a subject…</option>
            {FILTER_SUBJECTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label htmlFor="chapter-grade" style={{ display: 'block', fontWeight: 700, marginBottom: '0.35rem' }}>
            Grade
          </label>
          <select
            id="chapter-grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            style={fieldStyle}
          >
            <option value="">Pick a grade…</option>
            {FILTER_GRADES.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
      </div>
      {chapterText.trim() && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
          Your game will be called: “{deriveChapterTitle(chapterText)}” — taken from
          your chapter&apos;s first line. You can still rename it in the creator before saving.
        </p>
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
        onClick={makeChapterGame}
        disabled={loading || reviewOpen}
        className="eduplay-primary-action"
        style={{
          width: '100%', border: 'none', borderRadius: 'var(--radius)',
          background: loading || reviewOpen ? 'var(--color-text-muted)' : 'var(--gradient-btn)',
          color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem',
          cursor: loading || reviewOpen ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '⏳ Making your chapter game…' : '📖 Make my chapter game'}
      </button>
      {reviewOpen && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Confirm or discard the scanned text above before making your game.
        </p>
      )}

      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          ⚠️ {error}
        </p>
      )}
      {approved && (
        <p role="status" style={{ color: 'var(--color-success)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          ✅ Chapter game approved — the page has moved to the Preview step below.
          Check it there, then use “Preview and Save”. It stays private until you
          choose to make it public, and sharing uses the play-page link + caption
          (no watermark, no name or photo in the share).
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
