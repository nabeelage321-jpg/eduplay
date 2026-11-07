'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityItem } from '@/types'
import ImagePicker from './ImagePicker'

interface ItemEditorProps {
  items: ActivityItem[]
  onChange: (items: ActivityItem[]) => void
  activityType: string
  /** True when the signed-in user may add pictures (teacher or owner). Kids/students NEVER. */
  canAddImages: boolean
  /** Pre-filled picture-search text — the game's title or subject. */
  defaultImageQuery?: string
}

const ITEM_HINTS: Record<string, { prompt: string; answer: string }> = {
  quiz: { prompt: 'Question', answer: 'Correct answer' },
  'match-up': { prompt: 'Left item', answer: 'Right match' },
  anagram: { prompt: 'Hint or definition', answer: 'Word to unscramble' },
  crossword: { prompt: 'Clue', answer: 'Answer word' },
  wordsearch: { prompt: 'Clue (optional)', answer: 'Word to find' },
  'spin-wheel': { prompt: 'Label', answer: 'Label (same)' },
  'balloon-pop': { prompt: 'Question', answer: 'Correct answer' },
  'whack-a-mole': { prompt: 'Question', answer: 'Correct answer' },
  'true-false': { prompt: 'Statement', answer: 'true or false' },
  categorize: { prompt: 'Item label', answer: 'Category name' },
  order: { prompt: 'Item (in correct order)', answer: 'Position (auto)' },
  'fill-blank': { prompt: 'Sentence with ___ blank', answer: 'Missing word' },
  'labelled-diagram': { prompt: 'Label name', answer: 'Label name (same)' },
  flashcards: { prompt: 'Front of card', answer: 'Back of card' },
  'missing-word': { prompt: 'Sentence (word can be included)', answer: 'Missing word' },
  unjumble: { prompt: 'Context hint (optional)', answer: 'Correct sentence' },
  'gameshow-quiz': { prompt: 'Question', answer: 'Correct answer' },
  hangman: { prompt: 'Hint or category', answer: 'Word to guess' },
  'random-wheel': { prompt: 'Name or topic', answer: 'Name or topic' },
  'open-box': { prompt: 'Box label', answer: 'Hidden content' },
  dictation: { prompt: 'Passage title (optional)', answer: 'Dictation text' },
  dialogue: { prompt: 'Speaker (character name)', answer: 'Line spoken' },
  'map-quiz': { prompt: 'Point name (e.g. Paris)', answer: 'Position x,y in % (e.g. 42,63)' },
  'jigsaw-puzzle': { prompt: 'Final question about the picture', answer: 'Final answer (typed)' },
  'video-quiz': { prompt: 'Question about the video', answer: 'Correct answer' },
  'letter-wheel': { prompt: 'Definition for this letter', answer: 'Word that fits the definition' },
  'maze-run': { prompt: 'Question for this maze', answer: 'Correct answer tile' },
  'speed-judge': { prompt: 'Question (the claim is about this)', answer: 'Correct answer (true claims use this)' },
  'spell-it': { prompt: 'Clue or question', answer: 'Word to spell' },
  'picture-answer': { prompt: 'Question about the picture', answer: 'Correct answer' },
  'memory-recall': { prompt: 'Prompt to remember', answer: 'Answer to recall' },
  'claim-line': { prompt: 'Question', answer: 'Correct answer' },
  'opinion-cloud': { prompt: 'Statement to react to', answer: 'Not shown — opinions have no right answer' },
  'number-slider': { prompt: 'Question', answer: 'Number answer' },
  'maze-chase': { prompt: 'Question for this maze', answer: 'Correct answer ball' },
  'apple-snake': { prompt: 'Question for this garden', answer: 'Correct answer apple' },
  'flutter-flight': { prompt: 'Question for this flight', answer: 'Correct answer gate' },
  'sweet-match': { prompt: 'Question for this board', answer: 'Word to spell or sum answer' },
  'star-shooter': { prompt: 'Question for this sky', answer: 'Correct answer invader' },
  'jump-blocks': { prompt: 'Question for this level', answer: 'Correct answer block' },
  'fruit-slice': { prompt: 'Question for this round', answer: 'Correct answer fruit' },
  'river-hop': { prompt: 'Counting question for this crossing', answer: 'Last number of the counting sequence' },
}

const fieldStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--radius)',
  border: '2px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  outline: 'none',
  minWidth: 0,
}

function emptyItem(): ActivityItem {
  return { prompt: '', answer: '', hint: '', imageUrl: '', imageCredit: '' }
}

