'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL } from './shared'
import ScorePill from '@/components/game/ScorePill'
import { playGameSound, readSoundOn } from '@/lib/game-sound'

/**
 * Riddle — EduPlay's own typed-guess game, distinct from Quiz.
 *
 * NOT a copy of any rival: no rival art, wording, or audio. A riddle
 * here is a clue (the item's prompt) whose solution (the item's
 * answer) the player must TYPE, never pick from options. That is the
 * whole difference from Quiz: no options are shown at all.
 *
 * Player-visible beats (text riddles only in this batch; image/audio
 * hints are a later batch, not this one):
 * - One clue per screen. The player types a guess and taps Check.
 * - "Reveal a letter" reveals the next hidden letter of the solution,
 *   one at a time. Each letter costs 20% of that riddle's points, so
 *   a riddle solved with no hints is worth its full share of 100,
 *   and a riddle solved after hints is worth proportionally less.
 * - If the teacher wrote a clue hint (the item's `hint` field), a
 *   separate "Clue hint" button shows it. It is part of the clue, so
 *   it costs nothing — only letter reveals cost points.
 * - A wrong guess does NOT lose a life and does NOT advance: it
 *   shows "Not quite — try again", counts one attempt, and the player
 *   keeps guessing the same riddle. A "Skip" button moves on with
 *   0 points for that riddle and shows its solution first.
 * - End screen: total score out of 100, correct count, letter hints
 *   used, and "Play again".
 *
 * Stability (the 2026-11-02 quiz lesson): the play page re-renders
 * every second for its elapsed timer. Riddles are therefore built
 * once per question CONTENT (fingerprint + ref guard), never on
 * render, so parent ticks can never reshuffle or reset a game in
 * progress. The advance timeout is held in a ref and cleared on
 * unmount, and onComplete fires exactly once per finished game.
 */

/** One letter reveal costs this fraction of the riddle's points. */
export const RIDDLE_HINT_COST_FRACTION = 0.2

export interface RiddleItem {
  clue: string
  solution: string
  clueHint?: string
}

/** Normalise a typed guess and a solution the same way: case and
 *  spaces/punctuation are ignored, so "New York", "new york" and
 *  "newyork" all match. Letters from any alphabet are kept. */
