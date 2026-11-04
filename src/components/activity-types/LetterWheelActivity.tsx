'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL } from './shared'
import type { ActivityItem } from '@/types'
import { playGameSound, readSoundOn } from '@/lib/game-sound'

/**
 * Letter Wheel — EduPlay's own letter-wheel word game.
 *
 * NOT a copy of any rival: no rival art, wording, or layout. The
 * wheel is EduPlay's own ring of letter circles, and sounds are the
 * same Web Audio tones every other EduPlay game uses (default
 * muted; the play-page sound button turns them on).
 *
 * Data: the standard creator item shape — prompt = definition,
 * answer = word. No new save path was needed: the save route
 * already stores prompt/answer/hint for every type, and the
 * adapter passes creator rows through untouched.
 *
 * Player-visible beats:
 * - How to Play FIRST, before any play, explaining how to play,
 *   how scores are given, the objective, the controls, the
 *   letters, the timer position, and how you win/finish — with a
 *   Skip button that starts play straight away. The same page is
 *   reachable again mid-game from the "How to play" button, and
 *   returning from it resumes the game; it never resets progress.
 * - One letter per definition. The wheel letter is the first
 *   letter of the answer — unless the definition itself states a
 *   letter ("...the letter X..."), in which case that stated
 *   letter is the wheel letter and the word contains it. Either
 *   way the typed word is checked against the creator's answer
 *   (case/punctuation-tolerant, as in Riddle), never invented.
 * - Type the word and press Check (or Enter). A wrong guess
 *   loses no points and does not move you on — try again, or
 *   skip the letter and come back to it later. After 3 wrong
 *   guesses on one letter you may reveal its answer; a revealed
 *   letter earns 0 points for that letter and counts as missed.
 * - Score is split 0–100 across the wheel's letters (100 ÷
 *   letter count, the same pattern as Jump Path's 100 ÷ round
 *   size). No timer in this version — take your time.
 * - Finish: every letter answered or revealed. The end screen
 *   shows score /100, letters correct, letters skipped, and
 *   letters missed.
 *
 * Stability (the 2026-11-02 quiz lesson): letters are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface WheelLetter {
  prompt: string
  answer: string
  letter: string
  contains: boolean
}

/** Case/punctuation-tolerant comparison, as in Riddle. */
export function normalizeWheelWord(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

/**
 * The wheel letter for one item. If the definition itself states a
 * letter ("...containing the letter X...", "...the letter X..."),
 * that stated letter wins and the word contains it. Otherwise the
 * word starts with the first letter of the answer. Returns null
 * when neither yields a letter, and the item is dropped.
 */
export function wheelLetterFor(item: ActivityItem): { letter: string; contains: boolean } | null {
  const stated = item.prompt.match(/letter\s+([A-Za-z])/i)
  if (stated) return { letter: stated[1].toUpperCase(), contains: true }
  const first = item.answer.match(/\p{L}/u)
  if (!first) return null
  return { letter: first[0].toUpperCase(), contains: false }
}

export default function LetterWheelActivity({ items, locale, onComplete }: ActivityProps) {
  const [letters, setLetters] = useState<WheelLetter[]>([])
  const [showHowto, setShowHowto] = useState(true)
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [typed, setTyped] = useState('')
  const [results, setResults] = useState<(boolean | null)[]>([])
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  const [wrongOnLetter, setWrongOnLetter] = useState(0)
  const [wrongTotal, setWrongTotal] = useState(0)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)

  const rtl = isRTL(locale)

  useEffect(() => {
    if (feedback) playGameSound(feedback.type, readSoundOn())
  }, [feedback])

  // Build the wheel once per content fingerprint.
  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    const built: WheelLetter[] = []
    for (const item of items) {
      if (!item.prompt || !item.answer) continue
      const wl = wheelLetterFor(item)
      if (!wl) continue
      built.push({ prompt: item.prompt, answer: item.answer, letter: wl.letter, contains: wl.contains })
    }
    setLetters(built)
    setShowHowto(true)
    setStarted(false)
    setCurrent(0)
    setTyped('')
    setResults(built.map(() => null))
    setSkipped(new Set())
    setWrongOnLetter(0)
    setWrongTotal(0)
    setScore(0)
    setFeedback(null)
    setFinished(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const resultsRef = useRef<(boolean | null)[]>([])
  const skippedRef = useRef<Set<number>>(new Set())
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { resultsRef.current = results })

  const pointsPerLetter = letters.length > 0 ? 100 / letters.length : 0

  /** First unanswered letter after `from`, wrapping around; -1 when none. */
  const nextUnanswered = useCallback((from: number): number => {
    const res = resultsRef.current
    for (let i = from + 1; i < res.length; i++) if (res[i] === null) return i
    for (let i = 0; i <= from; i++) if (res[i] === null) return i
    return -1
  }, [])

  const finishGame = useCallback(() => {
    setFinished(true)
    if (!completedRef.current) {
      completedRef.current = true
      const res = resultsRef.current
      onCompleteRef.current(Math.round(scoreRef.current), {
        correctCount: res.filter((r) => r === true).length,
        totalCount: res.length,
        skippedCount: [...skippedRef.current].filter((i) => res[i] === true).length,
        missedCount: res.filter((r) => r === false).length,
      })
    }
  }, [])

  useEffect(() => { skippedRef.current = skipped }, [skipped])

  const advanceFrom = useCallback((from: number) => {
    setTyped('')
    setWrongOnLetter(0)
    setFeedback(null)
    const next = nextUnanswered(from)
    if (next === -1) {
      finishGame()
    } else {
      setCurrent(next)
    }
  }, [nextUnanswered, finishGame])

  function startPlaying() {
    completedRef.current = false
    setShowHowto(false)
    setStarted(true)
  }

  function handleCheck() {
    if (finished || showHowto) return
    const slot = letters[current]
    if (!slot) return
    const guess = normalizeWheelWord(typed)
    if (guess.length === 0) {
      setFeedback({ type: 'wrong', msg: 'Type a word first.' })
      return
    }
    if (guess === normalizeWheelWord(slot.answer)) {
      setResults((r) => r.map((v, i) => (i === current ? true : v)))
      setScore((s) => s + pointsPerLetter)
      setFeedback({ type: 'correct', msg: `Correct! +${Math.round(pointsPerLetter)} points.` })
      // Advance after a beat so the player sees the feedback.
      const from = current
      setTimeout(() => advanceFrom(from), 1200)
    } else {
      setWrongOnLetter((w) => w + 1)
      setWrongTotal((w) => w + 1)
      setFeedback({
        type: 'wrong',
        msg: wrongOnLetter + 1 >= 3
          ? 'Not quite — you may reveal this answer, or keep trying.'
          : 'Not quite — try again, or skip this letter and come back later.',
      })
    }
  }

  function handleSkipLetter() {
    if (finished || showHowto) return
    setSkipped((s) => new Set(s).add(current))
    setFeedback(null)
    advanceFrom(current)
  }

  function handleReveal() {
    if (finished || showHowto) return
    const slot = letters[current]
    if (!slot) return
    setResults((r) => r.map((v, i) => (i === current ? false : v)))
    setFeedback({ type: 'wrong', msg: `The answer was: ${slot.answer}. No points for this letter.` })
    const from = current
    setTimeout(() => advanceFrom(from), 1600)
  }

  function playAgain() {
    setShowHowto(true)
    setStarted(false)
    setCurrent(0)
    setTyped('')
    setResults(letters.map(() => null))
    setSkipped(new Set())
    setWrongOnLetter(0)
    setWrongTotal(0)
    setScore(0)
    setFeedback(null)
    setFinished(false)
    completedRef.current = false
  }

  if (letters.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  const correctCount = results.filter((r) => r === true).length
  const missedCount = results.filter((r) => r === false).length
  const skippedAnsweredCount = [...skipped].filter((i) => results[i] === true).length

  // ---- How to Play: FIRST, before play, and re-readable mid-game. ----
  if (showHowto) {
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', color: 'var(--color-text-primary)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🔠</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Letter Wheel</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            One definition per letter. Type the word, complete the whole wheel.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> the wheel shows {letters.length} {letters.length === 1 ? 'letter' : 'letters'}. Each letter has one definition. Read the definition, type the word that fits it in the box, and press Check (or Enter).</p>
          <p><strong>How scores are given:</strong> the game is scored out of 100, split equally across the wheel&apos;s letters — each correct letter earns {Math.round(pointsPerLetter)} points. A wrong guess loses no points. A letter you reveal after 3 wrong guesses earns 0 points for that letter.</p>
          <p><strong>Objective:</strong> complete the whole wheel — every letter answered or revealed.</p>
          <p><strong>Controls:</strong> type in the answer box, Check (or Enter) to submit, Skip letter to come back to it later, and this How to play button to re-read these instructions at any time.</p>
          <p><strong>Letters:</strong> the word starts with the wheel letter — unless the definition says the letter is inside the word, in which case the word contains that letter. Skipped letters come back around at the end, so nothing is lost by skipping.</p>
          <p><strong>Timer:</strong> there is no timer in this version — take your time on each letter.</p>
          <p><strong>How you win and finish:</strong> the game finishes when every letter is answered or revealed. The end screen shows your score out of 100, how many letters you got right, how many you skipped, and how many you missed.</p>
        </div>
        <button
          onClick={startPlaying}
          style={{
            marginTop: '1.25rem', width: '100%', padding: '0.9rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)',
            fontSize: '1.05rem', cursor: 'pointer',
          }}
        >
          {started ? 'Back to game' : 'Skip instructions — start playing'}
        </button>
        {!started && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.6rem' }}>
            You can re-read this page any time from the &ldquo;How to play&rdquo; button during the game.
          </p>
        )}
      </div>
    )
  }

  // ---- End screen ----
  if (finished) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">🔠</div>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Wheel Complete!</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          Score: {Math.round(score)} / 100
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {letters.length} letters correct
          {` · ${skippedAnsweredCount} ${skippedAnsweredCount === 1 ? 'letter' : 'letters'} skipped`}
          {` · ${missedCount} missed`}
          {` · ${wrongTotal} wrong ${wrongTotal === 1 ? 'guess' : 'guesses'}`}
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowHowto(true)}
            style={{
              padding: '0.8rem 1.25rem', borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            How to play
          </button>
          <button
            onClick={playAgain}
            style={{
              padding: '0.8rem 1.5rem', borderRadius: 'var(--radius-lg)',
              border: 'none', background: 'var(--color-primary)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Play again
          </button>
        </div>
      </motion.div>
    )
  }

  const slot = letters[current]
  if (!slot) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <span aria-live="polite">Score: <strong style={{ color: 'var(--color-primary)' }}>{Math.round(score)} / 100</strong></span>
        <span aria-live="polite">{correctCount} of {letters.length} letters correct</span>
        <button
          onClick={() => setShowHowto(true)}
          style={{
            padding: '0.35rem 0.7rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          How to play
        </button>
      </div>

      {/* The wheel: one circle per letter; the current letter is highlighted. */}
      <div style={{ marginBottom: '1.25rem' }} aria-label={`Letter wheel, letter ${current + 1} of ${letters.length}: ${slot.letter}`}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
          {letters.map((l, i) => {
            const isCurrent = i === current
            const result = results[i]
            return (
              <div key={i} style={{
                width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.95rem', fontWeight: 700,
                background: result === true ? 'var(--color-success)' : result === false ? 'var(--color-danger)' : isCurrent ? 'var(--color-primary)' : 'var(--color-surface)',
                color: result !== null || isCurrent ? '#fff' : 'var(--color-text-muted)',
                border: `2px solid ${isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
              }}
              aria-label={result === true ? `Letter ${l.letter}: correct` : result === false ? `Letter ${l.letter}: missed` : `Letter ${l.letter}`}>
                {result === true ? '✓' : result === false ? '✗' : l.letter}
              </div>
            )
          })}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
          Letter {current + 1} of {letters.length}
          {skipped.has(current) ? ' · skipped before, back again' : ''}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ x: rtl ? -40 : 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }} exit={{ x: rtl ? 40 : -40, opacity: 0 }} transition={{ duration: 0.25 }}>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1rem',
            color: 'var(--color-text-primary)', textAlign: 'center', boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{
              fontSize: '2.5rem', fontFamily: 'var(--font-display)', color: 'var(--color-primary)', lineHeight: 1.2,
            }}>
              {slot.letter}
            </div>
            <p style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', marginTop: '0.5rem' }}>
              {slot.prompt}
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
              {slot.contains
                ? `Type a word containing the letter ${slot.letter}.`
                : `Type a word starting with the letter ${slot.letter}.`}
            </p>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); handleCheck() }}
            style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}
          >
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={`Word for ${slot.letter}…`}
              aria-label={`Word for letter ${slot.letter}`}
              autoFocus
              style={{
                flex: 1, minWidth: '10rem', padding: '0.875rem 1rem', borderRadius: 'var(--radius)',
                border: '2px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text-primary)', fontSize: '1rem', fontFamily: 'var(--font-body)',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '0.875rem 1.5rem', borderRadius: 'var(--radius)', border: 'none',
                background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)',
                fontSize: '1rem', cursor: 'pointer',
              }}
            >
              Check
            </button>
          </form>
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSkipLetter}
              style={{
                padding: '0.6rem 1rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)',
                background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              Skip this letter
            </button>
            {wrongOnLetter >= 3 && (
              <button
                type="button"
                onClick={handleReveal}
                style={{
                  padding: '0.6rem 1rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)',
                  background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '0.9rem', cursor: 'pointer',
                }}
              >
                Reveal answer (0 points)
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              marginTop: '1rem', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem',
            }}>
            {feedback.type === 'correct' ? '⭐ ' : '❌ '}{feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