export default function ItemEditor({ items, onChange, activityType, canAddImages, defaultImageQuery = '' }: ItemEditorProps) {
  const hints = ITEM_HINTS[activityType] ?? { prompt: 'Prompt', answer: 'Answer' }
  const dragIdx = useRef<number | null>(null)
  // Which picture search is open: 'shared' = the game's one picture
  // (Labelled Diagram), a number = that Picture Answer question.
  const [pickerFor, setPickerFor] = useState<'shared' | number | null>(null)

  /** Set the game's one shared picture on every item (Labelled Diagram). */
  function setSharedImage(url: string, credit: string) {
    if (items.length === 0) {
      onChange([{ prompt: '', answer: '', hint: '', imageUrl: url, imageCredit: credit }])
    } else {
      onChange(items.map((item) => ({ ...item, imageUrl: url, imageCredit: credit })))
    }
  }

  function add() {
    onChange([...items, emptyItem()])
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  function update(idx: number, field: keyof ActivityItem, value: string) {
    const next = items.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    onChange(next)
  }

  function dragStart(idx: number) { dragIdx.current = idx }
  function dragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === idx) return
    const next = [...items]
    const [moved] = next.splice(dragIdx.current, 1)
    next.splice(idx, 0, moved)
    dragIdx.current = idx
    onChange(next)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div>
          <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: 0 }}>
            Add Items
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
            {items.length} item{items.length !== 1 ? 's' : ''} · drag to reorder
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={add}
          aria-label="Add item"
          style={{
            padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
            border: 'none', background: 'var(--gradient-btn)',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.875rem',
            cursor: 'pointer', boxShadow: 'var(--shadow)', flexShrink: 0,
          }}
        >
          + Add Item
        </motion.button>
      </div>

      {/* MAP QUIZ ONLY: the map image is a pasted URL, not an upload —
          there is no teacher image-upload infrastructure in this batch.
          The URL must be the teacher's own or a CC-licensed image; it
          is stored on every item's imageUrl so the player (which reads
          the first item's imageUrl) and saved games both see it.
          Empty = the game plays on a plain grid background. */}
      {activityType === 'map-quiz' && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '0 0 0.4rem' }}>
            Each item is one point on the map. Players are asked “Where is X?” and tap the map.
            Position is x,y in percent from the left and top of the map.
          </p>
          <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>
            Map image URL — your own or CC-licensed image only (leave empty for a plain grid)
          </label>
          <input
            type="url"
            value={items[0]?.imageUrl ?? ''}
            onChange={(e) => {
              const url = e.target.value
              if (items.length === 0) {
                onChange([{ prompt: '', answer: '', hint: '', imageUrl: url }])
              } else {
                onChange(items.map((item) => ({ ...item, imageUrl: url })))
              }
            }}
            placeholder="https://… (your own or CC-licensed map image)"
            aria-label="Map image URL"
            style={fieldStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
          />
        </div>
      )}

      {/* JIGSAW ONLY: the picture is a pasted URL, not an upload —
          there is no teacher image-upload infrastructure in this batch.
          The URL must be the teacher's own or a CC-licensed image; it
          is stored on every item's imageUrl so the player (which reads
          the first item's imageUrl) and saved games both see it.
          Empty = the game plays on a coloured pattern. Grid size is
          chosen by the PLAYER at the start (Easy 2x2 or Normal 3x3):
          the save route whitelists only prompt / answer / hint /
          imageUrl, so a creator-stored grid size would be stripped
          on save, and no API change is made in this batch. The first
          item is the final question, asked when every piece is placed;
          extra items are reserved for the later piece-quiz batch. */}
      {activityType === 'jigsaw-puzzle' && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '0 0 0.4rem' }}>
            The first item is the final question about the picture, asked when every piece is placed.
            Grid size: the player picks Easy 2 × 2 or Normal 3 × 3 at the start of the game.
          </p>
          <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>
            Picture URL — your own or CC-licensed image only (leave empty for a coloured pattern)
          </label>
          <input
            type="url"
            value={items[0]?.imageUrl ?? ''}
            onChange={(e) => {
              const url = e.target.value
              if (items.length === 0) {
                onChange([{ prompt: '', answer: '', hint: '', imageUrl: url }])
              } else {
                onChange(items.map((item) => ({ ...item, imageUrl: url })))
              }
            }}
            placeholder="https://… (your own or CC-licensed picture)"
            aria-label="Picture URL"
            style={fieldStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
          />
        </div>
      )}

      {/* VIDEO QUIZ ONLY: the video is a pasted URL, not an upload —
          there is no teacher video-upload infrastructure in this batch.
          The URL must be the teacher's own hosted video file, or a
          YouTube link for embedding only (own / CC-licensed video
          only). Nothing is extracted from YouTube — no captions, no
          transcript. It is stored on every item's imageUrl so the
          player (which reads the first item's imageUrl) and saved
          games both see it. Each question's time goes in its Hint
          field, in seconds (e.g. 45, or 1:30); a blank Hint means the
          question is asked after the video ends. */}
      {activityType === 'video-quiz' && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '0 0 0.4rem' }}>
            Watch the video, then answer. The video pauses at each question&apos;s time; questions
            with no time are asked after the video ends.
          </p>
          <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>
            Video URL — your own hosted video, or a YouTube link for embedding only (own / CC-licensed video only)
          </label>
          <input
            type="url"
            value={items[0]?.imageUrl ?? ''}
            onChange={(e) => {
              const url = e.target.value
              if (items.length === 0) {
                onChange([{ prompt: '', answer: '', hint: '', imageUrl: url }])
              } else {
                onChange(items.map((item) => ({ ...item, imageUrl: url })))
              }
            }}
            placeholder="https://… (your own video file, or a YouTube link)"
            aria-label="Video URL"
            style={fieldStyle}
            onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
          />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '0.4rem 0 0' }}>
            Put each question&apos;s time in its Hint field, in seconds (e.g. 45, or 1:30).
            Leave the Hint blank to ask that question after the video ends.
          </p>
        </div>
      )}

      {/* LABELLED DIAGRAM ONLY: the picture is REQUIRED — without it
          the game cannot be played at all (the player shows "This
          game needs a picture" instead of a blind dot quiz). This
          box sits at the top of the editor on purpose: the step is
          unmissable. The picture is the teacher's own or a
          CC-licensed one — picked from the Openverse search below,
          or pasted as a URL. It is stored on every item's imageUrl
          so the player (which reads the first item's imageUrl) and
          saved games both see it. Picking a picture does NOT publish
          it: it goes to the owner for approval first (migration
          012), and the game stays private until approved. */}
      {activityType === 'labelled-diagram' && (
        <div style={{
          marginBottom: '0.75rem', padding: '0.75rem',
          border: '2px solid var(--color-warning)', borderRadius: 'var(--radius-lg)',
          background: 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface))',
        }}>
          <h3 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1rem', margin: '0 0 0.25rem' }}>
            🖼️ Diagram picture — REQUIRED
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem' }}>
            This game cannot be played without a picture — the labels sit on the picture itself.
            Pick a free picture below, or paste your own or a CC-licensed picture URL.
          </p>
          {canAddImages ? (
            <>
              <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>
                Picture URL — your own or CC-licensed picture only
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                <input
                  type="url"
                  value={items[0]?.imageUrl ?? ''}
                  onChange={(e) => setSharedImage(e.target.value, '')}
                  placeholder="https://… (your own or CC-licensed picture)"
                  aria-label="Diagram picture URL"
                  style={{ ...fieldStyle, flex: 1 }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
                />
                <button
                  onClick={() => setPickerFor(pickerFor === 'shared' ? null : 'shared')}
                  aria-label="Search free pictures"
                  style={{
                    padding: '0.5rem 0.875rem', borderRadius: 'var(--radius)',
                    border: '2px solid var(--color-primary)', background: 'var(--color-surface)',
                    color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '0.875rem',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  🔍 Search free pictures
                </button>
              </div>
              {pickerFor === 'shared' ? (
                <ImagePicker
                  defaultQuery={defaultImageQuery || items[0]?.prompt || ''}
                  onPick={(url, credit) => { setSharedImage(url, credit); setPickerFor(null) }}
                  onClose={() => setPickerFor(null)}
                />
              ) : null}
              {items[0]?.imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={items[0].imageUrl}
                    alt="Diagram preview"
                    style={{ display: 'block', maxWidth: '100%', maxHeight: '180px', marginTop: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}
                  />
                  {items[0]?.imageCredit ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
                      🖼️ {items[0].imageCredit}
                    </p>
                  ) : null}
                </>
              ) : (
                <p style={{ color: 'var(--color-warning)', fontSize: '0.875rem', margin: '0.5rem 0 0', fontWeight: 700 }}>
                  ⚠️ No picture yet — this game cannot be played until you add one. Players will see
                  “This game needs a picture” instead of a quiz.
                </p>
              )}
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
                Your picture goes to the owner for approval before the game can go public — the game stays private until it is approved.
              </p>
            </>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Only a teacher can add the picture. Save your labels — a teacher adds the picture later.
              Without a picture, players see “This game needs a picture” instead of a quiz.
            </p>
          )}
        </div>
      )}

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr 1fr 32px', gap: '0.4rem', marginBottom: '0.35rem', padding: '0 0.25rem' }}>
        <span />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>
          {hints.prompt}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>
          {hints.answer}
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>
          Hint (opt.)
        </span>
        <span />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '360px', overflowY: 'auto', paddingRight: '0.25rem' }}>
        <AnimatePresence initial={false}>
          {items.map((item, idx) => (
            <motion.div
              key={idx}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.18 }}
              draggable
              onDragStart={() => dragStart(idx)}
              onDragOver={(e) => dragOver(e, idx)}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr 1fr 1fr 32px',
                gap: '0.4rem',
                alignItems: 'center',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                padding: '0.4rem 0.5rem',
              }}
            >
              {/* Drag handle */}
              <span
                aria-hidden="true"
                style={{ color: 'var(--color-text-muted)', cursor: 'grab', fontSize: '1rem', textAlign: 'center', userSelect: 'none' }}
              >
                ⠿
              </span>

              {/* Prompt */}
              <input
                type="text"
                value={item.prompt}
                onChange={(e) => update(idx, 'prompt', e.target.value)}
                placeholder={hints.prompt}
                aria-label={`Item ${idx + 1} ${hints.prompt}`}
                style={fieldStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
              />

              {/* Answer */}
              <input
                type="text"
                value={item.answer}
                onChange={(e) => update(idx, 'answer', e.target.value)}
                placeholder={hints.answer}
                aria-label={`Item ${idx + 1} ${hints.answer}`}
                style={fieldStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
              />

              {/* Hint */}
              <input
                type="text"
                value={item.hint ?? ''}
                onChange={(e) => update(idx, 'hint', e.target.value)}
                placeholder="Optional hint…"
                aria-label={`Item ${idx + 1} hint`}
                style={fieldStyle}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
              />

              {/* Remove */}
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => remove(idx)}
                disabled={items.length <= 1}
                aria-label={`Remove item ${idx + 1}`}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  border: '2px solid var(--color-danger)',
                  background: 'transparent', color: 'var(--color-danger)',
                  cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', fontWeight: 700,
                  opacity: items.length <= 1 ? 0.3 : 1,
                  flexShrink: 0,
                }}
              >
                ×
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {items.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '2rem',
          color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)',
          border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
          marginTop: '0.5rem',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
          Click "Add Item" to get started
        </div>
      )}

      {/* PICTURE ANSWER ONLY: one picture per question, pasted as a
          URL — not an upload, and NOT a shared picture for all
          items (unlike Map Quiz / Jigsaw, where one image serves
          the whole game: here each round shows its own item's
          picture). The URL must be the teacher's own or a
          CC-licensed image. It is stored on that item's imageUrl
          (the save route whitelists it), so the player — which
          reads each round's own imageUrl — and saved games both
          see it. Empty = that round plays clue-only, with an
          honest no-picture state; no picture is ever invented
          for it. This section sits below the item rows on
          purpose: the rows keep their drag/reorder grid, and
          pictures are attached per question here. */}
      {activityType === 'picture-answer' && items.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1rem', margin: '0 0 0.25rem' }}>
            Pictures — one per question
          </h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem' }}>
            Paste a picture URL for each question — your own or CC-licensed image only. Leave it empty and that
            question plays from its clue alone, with a plain no-picture note. No picture is ever invented for you.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {items.map((item, idx) => (
              <div key={idx}>
                <label style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>
                  Picture for question {idx + 1}{item.prompt ? ` — ${item.prompt}` : ''}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                  <input
                    type="url"
                    value={item.imageUrl ?? ''}
                    onChange={(e) => update(idx, 'imageUrl', e.target.value)}
                    placeholder="https://… (your own or CC-licensed picture, or leave empty)"
                    aria-label={`Picture URL for question ${idx + 1}`}
                    style={{ ...fieldStyle, flex: 1 }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)' }}
                  />
                  {canAddImages ? (
                    <button
                      onClick={() => setPickerFor(pickerFor === idx ? null : idx)}
                      aria-label={`Search free pictures for question ${idx + 1}`}
                      style={{
                        padding: '0.5rem 0.875rem', borderRadius: 'var(--radius)',
                        border: '2px solid var(--color-primary)', background: 'var(--color-surface)',
                        color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '0.875rem',
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      🔍 Search
                    </button>
                  ) : null}
                </div>
                {item.imageCredit ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '0.35rem 0 0' }}>
                    🖼️ {item.imageCredit}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          {pickerFor !== null && typeof pickerFor === 'number' ? (
            <ImagePicker
              defaultQuery={items[pickerFor]?.prompt || defaultImageQuery}
              onPick={(url, credit) => {
                const idx = pickerFor
                onChange(items.map((item, i) => (i === idx ? { ...item, imageUrl: url, imageCredit: credit } : item)))
                setPickerFor(null)
              }}
              onClose={() => setPickerFor(null)}
            />
          ) : null}
          {!canAddImages ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
              Only a teacher can search for pictures. Paste a picture URL above, or ask a teacher to add one.
            </p>
          ) : null}
        </div>
      )}

      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={() => onChange([...items, emptyItem(), emptyItem(), emptyItem()])}
          style={{
            padding: '0.4rem 0.875rem', borderRadius: 'var(--radius)',
            border: '2px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          + Add 3 at once
        </motion.button>
      </div>
    </div>
  )
}
