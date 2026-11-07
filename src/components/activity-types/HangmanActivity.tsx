'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, isRTL } from './shared'
import { hangmanClues } from '@/lib/hangman-clues'
import ScorePill from '@/components/game/ScorePill'
import KidActionsBar from '@/components/game/KidActionsBar'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

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
const MAX_PER_WORD = SCORE_PER_CORRECT * MAX_WRONG // 60 — a word won with no wrong guess

// HANGMAN — REAL CLUES (item 35, owner 2026-11-07 13:44 PKT):
// the game used to show only the generic hint "History word", so the
// kid guessed letters blind with no idea what the word was. Now,
// BEFORE the kid guesses a word, the game shows 3 clue questions
// whose answers point to the word — all taken from the game's own
// item, so no fact is ever invented (see src/lib/hangman-clues.ts):
//   1. What kind of word is it? — the item's own hint.
//   2. How many letters? — the count of letters in the answer.
//   3. What letter does it start with? — the answer's first letter.
// The kid reads the clues, taps "Start guessing", and the clues stay
// visible in a compact line while guessing. Rules unchanged: 6 wrong
// guesses, letter keyboard, 10 points per wrong guess NOT used
// (up to 60 per word).

export default function HangmanActivity({ items, locale, onComplete }: ActivityProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [guessed, setGuessed] = useState<Set<string>>(new Set())
  const [wrongCount, setWrongCount] = useState(0)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [finished, setFinished] = useState(false)
  const [cluesSeen, setCluesSeen] = useState(false)
  const [hintUsed, setHintUsed] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const rtl = isRTL(locale)
  const item = items[currentIdx]
  const word = (item?.answer || '').toUpperCase()
  const clues = item ? hangmanClues(item.prompt, word) : null

  useEffect(() => {
    setGuessed(new Set())
    setWrongCount(0)
    setStatus('playing')
    setCluesSeen(false)
    setHintUsed(false)
    setShowAnswer(false)
  }, [currentIdx])

  const lettersToShow = word.split('').filter((c) => /[A-Z]/.test(c))
  const allGuessed = lettersToShow.every((l) => guessed.has(l))

  useEffect(() => {
    if (allGuessed && status === 'playing' && word) {
      setStatus('won')
      const newScore = score + SCORE_PER_CORRECT * Math.max(1, MAX_WRONG - wrongCount)
      setScore(newScore)
      playEduSound('win', readInteractiveSoundOn())
      setTimeout(() => advance(newScore), 1500)
    }
  }, [allGuessed, status, word])

  function guessLetter(letter: string) {
    if (guessed.has(letter) || status !== 'playing' || !cluesSeen || showAnswer) return
    const newGuessed = new Set(guessed).add(letter)
    setGuessed(newGuessed)
    if (!word.includes(letter)) {
      const newWrong = wrongCount + 1
      setWrongCount(newWrong)
      playEduSound('wrong', readInteractiveSoundOn())
      if (newWrong >= MAX_WRONG) {
        setStatus('lost')
        setTimeout(() => advance(score), 1500)
      }
    } else {
      playEduSound('correct', readInteractiveSoundOn())
    }
  }

  // Kid action — hint: reveal ONE letter in its correct slot
  // (the Anagram pattern). Once per word.
  function useHint() {
    if (hintUsed || status !== 'playing' || !cluesSeen || showAnswer) return
    const unguessed = lettersToShow.find((l) => !guessed.has(l))
    if (!unguessed) return
    setGuessed((prev) => new Set(prev).add(unguessed))
    setHintUsed(true)
  }

  function skipWord() {
    if (status !== 'playing' || showAnswer) return
    advance(score)
  }

  function revealAnswer() {
    if (status !== 'playing' || showAnswer) return
    setShowAnswer(true)
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
        <h2 style={{ fontFamily: FUNKY_FONT }}>Hangman Done!</h2>
        <p style={{ marginTop: '0.5rem' }}>
          <ScorePill score={score} total={items.length * MAX_PER_WORD} big />
        </p>
      </motion.div>
    )
  }

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const partsToShow = 4 + wrongCount // show gallows always + body parts per wrong guess

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.75rem 0.5rem', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <span>{currentIdx + 1} / {items.length}</span>
        <ScorePill score={score} total={items.length * MAX_PER_WORD} />
        <span>Wrong: {wrongCount}/{MAX_WRONG}</span>
      </div>

      {/* Hangman drawing */}
      <svg viewBox="0 0 100 140" width="120" height="140" style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
        {HANGMAN_PARTS.slice(0, partsToShow)}
      </svg>

      {/* The 3 clue questions — shown FIRST, before any guessing. */}
      {clues && !cluesSeen && (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{
            textAlign: 'left', padding: '0.9rem 1rem', borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 50%, #fcd34d 100%)',
            border: '2px solid var(--color-warning)', marginBottom: '0.75rem',
            color: '#78350f',
          }}>
          <p style={{ fontFamily: FUNKY_FONT, fontSize: '1.05rem', margin: '0 0 0.5rem' }}>🔍 3 Clues — read them, then guess!</p>
          <p style={{ margin: '0.25rem 0', lineHeight: 1.5 }}>❓ What kind of word is it? <strong>{clues.kind}</strong></p>
          <p style={{ margin: '0.25rem 0', lineHeight: 1.5 }}>❓ How many letters? <strong>{clues.letters}</strong></p>
          <p style={{ margin: '0.25rem 0', lineHeight: 1.5 }}>❓ What letter does it start with? <strong>{clues.first}</strong></p>
          <motion.button
            onClick={() => setCluesSeen(true)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{
              marginTop: '0.6rem', padding: '0.6rem 1.5rem',
              borderRadius: 'var(--radius)', border: 'none',
              background: 'var(--gradient-btn)', color: '#fff',
              fontFamily: FUNKY_FONT, fontSize: '1rem', cursor: 'pointer',
            }}
          >
            🔤 Start guessing →
          </motion.button>
        </motion.div>
      )}

      {/* Compact clue line — stays visible while guessing. */}
      {clues && cluesSeen && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          💡 {clues.kind} · 🔤 {clues.letters} letters · 🔠 Starts with {clues.first}
        </p>
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
            {char === ' ' ? '' : (guessed.has(char) || status === 'lost' || showAnswer) ? char : ''}
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
              color: '#fff', fontFamily: FUNKY_FONT, fontSize: '1rem',
            }}>
            {status === 'won' ? `🎉 Correct! The word was ${word}` : `❌ The word was: ${word}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show-the-answer state — 0 points, the kid moves on. */}
      {showAnswer && status === 'playing' && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          role="alert"
          style={{
            padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '0.75rem',
            background: 'var(--color-warning)', color: '#78350f',
            fontFamily: FUNKY_FONT, fontSize: '1rem',
          }}>
          👁️ The word is <strong>{word}</strong> — 0 points for this word.
          <motion.button
            onClick={() => advance(score)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{
              display: 'block', margin: '0.6rem auto 0', padding: '0.6rem 1.5rem',
              borderRadius: 'var(--radius)', border: 'none',
              background: 'var(--gradient-btn)', color: '#fff',
              fontFamily: FUNKY_FONT, fontSize: '0.95rem', cursor: 'pointer',
            }}
          >
            Got it — next word →
          </motion.button>
        </motion.div>
      )}

      {/* Kid actions — hint / skip / see the answer. */}
      {cluesSeen && status === 'playing' && !showAnswer && (
        <div style={{ marginBottom: '0.75rem' }}>
          <KidActionsBar
            onHint={hintUsed ? undefined : useHint}
            onSkip={skipWord}
            onShowAnswer={revealAnswer}
            hintUsed={hintUsed}
          />
        </div>
      )}

      {/* Keyboard */}
      {cluesSeen && status === 'playing' && !showAnswer && (
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
    </div>
  )
}
