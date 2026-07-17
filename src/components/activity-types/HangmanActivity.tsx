'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, isRTL } from './shared'

const HANGMAN_PARTS = [
  // Gallows
  <line key="base" x1="10" y1="130" x2="90" y2="130" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />,
  <line key="pole" x1="30" y1="130" x2="30" y2="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />,
  <line key="top" x1="30" y1="10" x2="70" y2="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />,
  <line key="rope" x1="70" y1="10" x2="70" y2="28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />,
  // Body parts
  <circle key="head" cx="70" cy="38" r="10" stroke="currentColor" strokeWidth="3" fill="none" />,
  <line key="body" x1="70" y1="48" x2="70" y2="85" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />,
  <line key="larm" x1="70" y1="60" x2="50" y2="75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />,
  <line key="rarm" x1="70" y1="60" x2="90" y2="75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />,
  <line key="lleg" x1="70" y1="85" x2="52" y2="108" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />,
  <line key="rleg" x1="70" y1="85" x2="88" y2="108" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />,
]

const MAX_WRONG = HANGMAN_PARTS.length - 4 // head + body + arms + legs = 6

export default function HangmanActivity({ items, locale, onComplete }: ActivityProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [guessed, setGuessed] = useState<Set<string>>(new Set())
  const [wrongCount, setWrongCount] = useState(0)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)
  const item = items[currentIdx]
  const word = (item?.answer || '').toUpperCase()
  const hint = item?.prompt || ''

  useEffect(() => {
    setGuessed(new Set())
    setWrongCount(0)
    setStatus('playing')
  }, [currentIdx])

  const lettersToShow = word.split('').filter((c) => /[A-Z]/.test(c))
  const allGuessed = lettersToShow.every((l) => guessed.has(l))

  useEffect(() => {
    if (allGuessed && status === 'playing' && word) {
      setStatus('won')
      const newScore = score + SCORE_PER_CORRECT * Math.max(1, MAX_WRONG - wrongCount)
      setScore(newScore)
      setTimeout(() => advance(newScore), 1500)
    }
  }, [allGuessed, status, word])

  function guessLetter(letter: string) {
    if (guessed.has(letter) || status !== 'playing') return
    const newGuessed = new Set(guessed).add(letter)
    setGuessed(newGuessed)
    if (!word.includes(letter)) {
      const newWrong = wrongCount + 1
      setWrongCount(newWrong)
      if (newWrong >= MAX_WRONG) {
        setStatus('lost')
        setTimeout(() => advance(score), 1500)
      }
    }
  }

  function advance(finalScore: number) {
    if (currentIdx + 1 >= items.length) { setFinished(true); onComplete(finalScore) }
    else setCurrentIdx((i) => i + 1)
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🎯</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Hangman Done!</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score}</p>
      </motion.div>
    )
  }

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const partsToShow = 4 + wrongCount // show gallows always + body parts per wrong guess

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <span>{currentIdx + 1} / {items.length}</span>
        <span>Wrong: {wrongCount}/{MAX_WRONG}</span>
      </div>

      {/* Hangman drawing */}
      <svg viewBox="0 0 100 140" width="120" height="140" style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
        {HANGMAN_PARTS.slice(0, partsToShow)}
      </svg>

      {/* Hint */}
      {hint && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>💡 {hint}</p>
      )}

      {/* Word display */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {word.split('').map((char, i) => (
          <div key={i} style={{
            width: char === ' ' ? '1rem' : '2rem',
            borderBottom: char !== ' ' ? '3px solid var(--color-primary)' : 'none',
            height: '2.5rem',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: '0.2rem',
            color: status === 'lost' && !guessed.has(char) ? 'var(--color-danger)' : 'var(--color-text-primary)',
            fontFamily: 'monospace', fontWeight: 700, fontSize: '1.25rem',
          }}>
            {char === ' ' ? '' : (guessed.has(char) || status === 'lost') ? char : ''}
          </div>
        ))}
      </div>

      {/* Status message */}
      <AnimatePresence>
        {status !== 'playing' && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            role="alert"
            style={{
              padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '0.75rem',
              background: status === 'won' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem',
            }}>
            {status === 'won' ? `🎉 Correct! The word was ${word}` : `❌ The word was: ${word}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard */}
      {status === 'playing' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'center' }}>
          {ALPHABET.map((letter) => {
            const isGuessed = guessed.has(letter)
            const isCorrect = isGuessed && word.includes(letter)
            const isWrong = isGuessed && !word.includes(letter)
            return (
              <motion.button
                key={letter}
                onClick={() => guessLetter(letter)}
                disabled={isGuessed}
                whileHover={!isGuessed ? { scale: 1.1 } : {}}
                aria-label={`Guess letter ${letter}`}
                aria-pressed={isGuessed}
                style={{
                  width: '2rem', height: '2rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `2px solid ${isCorrect ? 'var(--color-success)' : isWrong ? 'var(--color-danger)' : 'var(--color-border)'}`,
                  background: isCorrect ? 'var(--color-success)' : isWrong ? 'var(--color-danger)' : 'var(--color-surface)',
                  color: isGuessed ? '#fff' : 'var(--color-text-primary)',
                  fontSize: '0.8rem', fontWeight: 700,
                  cursor: isGuessed ? 'not-allowed' : 'pointer',
                  opacity: isGuessed ? 0.6 : 1,
                  fontFamily: 'monospace',
                }}
              >
                {letter}
              </motion.button>
            )
          })}
        </div>
      )}

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
        Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong>
      </p>
    </div>
  )
}
