'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL } from './shared'
import ScorePill from '@/components/game/ScorePill'
import { playGameSound, readSoundOn } from '@/lib/game-sound'

/**
 * Map Quiz — EduPlay's own proper map-point game, NOT a copy of any
 * rival: no rival art, wording, or audio. It is deliberately NOT
 * labelled-diagram (which stays as it is): labelled-diagram labels
 * parts of a diagram, while Map Quiz asks the player to FIND a named
 * place on a map by tapping it.
 *
 * Player-visible beats (v1, text + click only):
 * - One named point per screen: "Where is X?" The player taps the
 *   map; there is no typing of names in v1 (that is a later variant).
 * - A tap within CLICK_TOLERANCE_PCT percentage points of the point
 *   counts as correct; a tap further away counts as wrong and the
 *   correct point is shown briefly before moving on.
 * - Score is split 0-100 across points; the end screen shows score
 *   /100, points found, and "Play again".
 *
 * Honest image model (v1): EduPlay has no teacher image-upload
 * infrastructure in this batch, so the map image is a URL the teacher
 * pastes — their own or a CC-licensed image only, labelled that way
 * in the creator. If no URL is given (or the image fails to load),
 * the map area is a plain grid background and the game still plays
 * on percent coordinates. No image is ever invented or hotlinked
 * from a rival.
 *
 * Stability (the 2026-11-02 quiz lesson): the play page re-renders
 * every second for its elapsed timer. Points are therefore built
 * once per point CONTENT (fingerprint + ref guard), never on render,
 * so parent ticks can never reshuffle or reset a game in progress.
 * The advance timeout is held in a ref and cleared on unmount, and
 * onComplete fires exactly once per finished game.
 */

/** A tap within this many percentage points of the true point counts
 *  as correct. 8 is generous on purpose: on a small phone map a
 *  child's finger is wide, and the point is a place, not a pixel. */
export const CLICK_TOLERANCE_PCT = 8

export interface MapPoint {
  name: string
  x: number
  y: number
}

/** Parse a creator position string "x,y" in percent, e.g. "42,63".
 *  Accepts surrounding spaces and trailing % signs; anything else
 *  (missing numbers, out-of-range values) returns null so the point
 *  is dropped instead of being placed somewhere invented. */
export function parsePosition(value: string): { x: number; y: number } | null {
  const parts = value.split(',').map((p) => p.trim().replace(/%$/, ''))
  if (parts.length !== 2) return null
  const x = Number(parts[0])
  const y = Number(parts[1])
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  if (x < 0 || x > 100 || y < 0 || y > 100) return null
  return { x, y }
}

/** One item = one point: prompt is the point name, answer is the
 *  "x,y" percent position. Points with no name or no parseable
 *  position are dropped — a point without a place makes no sense. */
export function mapPointsFromItems(
  items: { prompt: string; answer: string }[],
): MapPoint[] {
  return items
    .map((i) => {
      const pos = parsePosition(i.answer ?? '')
      if (!i.prompt || !i.prompt.trim() || !pos) return null
      return { name: i.prompt.trim(), x: pos.x, y: pos.y }
    })
    .filter((p): p is MapPoint => p !== null)
}

/** Euclidean distance in percent coordinates, x and y weighted
 *  equally (the map box is treated as a 100x100 square). */
