'use client'

import { useState, useEffect, useRef } from 'react'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, isRTL } from './shared'

const SECONDS_PER_ITEM = 30

/**
 * Batch 1 — Typing Race (preview/activity component).
 * Type the answer for the shown prompt before the 30-second timer ends
 * (the QuizGame timer pattern). A streak of 3+ correct answers in a row
 * adds a +5 streak bonus per answer on top of the 10 base points.
 */
export default function TypingRaceActivity({ items, locale, onComplete }: ActivityProps) {
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_ITEM)
  const [feedback, setFeedback] = useState('')
  const [finished, setFinished] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rtl = isRTL(locale)

  useEffect(() => {
    if (finished) return
    setTimeLeft(SECONDS_PER_ITEM)
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          advance(false)
          return SECONDS_PER_ITEM
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, finished])

  function advance(correct: boolean) {
    const newStreak = correct ? streak + 1 : 0
    setStreak(newStreak)
    setBestStreak((b) => Math.max(b, newStreak))
    setInput('')
    if (index + 1 >= items.length) {
      setFinished(true)
      onComplete(score)
    } else {
      setIndex((i) => i + 1)
    }
    inputRef.current?.focus()
  }

  function submit() {
    if (finished) return
    const want = (items[index]?.answer ?? '').trim().toLowerCase()
    const got = input.trim().toLowerCase()
    if (!got) return
    if (got === want) {
      const newStreak = streak + 1
      const bonus = newStreak >= 3 ? 5 : 0
      const gained = SCORE_PER_CORRECT + bonus
      const newScore = score + gained
      setScore(newScore)
      setFeedback(bonus > 0 ? `Correct! +${gained} (streak bonus +${bonus})` : `Correct! +${gained}`)
      setStreak(newStreak)
      setBestStreak((b) => Math.max(b, newStreak))
      setInput('')
      if (index + 1 >= items.length) {
        setFinished(true)
        onComplete(newScore)
      } else {
        setIndex((i) => i + 1)
      }
    } else {
      setFeedback('Not quite — try again!')
      setStreak(0)
    }
    inputRef.current?.focus()
  }

  if (items.length < 1) {
    return <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Add at least 1 item to play Typing Race.</p>
  }

  if (finished) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>⌨️</div>
        <h2 style={{ fontFamily: 'var(--font-display)', marginTop: '0.5rem' }}>Race Finished!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score} · Best streak: {bestStreak}</p>
      </div>
    )
  }

  const item = items[index]
  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        <span>Item {index + 1} / {items.length}</span>
        <span>⏱ {timeLeft}s</span>
        <span>🔥 Streak: {streak}</span>
        <span>Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong></span>
      </div>
      <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>{item.prompt}</p>
      <input
        ref={inputRef}
        value={input}
        autoFocus
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        placeholder="Type the answer…"
        aria-label="Type the answer"
        style={{
          width: '100%', minHeight: '56px', padding: '0.9rem 1rem', fontSize: '1.1rem',
          borderRadius: 'var(--radius)', border: '2px solid var(--color-border)',
          background: 'var(--color-surface)', color: 'var(--color-text-primary)',
        }}
      />
      <button
        onClick={submit}
        style={{
          width: '100%', minHeight: '56px', marginTop: '0.75rem', padding: '0.9rem 1rem',
          borderRadius: 'var(--radius)', border: 'none', background: 'var(--color-primary)',
          color: '#fff', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
        }}
      >
        Check Answer →
      </button>
      {feedback && <p style={{ marginTop: '0.75rem', color: 'var(--color-text-secondary)' }}>{feedback}</p>}
      {item.hint && <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Hint: {item.hint}</p>}
    </div>
  )
}
