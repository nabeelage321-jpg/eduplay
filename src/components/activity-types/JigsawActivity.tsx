'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, shuffleArray } from './shared'
import ScorePill from '@/components/game/ScorePill'
import { playGameSound, readSoundOn } from '@/lib/game-sound'

/**
 * Jigsaw Puzzle — EduPlay's own picture puzzle, NOT a copy of any
 * rival: no rival art, wording, or audio. Structure only follows the
 * shape every puzzle editor shares: a picture, sliced into pieces,
 * plus one learning layer at the end.
 *
 * Player-visible beats (v1):
 * - The player first picks a grid: Easy 2x2 or Normal 3x3 (default).
 *   Grid size is a PLAYER choice at the start, not a stored creator
 *   field: the activities save route whitelists only prompt / answer
 *   / hint / imageUrl, so a creator-stored grid size would be
 *   stripped on save. No API change is made in this batch.
 * - Pieces are slices of ONE image, cut with CSS background-position
 *   (no server processing). The image is a URL the teacher pastes —
 *   their own or a CC-licensed image only, labelled that way in the
 *   creator. With no URL (or a failed load) the puzzle uses a plain
 *   coloured gradient pattern sliced the same way, so the game still
 *   plays. No image is ever invented or hotlinked from a rival.
 * - Placing is click-to-place, NOT drag-only, so it works on phones
 *   and with a mouse: tap a piece in the tray, then tap its slot.
 *   A piece only sticks in its CORRECT slot; a wrong slot leaves it
 *   in the tray with a "not quite" note (no life loss — a jigsaw is
 *   low-stakes). Tapping a placed piece returns it to the tray.
 * - V1 learning layer is the FINAL QUESTION ONLY: one question
 *   about the picture (the first creator item: prompt = question,
 *   answer = answer), asked when every piece is placed. The player
 *   types the answer; after JIGSAW_FINAL_TRIES wrong tries the
 *   answer is shown and the game still completes. A question per
 *   piece (piece quiz) is a later batch, NOT v1.
 * - Score: 100 if the final answer is correct, 70 if the answer had
 *   to be shown (the puzzle itself was still completed). End screen
 *   shows score /100, pieces placed, the final-question result, and
 *   "Play again" (back to the grid choice, reshuffled).
 * - Sound is Web Audio tones, default muted, as with the other
 *   players.
 *
 * Stability (the 2026-11-02 quiz lesson): the play page re-renders
 * every second for its elapsed timer. The puzzle is therefore built
 * once per item CONTENT (fingerprint + ref guard), never on render,
 * so parent ticks can never reshuffle or reset a game in progress.
 * onComplete fires exactly once per finished game.
 */

/** Wrong final answers allowed before the answer is shown. */
export const JIGSAW_FINAL_TRIES = 3

/** Score when the puzzle is placed but the final answer had to be
 *  shown; a correct final answer scores the full 100. */
export const JIGSAW_SCORE_WITHOUT_FINAL = 70

export function normalizeFinalAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

export function isCorrectFinalAnswer(guess: string, answer: string): boolean {
  const g = normalizeFinalAnswer(guess)
  return g.length > 0 && g === normalizeFinalAnswer(answer)
}

export function jigsawFinalScore(finalCorrect: boolean): number {
  return finalCorrect ? 100 : JIGSAW_SCORE_WITHOUT_FINAL
}

export function isCorrectSlot(pieceIndex: number, slotIndex: number): boolean {
  return pieceIndex === slotIndex
}

/** Background position (percent) of one slice of a grid, so a piece
 *  shows exactly its own part of the whole picture or pattern. */
export function slicePosition(index: number, grid: number): { x: number; y: number } {
  if (grid <= 1) return { x: 0, y: 0 }
  const col = index % grid
  const row = Math.floor(index / grid)
  return { x: (col / (grid - 1)) * 100, y: (row / (grid - 1)) * 100 }
}

export interface JigsawConfig {
  imageUrl: string
  finalQuestion: string
  finalAnswer: string
}

/** One item = the final question: prompt is the question, answer is
 *  the answer, imageUrl (shared across items, as with Map Quiz) is
 *  the picture. Extra items are ignored in v1 — they are reserved
 *  for the later piece-quiz batch, not silently treated as extra
 *  final questions. */
export function jigsawConfigFromItems(
  items: { prompt: string; answer: string; imageUrl?: string }[],
): JigsawConfig {
  const imageUrl = items.find((i) => i.imageUrl)?.imageUrl ?? ''
  const final = items.find((i) => i.prompt && i.prompt.trim() && i.answer && i.answer.trim())
  return {
    imageUrl,
    finalQuestion: final?.prompt.trim() ?? '',
    finalAnswer: final?.answer.trim() ?? '',
  }
}

type Phase = 'choose' | 'placing' | 'final' | 'done'
type Feedback = { type: 'correct' | 'wrong'; msg: string } | null

const PATTERN =
  'linear-gradient(135deg, #f59e0b 0%, #ec4899 33%, #8b5cf6 66%, #06b6d4 100%)'