export function distancePct(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function isCorrectClick(
  click: { x: number; y: number },
  point: MapPoint,
): boolean {
  return distancePct(click, point) <= CLICK_TOLERANCE_PCT
}

type Feedback = { type: 'correct' | 'wrong'; msg: string } | null

interface ClickResult {
  clickX: number
  clickY: number
  correct: boolean
  targetX: number
  targetY: number
}

export default function MapQuizActivity({ items, locale, onComplete }: ActivityProps) {
  const [points, setPoints] = useState<MapPoint[]>([])
  const [mapImageUrl, setMapImageUrl] = useState('')
  const [imageFailed, setImageFailed] = useState(false)
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [results, setResults] = useState<ClickResult[]>([])
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [finished, setFinished] = useState(false)
  const [answered, setAnswered] = useState(false)

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
    if (advanceTimeoutRef.current) { clearTimeout(advanceTimeoutRef.current); advanceTimeoutRef.current = null }
    setPoints(mapPointsFromItems(items))
    // The map image is shared across points: the first item's
    // imageUrl (the creator's map-image field sets it on every item).
    const firstImage = items.find((i) => (i as { imageUrl?: string }).imageUrl)?.imageUrl ?? ''
    setMapImageUrl(firstImage)
    setImageFailed(false)
    resetGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsFingerprint, items])

  const currentRef = useRef(0)
  const scoreRef = useRef(0)
  const pointsRef = useRef<MapPoint[]>([])
  const correctRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { currentRef.current = current })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { pointsRef.current = points })
  useEffect(() => { correctRef.current = correctCount })
  useEffect(() => () => { if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current) }, [])

  function resetGame() {
    setCurrent(0)
    setScore(0)
    setCorrectCount(0)
    setResults([])
    setFeedback(null)
    setFinished(false)
    setAnswered(false)
    completedRef.current = false
  }

  function advance(finalScore: number, finalCorrect: number) {
    if (currentRef.current + 1 >= pointsRef.current.length) {
      setFinished(true)
      if (!completedRef.current) {
        completedRef.current = true
        // Preview already renders correctCount/totalCount when
        // details are present, so no Preview change is needed here
        // (the Riddle/AsterQuiz lesson, applied by design).
        onCompleteRef.current(finalScore, {
          correctCount: finalCorrect,
          totalCount: pointsRef.current.length,
        })
      }
    } else {
      setCurrent((c) => c + 1)
      setFeedback(null)
      setAnswered(false)
    }
  }

  function scheduleAdvance(finalScore: number) {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    advanceTimeoutRef.current = setTimeout(() => {
      advance(finalScore, correctRef.current)
    }, 1600)
  }

  const point = points[current]
  const pointsPerPoint = points.length > 0 ? 100 / points.length : 0
  const showImage = Boolean(mapImageUrl) && !imageFailed

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!point || answered) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const click = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
    const correct = isCorrectClick(click, point)
    const earned = correct ? Math.round(pointsPerPoint) : 0
    const newScore = score + earned
    setResults((r) => [...r, { clickX: click.x, clickY: click.y, correct, targetX: point.x, targetY: point.y }])
    setScore(newScore)
    if (correct) {
      setCorrectCount((c) => c + 1)
      correctRef.current = correctCount + 1
      setFeedback({ type: 'correct', msg: `✓ Found it! +${earned} points` })
    } else {
      setFeedback({ type: 'wrong', msg: `✗ Not quite — ${point.name} is here.` })
    }
    setAnswered(true)
    scheduleAdvance(newScore)
  }

  if (points.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>This map game has no points yet. Each point needs a name and an x,y position in percent.</p>
      </div>
    )
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>📍</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Map Complete!</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
          <ScorePill score={Math.round(score)} total={100} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {correctCount} of {points.length} points found
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

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <span>Point {current + 1} / {points.length}</span>
        <ScorePill score={Math.round(score)} total={100} />
        <span>Found: {correctCount}</span>
      </div>

      <div style={{
        padding: '1rem', borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)', border: '2px solid var(--color-border)',
        marginBottom: '1rem',
      }}>
        <p style={{ fontSize: '1.15rem', lineHeight: 1.5, color: 'var(--color-text-primary)', margin: 0 }}>
          Where is <strong>{point.name}</strong>?
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
          Tap the map where you think it is.
        </p>
      </div>

      <div
        data-testid="map-quiz-map"
        role="button"
        aria-label={`Map: tap where ${point.name} is`}
        onClick={handleMapClick}
        style={{
          position: 'relative', width: '100%', aspectRatio: '4 / 3',
          borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
          overflow: 'hidden', cursor: answered ? 'default' : 'crosshair',
          background: showImage
            ? 'var(--color-surface)'
            : 'repeating-linear-gradient(0deg, transparent, transparent 39px, var(--color-border) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, var(--color-border) 40px), var(--color-surface)',
        }}
      >
        {showImage && (
          <img
            src={mapImageUrl}
            alt=""
            onError={() => setImageFailed(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {results.map((r, i) => (
          <span key={i}>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', left: `${r.clickX}%`, top: `${r.clickY}%`,
                transform: 'translate(-50%, -50%)', fontSize: '1.5rem', lineHeight: 1,
              }}
            >
              {r.correct ? '✅' : '❌'}
            </span>
            {!r.correct && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute', left: `${r.targetX}%`, top: `${r.targetY}%`,
                  transform: 'translate(-50%, -50%)', fontSize: '1.5rem', lineHeight: 1,
                }}
              >
                📍
              </span>
            )}
          </span>
        ))}
      </div>
      {!showImage && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          No map image set — playing on a plain grid. Add your own or a CC-licensed map image URL in the creator to play on a real map.
        </p>
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
