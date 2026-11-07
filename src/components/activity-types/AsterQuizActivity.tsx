'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { shuffleArray, isRTL } from './shared'
import ScorePill from '@/components/game/ScorePill'
import { playGameSound, readSoundOn } from '@/lib/game-sound'

/**
 * AsterQuiz — EduPlay's own space-run quiz skin.
 *
 * Structure only, from the rival's editor pattern: quiz content —
 * question wording, one correct answer, wrong answers, optional
 * explanation — with the space run as a play skin, not a new data
 * model. No rival art, wording, or audio is copied: the ship is a
 * plain rocket glyph, the asteroids are plain rock glyphs, and
 * sounds are the same Web Audio tones every other EduPlay game
 * uses (default muted; the play-page sound button turns them on).
 *
 * Data: the same quiz Q&A items every quiz game uses — prompt,
 * answer, and the other items' answers as distractors. This is the
 * same reuse Jump Path does, so creator prompt/answer rows and
 * quiz-shaped programme rows play here with no new content model.
 * Text questions only in this batch; single answer only (the
 * multiple-answer quiz upgrade is a later batch).
 *
 * Player-visible beats:
 * - A space track: one asteroid per question. The ship sits on the
 *   current asteroid; a correct answer clears it (✓) and the ship
 *   flies to the next one; a wrong answer hits the ship (✗) and
 *   costs one of 5 lives.
 * - Score is split 0–100 across the questions. Running out of
 *   lives ends the run early, with the questions left unplayed
 *   counting as not correct.
 * - End screen: score /100, correct count, lives left, Play again.
 *
 * Stability (the 2026-11-02 quiz lesson): the play page re-renders
 * every second for its elapsed timer. Questions are therefore built
 * once per question CONTENT (fingerprint + ref guard), never on
 * render, and advance uses refs so the final question's points can
 * never be lost to a stale timeout closure.
 */

interface AsterQuestion {
  prompt: string
  options: string[]
  correctIndex: number
  explanation?: string
}

const DEFAULT_LIVES = 5