export function normalizeGuess(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

export function isCorrectGuess(guess: string, solution: string): boolean {
  const g = normalizeGuess(guess)
  return g.length > 0 && g === normalizeGuess(solution)
}

/** Points for one riddle solved after `letterHints` letter reveals,
 *  when the riddle is worth `pointsPerRiddle` of the 100 total. */
export function riddlePoints(pointsPerRiddle: number, letterHints: number): number {
  const earned = pointsPerRiddle * (1 - RIDDLE_HINT_COST_FRACTION * letterHints)
  return Math.max(0, Math.round(earned))
}

/** Indices of the solution that may be revealed, in order: letters
 *  and digits only — spaces and punctuation are shown from the start. */
export function revealableIndices(solution: string): number[] {
  const out: number[] = []
  for (let i = 0; i < solution.length; i++) {
    if (/[\p{L}\p{N}]/u.test(solution[i])) out.push(i)
  }
  return out
}

type Feedback = { type: 'correct' | 'wrong' | 'skipped'; msg: string } | null

export default function RiddleActivity({ items, locale, onComplete }: ActivityProps) {
  const [riddles, setRiddles] = useState<RiddleItem[]>([])
  const [current, setCurrent] = useState(0)
  const [guess, setGuess] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [lettersRevealed, setLettersRevealed] = useState(0)
  const [totalLetterHints, setTotalLetterHints] = useState(0)
  const [showClueHint, setShowClueHint] = useState(false)
  const [finished, setFinished] = useState(false)
  const [answered, setAnswered] = useState(false)

  const rtl = isRTL(locale)

  useEffect(() => {
    if (feedback) playGameSound(feedback.type === 'correct' ? 'correct' : 'wrong', readSoundOn())
  }, [feedback])

  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}\u0000${i.hint ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    if (advanceTimeoutRef.current) { clearTimeout(advanceTimeoutRef.current); advanceTimeoutRef.current = null }
    const usable: RiddleItem[] = items
      .filter((i) => i.prompt && i.answer)
      .map((i) => ({ clue: i.prompt, solution: i.answer, clueHint: i.hint || undefined }))
    setRiddles(usable)
    resetGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsFingerprint, items])

  const currentRef = useRef(0)
  const scoreRef = useRef(0)
  const riddlesRef = useRef<RiddleItem[]>([])
  const correctRef = useRef(0)
  const totalLetterHintsRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { currentRef.current = current })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { riddlesRef.current = riddles })
  useEffect(() => { correctRef.current = correctCount })
  useEffect(() => { totalLetterHintsRef.current = totalLetterHints })
  useEffect(() => () => { if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current) }, [])

  function resetGame() {
    setCurrent(0)
    setGuess('')
    setFeedback(null)
    setScore(0)
    setCorrectCount(0)
    setAttempts(0)
    setLettersRevealed(0)
    setTotalLetterHints(0)
    totalLetterHintsRef.current = 0
    setShowClueHint(false)
    setFinished(false)
    setAnswered(false)
    completedRef.current = false
  }

  function advance(finalScore: number, finalCorrect: number) {
    if (currentRef.current + 1 >= riddlesRef.current.length) {
      setFinished(true)
      if (!completedRef.current) {
        completedRef.current = true
        // The Preview wrapper replaces the player with its own
        // completion screen on onComplete, so the player's own end
        // screen is never seen there — pass the detail through so
        // the wrapper can show score /100, correct count, and
        // letter hints used instead of a bare "Final score: 90".
        onCompleteRef.current(finalScore, {
          correctCount: finalCorrect,
          totalCount: riddlesRef.current.length,
          letterHintsUsed: totalLetterHintsRef.current,
        })
      }
    } else {
      setCurrent((c) => c + 1)
      setGuess('')
      setFeedback(null)
      setLettersRevealed(0)
      setShowClueHint(false)
      setAnswered(false)
    }
  }

  function scheduleAdvance(finalScore: number) {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    advanceTimeoutRef.current = setTimeout(() => {
      advance(finalScore, correctRef.current)
    }, 1400)
  }

  const riddle = riddles[current]
  const pointsPerRiddle = riddles.length > 0 ? 100 / riddles.length : 0

  function checkGuess(e: React.FormEvent) {
    e.preventDefault()
    if (!riddle || answered) return
    if (isCorrectGuess(guess, riddle.solution)) {
      const earned = riddlePoints(pointsPerRiddle, lettersRevealed)
      const newScore = score + earned
      setScore(newScore)
      setCorrectCount((c) => c + 1)
      correctRef.current = correctCount + 1
      setAnswered(true)
      setFeedback({ type: 'correct', msg: `Correct! +${earned} points` })
      scheduleAdvance(newScore)
    } else {
      setAttempts((a) => a + 1)
      setFeedback({ type: 'wrong', msg: 'Not quite — try again' })
      setGuess('')
    }
  }

  function revealLetter() {
    if (!riddle || answered) return
    const revealable = revealableIndices(riddle.solution)
    if (lettersRevealed >= revealable.length) return
    setLettersRevealed((n) => n + 1)
    setTotalLetterHints((n) => n + 1)
    totalLetterHintsRef.current += 1
  }

  function skipRiddle() {
    if (!riddle || answered) return
    setAnswered(true)
    setFeedback({ type: 'skipped', msg: `Skipped — the answer was: ${riddle.solution}` })
    scheduleAdvance(score)
  }

  if (riddles.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>This riddle game has no clues yet.</p>
      </div>
    )
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🧩</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Riddles Complete!</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
          <ScorePill score={Math.round(score)} total={100} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {correctCount} of {riddles.length} solved · {totalLetterHints} letter hints used · {attempts} wrong guesses
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

  const revealable = revealableIndices(riddle.solution)
  const revealedSet = new Set(revealable.slice(0, lettersRevealed))
  const solutionDisplay = riddle.solution.split('').map((ch, i) => {
    if (!/[\p{L}\p{N}]/u.test(ch)) return ch
    return revealedSet.has(i) ? ch : '_'
  }).join(' ')

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <span>Riddle {current + 1} / {riddles.length}</span>
        <ScorePill score={Math.round(score)} total={100} />
        <span>Wrong guesses: {attempts}</span>
      </div>

      <div style={{
        padding: '1.25rem', borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)', border: '2px solid var(--color-border)',
        marginBottom: '1rem',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧩</div>
        <p style={{ fontSize: '1.15rem', lineHeight: 1.5, color: 'var(--color-text-primary)' }}>{riddle.clue}</p>
        <p aria-label="Solution letters" style={{
          fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: '0.15em',
          marginTop: '0.75rem', color: 'var(--color-text-primary)',
        }}>
          {solutionDisplay}
        </p>
        {riddle.clueHint && showClueHint && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>💡 {riddle.clueHint}</p>
        )}
      </div>

      <form onSubmit={checkGuess} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <label htmlFor="riddle-guess" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>Your guess</label>
        <input
          id="riddle-guess"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          disabled={answered}
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
          disabled={answered || !guess.trim()}
          style={{
            padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: 'var(--color-primary)', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          Check
        </button>
      </form>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={revealLetter}
          disabled={answered || lettersRevealed >= revealable.length}
          style={{
            padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.9rem',
          }}
        >
          Reveal a letter (−20% points)
        </button>
        {riddle.clueHint && !showClueHint && (
          <button
            type="button"
            onClick={() => setShowClueHint(true)}
            disabled={answered}
            style={{
              padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            Clue hint
          </button>
        )}
        <button
          type="button"
          onClick={skipRiddle}
          disabled={answered}
          style={{
            padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.9rem',
          }}
        >
          Skip
        </button>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        {lettersRevealed} of {revealable.length} letters revealed · This riddle is worth {Math.round(pointsPerRiddle)} points
      </p>

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
            {feedback.type === 'correct' ? '✓ ' : feedback.type === 'skipped' ? '→ ' : '✗ '}
            {feedback.msg}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
