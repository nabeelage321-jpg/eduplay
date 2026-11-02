'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL } from './shared'

/**
 * Dialogue — EduPlay's own conversation script player, NOT a quiz skin.
 *
 * NOT a copy of any rival: no rival art, wording, or audio. A dialogue
 * here is a script: named characters (the item's prompt) speaking
 * ordered lines (the item's answer). The creator writes the characters
 * and their lines in order; the player reads and follows the
 * conversation, line by line.
 *
 * Player-visible beats (text only in this batch; audio via TTS per
 * line is a later batch, not this one — so there is deliberately NO
 * Listen button here, to avoid implying audio that does not exist):
 * - The conversation is revealed one line at a time. "Next line"
 *   shows the next line; earlier lines stay visible so the player
 *   can re-read the conversation so far.
 * - Each line is a speech bubble with its speaker's name and an
 *   initial avatar. Each speaker gets their own colour, assigned in
 *   order of first appearance, so a two-character conversation reads
 *   as a back-and-forth (first speaker left, second right, and so on).
 * - When the last line is shown, "Finish" ends the dialogue. There is
 *   no quiz, no score for right/wrong answers, and no line-order test
 *   in v1 — finishing the read IS the completion.
 * - End screen: lines read / total lines, the characters who spoke,
 *   and "Play again" (replay the dialogue from line 1).
 *
 * Stability (the 2026-11-02 quiz lesson): the play page re-renders
 * every second for its elapsed timer. Lines are therefore built once
 * per line CONTENT (fingerprint + ref guard), never on render, so
 * parent ticks can never reshuffle or reset a dialogue in progress.
 * onComplete fires exactly once per finished dialogue.
 */

export interface DialogueLine {
  speaker: string
  text: string
}

/** One item = one spoken line: prompt is the speaker's name, answer
 *  is the line they speak. Lines with no speaker or no text are
 *  dropped — a bubble needs both to make sense. */
export function dialogueLinesFromItems(
  items: { prompt: string; answer: string }[],
): DialogueLine[] {
  return items
    .filter((i) => i.prompt && i.prompt.trim() && i.answer && i.answer.trim())
    .map((i) => ({ speaker: i.prompt.trim(), text: i.answer.trim() }))
}

/** Speaker colours, assigned in order of first appearance. Pastel
 *  bubbles with a darker accent for the name and avatar — EduPlay's
 *  own palette, not any rival's. */
const SPEAKER_COLOURS = [
  { bg: '#E3F2FD', accent: '#1565C0' },
  { bg: '#FCE4EC', accent: '#C62828' },
  { bg: '#E8F5E9', accent: '#2E7D32' },
  { bg: '#FFF3E0', accent: '#E65100' },
  { bg: '#F3E5F5', accent: '#6A1B9A' },
  { bg: '#E0F2F1', accent: '#00695C' },
]

function speakerColour(speaker: string, speakers: string[]) {
  const idx = speakers.indexOf(speaker)
  return SPEAKER_COLOURS[(idx < 0 ? 0 : idx) % SPEAKER_COLOURS.length]
}

export default function DialogueActivity({ items, locale, onComplete }: ActivityProps) {
  const [lines, setLines] = useState<DialogueLine[]>([])
  const [shownCount, setShownCount] = useState(1)
  const [finished, setFinished] = useState(false)

  const rtl = isRTL(locale)

  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    setLines(dialogueLinesFromItems(items))
    resetGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsFingerprint, items])

  const linesRef = useRef<DialogueLine[]>([])
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { linesRef.current = lines })

  function resetGame() {
    setShownCount(1)
    setFinished(false)
    completedRef.current = false
  }

  function next() {
    if (shownCount < linesRef.current.length) {
      setShownCount((n) => n + 1)
      return
    }
    setFinished(true)
    if (!completedRef.current) {
      completedRef.current = true
      // Read-and-follow has no right/wrong score: finishing the read
      // is the completion, so the score is the full 100 and the
      // detail carries what was actually read, so the Preview
      // wrapper can show "N of N lines read" instead of a bare score.
      onCompleteRef.current(100, {
        linesRead: linesRef.current.length,
        totalLines: linesRef.current.length,
      })
    }
  }

  if (lines.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>This dialogue has no lines yet.</p>
      </div>
    )
  }

  if (finished) {
    const speakers = Array.from(new Set(lines.map((l) => l.speaker)))
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>💬</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Dialogue Complete!</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
          {lines.length} of {lines.length} lines read
        </p>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Characters: {speakers.join(', ')}
        </p>
        <button
          onClick={resetGame}
          style={{
            marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)',
            border: 'none', background: 'var(--color-primary)', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          Play again
        </button>
      </motion.div>
    )
  }

  const speakers = Array.from(new Set(lines.map((l) => l.speaker)))
  const visible = lines.slice(0, shownCount)
  const isLastShown = shownCount >= lines.length

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <span>Line {shownCount} of {lines.length}</span>
        <span>💬 {speakers.length} character{speakers.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <AnimatePresence initial={false}>
          {visible.map((line, i) => {
            const colour = speakerColour(line.speaker, speakers)
            const speakerIdx = speakers.indexOf(line.speaker)
            const alignRight = speakerIdx % 2 === 1
            return (
              <motion.div
                key={`${i}-${line.speaker}-${line.text}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: alignRight ? 'flex-end' : 'flex-start',
                }}
              >
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  fontSize: '0.85rem', fontWeight: 700, color: colour.accent,
                  marginBottom: '0.25rem',
                }}>
                  <span aria-hidden="true" style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                    background: colour.bg, border: `2px solid ${colour.accent}`,
                    color: colour.accent, fontSize: '0.8rem',
                  }}>
                    {line.speaker.charAt(0).toUpperCase()}
                  </span>
                  {line.speaker}
                </span>
                <p style={{
                  margin: 0, padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)',
                  background: colour.bg, border: `1px solid ${colour.accent}33`,
                  color: 'var(--color-text-primary)', fontSize: '1.05rem', lineHeight: 1.5,
                  maxWidth: '85%', textAlign: 'left',
                }}>
                  {line.text}
                </p>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={next}
          style={{
            padding: '0.75rem 1.75rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: 'var(--color-primary)', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          {isLastShown ? 'Finish →' : 'Next line →'}
        </button>
      </div>
    </div>
  )
}