export default function AsterQuizActivity({ items, locale, onComplete }: ActivityProps) {
  const [questions, setQuestions] = useState<AsterQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [livesLeft, setLivesLeft] = useState(DEFAULT_LIVES)
  const [results, setResults] = useState<(boolean | null)[]>([])
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)

  const rtl = isRTL(locale)

  useEffect(() => {
    if (feedback) playGameSound(feedback.type, readSoundOn())
  }, [feedback])

  // Build questions once per content fingerprint.
  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}\u0000${(i.answers ?? []).join(',')}\u0000${i.hint ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    if (advanceTimeoutRef.current) { clearTimeout(advanceTimeoutRef.current); advanceTimeoutRef.current = null }
    const usable = items.filter((i) => i.prompt && i.answer)
    const allAnswers = usable.map((i) => i.answer as string)
    const distinct = [...new Set(allAnswers)]
    const qs: AsterQuestion[] = usable.map((item) => {
      const wrong = shuffleArray(distinct.filter((a) => a !== item.answer)).slice(0, 3)
      const options = shuffleArray([item.answer as string, ...wrong])
      return {
        prompt: item.prompt,
        options,
        correctIndex: options.indexOf(item.answer),
        explanation: item.hint || undefined,
      }
    })
    setQuestions(qs)
    setResults(qs.map(() => null))
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setLivesLeft(DEFAULT_LIVES)
    setFeedback(null)
    setFinished(false)
  }, [itemsFingerprint, items])

  // Refs mirror state so `advance` stays stable across play-page ticks.
  const currentRef = useRef(0)
  const scoreRef = useRef(0)
  const livesRef = useRef(DEFAULT_LIVES)
  const questionsRef = useRef<AsterQuestion[]>([])
  const resultsRef = useRef<(boolean | null)[]>([])
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { currentRef.current = current })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = livesLeft })
  useEffect(() => { questionsRef.current = questions })
  useEffect(() => { resultsRef.current = results })
  useEffect(() => () => { if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current) }, [])

  const pointsPerQuestion = questions.length > 0 ? 100 / questions.length : 0

  const advance = useCallback(() => {
    setSelected(null)
    setFeedback(null)
    const qs = questionsRef.current
    if (qs.length === 0) return
    const outOfLives = livesRef.current <= 0
    if (outOfLives || currentRef.current + 1 >= qs.length) {
      setFinished(true)
      if (!completedRef.current) {
        completedRef.current = true
        // Preview detail (same pattern as Riddle): the Create Preview
        // flow replaces the player end screen with its own completion
        // screen, so pass the totals through onComplete or they are
        // never visible in Preview. Play itself is unchanged.
        onCompleteRef.current(Math.round(scoreRef.current), {
          correctCount: resultsRef.current.filter(Boolean).length,
          totalCount: qs.length,
          livesLeft: livesRef.current,
        })
      }
    } else {
      setCurrent((c) => c + 1)
    }
  }, [])

  function handleSelect(idx: number) {
    if (selected !== null || finished) return
    const q = questions[current]
    if (!q) return
    setSelected(idx)
    const correct = idx === q.correctIndex
    setResults((r) => r.map((v, i) => (i === current ? correct : v)))
    if (correct) {
      setScore((s) => s + pointsPerQuestion)
      setFeedback({ type: 'correct', msg: 'Direct hit! The ship flies on.' })
    } else {
      setLivesLeft((l) => l - 1)
      setFeedback({
        type: 'wrong',
        msg: `Asteroid hit — the answer was: ${q.options[q.correctIndex]}. You lose a life.`,
      })
    }
    advanceTimeoutRef.current = setTimeout(advance, 1500)
  }

  function playAgain() {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setLivesLeft(DEFAULT_LIVES)
    setResults(questions.map(() => null))
    setFeedback(null)
    setFinished(false)
    completedRef.current = false
  }

  if (questions.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  // ---- End screen ----
  if (finished) {
    const correctCount = results.filter(Boolean).length
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">🚀</div>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Asteroid Run Complete!</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={Math.round(score)} total={100} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} correct out of {questions.length} questions
          {` · ${livesLeft} ${livesLeft === 1 ? 'life' : 'lives'} left`}
        </p>
        <button
          onClick={playAgain}
          style={{
            marginTop: '1.25rem', padding: '0.8rem 1.5rem', borderRadius: 'var(--radius-lg)',
            border: 'none', background: 'var(--color-primary)', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          Play again
        </button>
      </motion.div>
    )
  }

  const q = questions[current]
  if (!q) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <ScorePill score={Math.round(score)} total={100} />
        <span aria-live="polite">{'❤️'.repeat(Math.max(0, livesLeft))} {livesLeft} {livesLeft === 1 ? 'life' : 'lives'}</span>
      </div>

      {/* The asteroid field: one asteroid per question; the ship sits on the current one. */}
      <div style={{ marginBottom: '1.25rem' }} aria-label={`Ship is at asteroid ${current + 1} of ${questions.length}`}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', alignItems: 'flex-end' }}>
          {questions.map((_, i) => {
            const isCurrent = i === current
            const result = results[i]
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '2.5rem' }}>
                <div style={{ height: '1.5rem', fontSize: '1.25rem', lineHeight: 1 }} aria-hidden="true">
                  {isCurrent ? '🚀' : ''}
                </div>
                <div style={{
                  width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 700,
                  background: result === true ? 'var(--color-success)' : result === false ? 'var(--color-danger)' : isCurrent ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: result !== null || isCurrent ? '#fff' : 'var(--color-text-muted)',
                  border: `2px solid ${isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}>
                  {result === true ? '✓' : result === false ? '✗' : '🪨'}
                </div>
              </div>
            )
          })}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
          Question {current + 1} of {questions.length} · 🚀 Space run
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ x: rtl ? -40 : 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }} exit={{ x: rtl ? 40 : -40, opacity: 0 }} transition={{ duration: 0.25 }}>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.25rem',
            color: 'var(--color-text-primary)', fontSize: '1.125rem',
            fontFamily: 'var(--font-display)', boxShadow: 'var(--shadow-card)',
          }}>
            {q.prompt}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {q.options.map((opt, idx) => {
              let bg = 'var(--color-surface)'
              let border = 'var(--color-border)'
              let color = 'var(--color-text-primary)'
              if (selected !== null) {
                if (idx === q.correctIndex) { bg = 'var(--color-success)'; border = 'var(--color-success)'; color = '#fff' }
                else if (idx === selected) { bg = 'var(--color-danger)'; border = 'var(--color-danger)'; color = '#fff' }
              }
              return (
                <motion.button key={idx} onClick={() => handleSelect(idx)}
                  whileHover={selected === null ? { scale: 1.02 } : {}}
                  whileTap={selected === null ? { scale: 0.98 } : {}}
                  aria-pressed={selected === idx} aria-label={`Option ${idx + 1}: ${opt}`}
                  style={{
                    background: bg, border: `2px solid ${border}`, borderRadius: 'var(--radius)',
                    padding: '0.875rem 1rem', color, fontSize: '0.95rem',
                    cursor: selected !== null ? 'default' : 'pointer',
                    textAlign: rtl ? 'right' : 'left',
                    transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {opt}
                </motion.button>
              )
            })}
          </div>
          {selected !== null && q.explanation && (
            <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
              {q.explanation}
            </p>
          )}
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
            {feedback.type === 'correct' ? '🚀 ' : '❌ '}{feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