export default function JigsawActivity({ items, locale, onComplete }: ActivityProps) {
  const [config, setConfig] = useState<JigsawConfig>({ imageUrl: '', finalQuestion: '', finalAnswer: '' })
  const [imageFailed, setImageFailed] = useState(false)
  const [grid, setGrid] = useState(3)
  const [phase, setPhase] = useState<Phase>('choose')
  const [tray, setTray] = useState<number[]>([])
  const [placed, setPlaced] = useState<Record<number, number>>({})
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [finalGuess, setFinalGuess] = useState('')
  const [finalTries, setFinalTries] = useState(0)
  const [finalCorrect, setFinalCorrect] = useState<boolean | null>(null)
  const [finalShown, setFinalShown] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const rtl = isRTL(locale)

  useEffect(() => {
    if (feedback) playGameSound(feedback.type === 'correct' ? 'correct' : 'wrong', readSoundOn())
  }, [feedback])

  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}\u0000${(i as { imageUrl?: string }).imageUrl ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    setConfig(jigsawConfigFromItems(items))
    setImageFailed(false)
    resetGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsFingerprint, items])

  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const phaseRef = useRef<Phase>('choose')
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { phaseRef.current = phase })

  function resetGame() {
    setPhase('choose')
    setTray([])
    setPlaced({})
    setSelected(null)
    setFeedback(null)
    setFinalGuess('')
    setFinalTries(0)
    setFinalCorrect(null)
    setFinalShown(false)
    setScore(0)
    setFinished(false)
    completedRef.current = false
  }

  function startPuzzle(chosenGrid: number) {
    const total = chosenGrid * chosenGrid
    setGrid(chosenGrid)
    setTray(shuffleArray(Array.from({ length: total }, (_, i) => i)))
    setPlaced({})
    setSelected(null)
    setFeedback(null)
    setFinalGuess('')
    setFinalTries(0)
    setFinalCorrect(null)
    setFinalShown(false)
    setScore(0)
    setFinished(false)
    completedRef.current = false
    setPhase('placing')
  }

  const totalPieces = grid * grid
  const placedCount = Object.keys(placed).length
  const showImage = Boolean(config.imageUrl) && !imageFailed

  function pieceBackground(index: number): React.CSSProperties {
    const pos = slicePosition(index, grid)
    const size = `${grid * 100}% ${grid * 100}%`
    if (showImage) {
      return {
        backgroundImage: `url(${config.imageUrl})`,
        backgroundSize: size,
        backgroundPosition: `${pos.x}% ${pos.y}%`,
        backgroundRepeat: 'no-repeat',
      }
    }
    return {
      backgroundImage: PATTERN,
      backgroundSize: size,
      backgroundPosition: `${pos.x}% ${pos.y}%`,
      backgroundRepeat: 'no-repeat',
    }
  }

  function handleTrayPiece(piece: number) {
    setSelected((s) => (s === piece ? null : piece))
  }

  function handleSlot(slot: number) {
    // Tapping a placed piece returns it to the tray (undo).
    if (placed[slot] !== undefined) {
      const piece = placed[slot]
      setPlaced((p) => {
        const next = { ...p }
        delete next[slot]
        return next
      })
      setTray((t) => [...t, piece])
      setSelected(null)
      return
    }
    if (selected === null) return
    if (!isCorrectSlot(selected, slot)) {
      setFeedback({ type: 'wrong', msg: 'Not quite — that piece goes somewhere else.' })
      setSelected(null)
      return
    }
    const piece = selected
    const nextPlaced = { ...placed, [slot]: piece }
    setPlaced(nextPlaced)
    setTray((t) => t.filter((p) => p !== piece))
    setSelected(null)
    setFeedback({ type: 'correct', msg: '✓ Placed!' })
    if (Object.keys(nextPlaced).length >= totalPieces) {
      // Every piece is home. With no final question configured, the
      // puzzle alone completes at full marks; otherwise the final
      // question decides between 100 and 70.
      if (!config.finalQuestion || !config.finalAnswer) {
        finishPuzzle(true)
      } else {
        setPhase('final')
      }
    }
  }

  function finishPuzzle(correct: boolean) {
    const finalScore = jigsawFinalScore(correct)
    setScore(finalScore)
    setFinalCorrect(correct)
    setFinished(true)
    setPhase('done')
    if (!completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(finalScore, {
        correctCount: correct ? 1 : 0,
        totalCount: 1,
        piecesPlaced: totalPieces,
        totalPieces,
      })
    }
  }

  function checkFinalAnswer(e: React.FormEvent) {
    e.preventDefault()
    if (finalCorrect !== null) return
    if (isCorrectFinalAnswer(finalGuess, config.finalAnswer)) {
      setFeedback({ type: 'correct', msg: '✓ Correct!' })
      finishPuzzle(true)
    } else {
      const tries = finalTries + 1
      setFinalTries(tries)
      if (tries >= JIGSAW_FINAL_TRIES) {
        setFinalShown(true)
        setFeedback({ type: 'wrong', msg: `The answer was: ${config.finalAnswer}` })
      } else {
        setFeedback({ type: 'wrong', msg: `Not quite — try again (${JIGSAW_FINAL_TRIES - tries} ${JIGSAW_FINAL_TRIES - tries === 1 ? 'try' : 'tries'} left)` })
        setFinalGuess('')
      }
    }
  }

  if (phase === 'done' || finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🧩</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Puzzle Complete!</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
          <ScorePill score={Math.round(score)} total={100} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {totalPieces} of {totalPieces} pieces placed
          {config.finalQuestion && finalCorrect !== null && (
            <>{finalCorrect ? ' · Final question correct' : ' · Final question answer shown'}</>
          )}
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

  if (phase === 'final') {
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🧩</div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>Puzzle done — one last question!</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {totalPieces} of {totalPieces} pieces placed. Now answer this about the picture:
        </p>
        <p style={{ fontSize: '1.15rem', lineHeight: 1.5, color: 'var(--color-text-primary)' }}>{config.finalQuestion}</p>
        {!finalShown ? (
          <form onSubmit={checkFinalAnswer} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <label htmlFor="jigsaw-final-answer" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>Your answer</label>
            <input
              id="jigsaw-final-answer"
              data-testid="jigsaw-final-answer"
              value={finalGuess}
              onChange={(e) => setFinalGuess(e.target.value)}
              placeholder="Type your answer…"
              autoComplete="off"
              style={{
                flex: 1, padding: '0.75rem', fontSize: '1rem', borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
              }}
            />
            <button
              type="submit"
              disabled={!finalGuess.trim()}
              style={{
                padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)', border: 'none',
                background: 'var(--color-primary)', color: '#fff',
                fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
              }}
            >
              Check
            </button>
          </form>
        ) : (
          <button
            onClick={() => finishPuzzle(false)}
            style={{
              marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)',
              border: 'none', background: 'var(--color-primary)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            See my score
          </button>
        )}
        <AnimatePresence>
          {feedback && (
            <motion.p
              key={feedback.msg}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              aria-live="polite"
              style={{
                marginTop: '0.75rem', fontWeight: 700,
                color: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-text-primary)',
              }}
            >
              {feedback.msg}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }

  if (phase === 'choose') {
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🧩</div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>Jigsaw Puzzle</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Put the picture back together, piece by piece. Tap a piece, then tap where it goes.
        </p>
        {!config.finalQuestion && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            No final question set for this puzzle — it will complete as soon as every piece is placed.
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => startPuzzle(2)}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Easy · 2 × 2
          </button>
          <button
            onClick={() => startPuzzle(3)}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)',
              border: 'none', background: 'var(--color-primary)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Normal · 3 × 3
          </button>
        </div>
      </div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <span>{grid} × {grid} puzzle</span>
        <span>{placedCount} of {totalPieces} placed</span>
      </div>

      {showImage && (
        <img
          src={config.imageUrl}
          alt=""
          onError={() => setImageFailed(true)}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      )}

      <div
        data-testid="jigsaw-board"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${grid}, 1fr)`,
          gap: '2px',
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          background: 'var(--color-surface)',
        }}
      >
        {Array.from({ length: totalPieces }, (_, slot) => {
          const piece = placed[slot]
          return (
            <button
              key={slot}
              type="button"
              data-testid={`jigsaw-slot-${slot}`}
              aria-label={piece !== undefined ? `Placed piece, tap to return it to the tray` : `Empty slot ${slot + 1}, tap to place the selected piece here`}
              onClick={() => handleSlot(slot)}
              style={{
                position: 'relative', width: '100%', aspectRatio: '1 / 1',
                border: '2px dashed var(--color-border)', borderRadius: '4px',
                padding: 0, cursor: 'pointer', overflow: 'hidden',
                background: 'var(--color-surface)',
                ...(piece !== undefined ? pieceBackground(piece) : {}),
              }}
            >
              {piece === undefined && <span aria-hidden="true" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{slot + 1}</span>}
            </button>
          )
        })}
      </div>
      {!showImage && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          No picture set — playing on a coloured pattern. Add your own or a CC-licensed picture URL in the creator to play on a real picture.
        </p>
      )}

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
        {selected === null ? 'Tap a piece, then tap its slot.' : 'Piece selected — now tap its slot.'}
      </p>
      <div
        data-testid="jigsaw-tray"
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}
      >
        {tray.map((piece) => (
          <button
            key={piece}
            type="button"
            data-testid={`jigsaw-piece-${piece}`}
            aria-label={`Puzzle piece ${piece + 1}`}
            onClick={() => handleTrayPiece(piece)}
            style={{
              width: '72px', height: '72px', borderRadius: '8px', padding: 0, cursor: 'pointer',
              border: selected === piece ? '3px solid var(--color-primary)' : '2px solid var(--color-border)',
              overflow: 'hidden',
              ...pieceBackground(piece),
            }}
          />
        ))}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.p
            key={feedback.msg}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            aria-live="polite"
            style={{
              marginTop: '0.75rem', fontWeight: 700,
              color: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-text-primary)',
            }}
          >
            {feedback.msg}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
