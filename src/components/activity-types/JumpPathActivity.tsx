'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { shuffleArray, isRTL } from './shared'
import ScorePill from '@/components/game/ScorePill'
import type { ActivityItem } from '@/types'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'

/**
 * Jump Path — EduPlay's own jump-along-the-path quiz.
 *
 * NOT a copy of any rival: no frog, no rival art, no rival audio.
 * The token on the path is EduPlay's own star helper (a plain star
 * glyph, drawn here in text — no image asset, no copied character),
 * and sounds are the shared interactive Web Audio system (synthesized,
 * no assets): jump on a correct answer, wrong buzz on a wrong one,
 * win/lose on finish, timer warning at 5 seconds. Sound is ON by
 * default for this game only; the in-player toggle mutes it in one
 * tap. Scoring, lives, timers, and win conditions are unchanged.
 *
 * Data: the same quiz Q&A items every quiz game uses — prompt,
 * answer, and the other items' answers as distractors. Text
 * questions only in this batch; audio/image questions are later.
 *
 * Player-visible beats:
 * - Setup before play: round size (subset of a larger pool),
 *   per-question timer (20s default, 10s/30s/off), lives
 *   (5 default, 3/unlimited), question order (in order/random).
 * - Path: one stone per round question. A correct answer earns
 *   the stone (✓) and points and the star jumps to the next stone;
 *   a wrong answer or a timeout marks the stone ✗, loses a life,
 *   and play moves to the next stone with no points.
 * - Score is split 0–100 across the round's questions.
 *
 * Stability (the 2026-11-02 quiz lesson): the play page re-renders
 * every second for its elapsed timer. Questions are therefore built
 * once per question CONTENT (fingerprint + ref guard), never on
 * render, and the round is built only when the player taps Start —
 * so parent ticks can never reshuffle a game in progress.
 */

interface JumpQuestion {
  prompt: string
  options: string[]
  correctIndex: number
}

const TIMER_OPTIONS = [
  { value: 20, label: '20 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 0, label: 'No timer' },
]

const LIVES_OPTIONS = [
  { value: 5, label: '5 lives' },
  { value: 3, label: '3 lives' },
  { value: 0, label: 'Unlimited lives' },
]

const ROUND_OPTIONS = [
  { value: 10, label: '10 questions' },
  { value: 5, label: '5 questions' },
  { value: 0, label: 'All questions' },
]

export default function JumpPathActivity({ items, locale, onComplete }: ActivityProps) {
  const [pool, setPool] = useState<JumpQuestion[]>([])
  const [started, setStarted] = useState(false)
  const [round, setRound] = useState<JumpQuestion[]>([])
  const [results, setResults] = useState<(boolean | null)[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [livesLeft, setLivesLeft] = useState<number | null>(5)
  const [timeLeft, setTimeLeft] = useState(20)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)

  // Setup choices (only shown before Start, never changed mid-round).
  const [timerSec, setTimerSec] = useState(20)
  const [livesSetting, setLivesSetting] = useState(5)
  const [roundSize, setRoundSize] = useState(10)
  const [randomOrder, setRandomOrder] = useState(false)

  const rtl = isRTL(locale)

  useEffect(() => {
    if (feedback) playEduSound(feedback.type === 'correct' ? 'jump' : 'wrong', readInteractiveSoundOn())
  }, [feedback])

  // Build the pool once per content fingerprint.
  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}\u0000${(i.answers ?? []).join(',')}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    if (advanceTimeoutRef.current) { clearTimeout(advanceTimeoutRef.current); advanceTimeoutRef.current = null }
    const usable = items.filter((i) => i.prompt && i.answer)
    const allAnswers = usable.map((i) => i.answer as string)
    const distinct = [...new Set(allAnswers)]
    const qs: JumpQuestion[] = usable.map((item) => {
      const wrong = shuffleArray(distinct.filter((a) => a !== item.answer)).slice(0, 3)
      const options = shuffleArray([item.answer as string, ...wrong])
      return { prompt: item.prompt, options, correctIndex: options.indexOf(item.answer) }
    })
    setPool(qs)
    setStarted(false)
    setRound([])
    setResults([])
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setLivesLeft(5)
    setTimeLeft(20)
    setFeedback(null)
    setFinished(false)
  }, [itemsFingerprint, items])

  // Refs mirror state so `advance` stays stable across play-page ticks
  // (same pattern as QuizActivity: a timeout carrying a stale score
  // used to lose the final question's points).
  const currentRef = useRef(0)
  const scoreRef = useRef(0)
  const livesRef = useRef<number | null>(5)
  const roundRef = useRef<JumpQuestion[]>([])
  const timerSecRef = useRef(20)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeUpRef = useRef(false)
  const lastTimerWarningRef = useRef(-1)
  const finishedSoundRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { currentRef.current = current })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = livesLeft })
  useEffect(() => { roundRef.current = round })
  useEffect(() => () => { if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current) }, [])

  const pointsPerQuestion = round.length > 0 ? 100 / round.length : 0

  const startGame = useCallback(() => {
    playEduSound('click', readInteractiveSoundOn())
    finishedSoundRef.current = false
    lastTimerWarningRef.current = -1
    timerSecRef.current = timerSec
    completedRef.current = false
    const ordered = randomOrder ? shuffleArray(pool) : [...pool]
    const picked = roundSize > 0 ? ordered.slice(0, roundSize) : ordered
    setRound(picked)
    setResults(picked.map(() => null))
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setLivesLeft(livesSetting === 0 ? null : livesSetting)
    setTimeLeft(timerSec)
    setFeedback(null)
    setFinished(false)
    setStarted(true)
    timeUpRef.current = false
  }, [pool, randomOrder, roundSize, livesSetting, timerSec])

  const advance = useCallback(() => {
    setSelected(null)
    setFeedback(null)
    setTimeLeft(timerSecRef.current)
    timeUpRef.current = false
    const qs = roundRef.current
    if (qs.length === 0) return
    const outOfLives = livesRef.current !== null && livesRef.current <= 0
    if (outOfLives || currentRef.current + 1 >= qs.length) {
      setFinished(true)
      if (!completedRef.current) {
        completedRef.current = true
        onCompleteRef.current(Math.round(scoreRef.current))
      }
    } else {
      setCurrent((c) => c + 1)
    }
  }, [])

  // Timer only counts down; time-up is a separate effect below, so no
  // side effects run inside a state updater.
  useEffect(() => {
    if (!started || selected !== null || finished || round.length === 0 || timerSecRef.current <= 0) return
    const id = setInterval(() => setTimeLeft((t) => (t > 1 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [started, selected, finished, round.length, current])

  useEffect(() => { timeUpRef.current = false }, [current])
  useEffect(() => {
    if (!started || timeLeft !== 0 || timerSecRef.current <= 0 || selected !== null || finished || round.length === 0 || timeUpRef.current) return
    timeUpRef.current = true
    setResults((r) => r.map((v, i) => (i === currentRef.current ? false : v)))
    if (livesRef.current !== null) setLivesLeft((l) => (l === null ? null : l - 1))
    setFeedback({ type: 'wrong', msg: "Time's up! You lose a life." })
    advanceTimeoutRef.current = setTimeout(advance, 1500)
  }, [timeLeft, started, selected, finished, round.length, advance])

  // Timer warning: one short warning when 5 seconds remain on a question.
  useEffect(() => {
    if (!started || finished || selected !== null || timerSecRef.current <= 0 || timeLeft !== 5) return
    if (lastTimerWarningRef.current === current) return
    lastTimerWarningRef.current = current
    playEduSound('timerWarning', readInteractiveSoundOn())
  }, [timeLeft, started, finished, selected, current])

  // Finish sound: win when the path ends with lives left (or unlimited),
  // lose when it ends because lives ran out. Sound only — no rule change.
  useEffect(() => {
    if (!finished || finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(livesLeft === 0 ? 'lose' : 'win', readInteractiveSoundOn())
  }, [finished, livesLeft])

  function handleSelect(idx: number) {
    if (selected !== null || finished) return
    playEduSound('click', readInteractiveSoundOn())
    const q = round[current]
    if (!q) return
    setSelected(idx)
    const correct = idx === q.correctIndex
    setResults((r) => r.map((v, i) => (i === current ? correct : v)))
    if (correct) {
      setScore((s) => s + pointsPerQuestion)
      setFeedback({ type: 'correct', msg: 'Jump! The star moves forward.' })
    } else {
      if (livesRef.current !== null) setLivesLeft((l) => (l === null ? null : l - 1))
      setFeedback({ type: 'wrong', msg: `Not quite — the answer was: ${q.options[q.correctIndex]}. You lose a life.` })
    }
    advanceTimeoutRef.current = setTimeout(advance, 1500)
  }

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    finishedSoundRef.current = false
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    setStarted(false)
    setRound([])
    setResults([])
    setCurrent(0)
    setSelected(null)
    setScore(0)
    setLivesLeft(livesSetting === 0 ? null : livesSetting)
    setTimeLeft(timerSec)
    setFeedback(null)
    setFinished(false)
    completedRef.current = false
  }

  if (pool.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)',
    border: '2px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.95rem',
  }

  // ---- Setup screen: the adjustable beats, visible before play. ----
  if (!started) {
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', color: 'var(--color-text-primary)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">⭐</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>Jump Path</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Answer questions to jump the star along the path. A wrong answer loses a life.
            Score is out of 100 across the whole path.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          <label style={{ fontSize: '0.9rem' }}>
            Questions in this path
            <select aria-label="Questions in this path" value={roundSize} onChange={(e) => setRoundSize(Number(e.target.value))} style={{ ...selectStyle, marginTop: '0.35rem' }}>
              {ROUND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}{pool.length > 0 && o.value > 0 ? ` (of ${pool.length})` : ''}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: '0.9rem' }}>
            Time per question
            <select aria-label="Time per question" value={timerSec} onChange={(e) => setTimerSec(Number(e.target.value))} style={{ ...selectStyle, marginTop: '0.35rem' }}>
              {TIMER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label style={{ fontSize: '0.9rem' }}>
            Lives
            <select aria-label="Lives" value={livesSetting} onChange={(e) => setLivesSetting(Number(e.target.value))} style={{ ...selectStyle, marginTop: '0.35rem' }}>
              {LIVES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={randomOrder} onChange={(e) => setRandomOrder(e.target.checked)} aria-label="Random question order" />
            Random question order
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-end', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            Sound <InteractiveSoundToggle />
          </div>
          <button
            onClick={startGame}
            style={{
              padding: '0.9rem', borderRadius: 'var(--radius-lg)', border: 'none',
              background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)',
              fontSize: '1.05rem', cursor: 'pointer',
            }}
          >
            Start jumping
          </button>
        </div>
      </div>
    )
  }

  // ---- End screen ----
  if (finished) {
    const correctCount = results.filter(Boolean).length
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">⭐</div>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Path Complete!</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={Math.round(score)} total={100} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} correct out of {round.length} questions
          {livesLeft !== null ? ` · ${livesLeft} ${livesLeft === 1 ? 'life' : 'lives'} left` : ' · unlimited lives'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
          <InteractiveSoundToggle />
        </div>
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

  const q = round[current]
  if (!q) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }
  const timerOn = timerSecRef.current > 0
  const timerPct = timerOn ? (timeLeft / timerSecRef.current) * 100 : 100

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <ScorePill score={Math.round(score)} total={100} />
        <span aria-live="polite">{livesLeft === null ? '∞ lives' : `${'❤️'.repeat(Math.max(0, livesLeft))} ${livesLeft} ${livesLeft === 1 ? 'life' : 'lives'}`}</span>
        {timerOn && <span aria-live="polite" aria-label={`${timeLeft} seconds remaining`}>{timeLeft}s</span>}
        {!timerOn && <span>No timer</span>}
        <InteractiveSoundToggle />
      </div>

      {/* The path: one stone per question; the star sits on the current stone. */}
      <div style={{ marginBottom: '1.25rem' }} aria-label={`Star helper is on stone ${current + 1} of ${round.length}`}>
        {feedback?.type === 'correct' && (
          <motion.div key={`jump-arc-${current}`} initial={{ x: -48, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: [-48, 0, 48], y: [0, -40, 0], scale: [1, 1.35, 1], opacity: [1, 1, 0] }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            aria-hidden="true"
            style={{ textAlign: 'center', fontSize: '1.75rem', lineHeight: 1, pointerEvents: 'none' }}>
            ⭐ Jump!
          </motion.div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', alignItems: 'flex-end' }}>
          {round.map((_, i) => {
            const isCurrent = i === current
            const result = results[i]
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '2.5rem' }}>
                <div style={{ height: '1.5rem', fontSize: '1.25rem', lineHeight: 1 }} aria-hidden="true">
                  {isCurrent ? '⭐' : ''}
                </div>
                <div style={{
                  width: '2.25rem', height: '2.25rem', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 700,
                  background: result === true ? 'var(--color-success)' : result === false ? 'var(--color-danger)' : isCurrent ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: result !== null || isCurrent ? '#fff' : 'var(--color-text-muted)',
                  border: `2px solid ${isCurrent ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}>
                  {result === true ? '✓' : result === false ? '✗' : i + 1}
                </div>
              </div>
            )
          })}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
          Question {current + 1} of {round.length} · ⭐ Star helper
        </p>
      </div>

      {timerOn && (
        <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: 'var(--radius)', marginBottom: '1.25rem' }}>
          <motion.div style={{
            height: '100%', borderRadius: 'var(--radius)',
            background: timerPct > 50 ? 'var(--color-success)' : timerPct > 20 ? 'var(--color-warning)' : 'var(--color-danger)',
          }} animate={{ width: `${timerPct}%` }} transition={{ duration: 1, ease: 'linear' }} />
        </div>
      )}

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
          <motion.div animate={{ x: feedback?.type === 'wrong' ? [0, -10, 10, -6, 6, 0] : 0 }} transition={{ duration: 0.4 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
          </motion.div>
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
