'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'
import KidActionsBar from '@/components/game/KidActionsBar'
import ScorePill from '@/components/game/ScorePill'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

export default function AnagramActivity({ items, locale, onComplete }: ActivityProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [tiles, setTiles] = useState<string[]>([])
  const [arranged, setArranged] = useState<(string | null)[]>([])
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  // KID ACTIONS (batch 1, items 17 + 20): HINT reveals ONE letter in
  // its correct slot (the real helping hint — the old 💡 line was a
  // generic instruction only). SKIP moves to the next word for 0
  // points. SEE THE ANSWER fills the word in and shows the why
  // (the item's own hint when it has one — never invented).
  const [hintUsed, setHintUsed] = useState(false)
  const [answerRevealed, setAnswerRevealed] = useState(false)
  const rtl = isRTL(locale)
  const item = items[currentIdx]

  useEffect(() => {
    if (!item) return
    const letters = item.answer.toUpperCase().split('')
    setTiles(shuffleArray(letters))
    setArranged(new Array(letters.length).fill(null))
    setHintUsed(false)
    setAnswerRevealed(false)
  }, [currentIdx, item])

  function placeTile(letter: string, tileIdx: number) {
    if (answerRevealed) return
    const emptySlot = arranged.indexOf(null)
    if (emptySlot === -1) return
    const newArranged = [...arranged]
    newArranged[emptySlot] = letter
    const newTiles = [...tiles]
    newTiles[tileIdx] = ''
    setArranged(newArranged)
    setTiles(newTiles)
    if (newArranged.every((l) => l !== null)) judgeFilled(newArranged)
  }

  /** Judge a fully-filled word: correct scores and advances, wrong
   *  shuffles the letters and lets the kid try again (no life lost).
   *  Shared by normal fills and by the hint completing the word. */
  function judgeFilled(filled: (string | null)[]) {
    if (!item) return
    const word = filled.join('')
    const isCorrect = word.toUpperCase() === item.answer.toUpperCase()
    if (isCorrect) {
      const ns = score + SCORE_PER_CORRECT
      const nc = correctCount + 1
      setScore(ns)
      setCorrectCount(nc)
      setFeedback({ type: 'correct', msg: getRandomFeedback('correct') })
      setTimeout(() => {
        setFeedback(null)
        if (currentIdx + 1 >= items.length) { setFinished(true); onComplete(ns, { correctCount: nc, totalCount: items.length }) }
        else setCurrentIdx((i) => i + 1)
      }, 1200)
    } else {
      setFeedback({ type: 'wrong', msg: getRandomFeedback('wrong') })
      setTimeout(() => {
        setFeedback(null)
        const letters = item.answer.toUpperCase().split('')
        setTiles(shuffleArray(letters))
        setArranged(new Array(letters.length).fill(null))
        // A fresh attempt gets a fresh hint — the revealed letter
        // went back to the tiles with the shuffle.
        setHintUsed(false)
      }, 1000)
    }
  }

  function useHint() {
    if (!item || hintUsed || answerRevealed || feedback) return
    const answer = item.answer.toUpperCase().split('')
    const emptySlot = arranged.indexOf(null)
    if (emptySlot === -1) return
    const letter = answer[emptySlot]
    const tileIdx = tiles.indexOf(letter)
    if (tileIdx === -1) return
    const newArranged = [...arranged]
    newArranged[emptySlot] = letter
    const newTiles = [...tiles]
    newTiles[tileIdx] = ''
    setArranged(newArranged)
    setTiles(newTiles)
    setHintUsed(true)
    // If the hint completed the word, judge it like a normal fill.
    if (newArranged.every((l) => l !== null)) judgeFilled(newArranged)
  }

  function skipWord() {
    if (feedback || answerRevealed) return
    if (currentIdx + 1 >= items.length) { setFinished(true); onComplete(score, { correctCount, totalCount: items.length }) }
    else setCurrentIdx((i) => i + 1)
  }

  function revealAnswer() {
    if (!item || feedback || answerRevealed) return
    const letters = item.answer.toUpperCase().split('')
    setArranged(letters)
    setTiles(new Array(letters.length).fill(''))
    setAnswerRevealed(true)
    setFeedback({ type: 'correct', msg: `The word is "${item.answer}".` })
  }

  function nextAfterReveal() {
    setFeedback(null)
    if (currentIdx + 1 >= items.length) { setFinished(true); onComplete(score, { correctCount, totalCount: items.length }) }
    else setCurrentIdx((i) => i + 1)
  }

  function removeFromArranged(slotIdx: number) {
    const letter = arranged[slotIdx]
    if (!letter) return
    const newArranged = [...arranged]; newArranged[slotIdx] = null
    const newTiles = [...tiles]
    const emptyTile = newTiles.indexOf('')
    if (emptyTile !== -1) newTiles[emptyTile] = letter; else newTiles.push(letter)
    setArranged(newArranged); setTiles(newTiles)
  }

  if (finished) return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
      <div style={{ fontSize: '3rem' }}>🔤</div>
      <h2 style={{ fontFamily: FUNKY_FONT, marginTop: '0.5rem' }}>Anagram Complete!</h2>
      <p style={{ marginTop: '0.5rem' }}><ScorePill score={score} total={items.length * SCORE_PER_CORRECT} big /></p>
    </motion.div>
  )

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.75rem 0.5rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        {currentIdx + 1} / {items.length}
      </p>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '0.75rem',
        color: 'var(--color-text-primary)', fontSize: '1.1rem',
        fontFamily: FUNKY_FONT, boxShadow: 'var(--shadow-card)',
      }}>
        {item?.prompt}
      </div>
      {/* KID ACTIONS (batch 1, items 17 + 20): hint reveals one
          letter, skip moves on for 0, see-the-answer fills the word. */}
      <KidActionsBar
        onHint={!feedback && !answerRevealed ? useHint : undefined}
        onSkip={!feedback && !answerRevealed ? skipWord : undefined}
        onShowAnswer={!feedback && !answerRevealed ? revealAnswer : undefined}
        hintUsed={hintUsed}
        answerShown={answerRevealed}
      />
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {arranged.map((letter, i) => (
          <motion.button key={i} onClick={() => letter && removeFromArranged(i)}
            whileHover={letter ? { scale: 1.05 } : {}}
            aria-label={letter ? `Remove letter ${letter}` : `Empty slot ${i + 1}`}
            style={{
              width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius)',
              border: `2px solid ${letter ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: letter ? 'var(--color-primary)' : 'var(--color-surface-alt)',
              color: letter ? '#fff' : 'transparent', fontSize: '1rem', fontWeight: 700,
              cursor: letter ? 'pointer' : 'default', fontFamily: 'monospace', transition: 'all 0.15s',
            }}>
            {letter || '_'}
          </motion.button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {tiles.map((letter, i) => (
          letter ? (
            <motion.button key={i} onClick={() => placeTile(letter, i)}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
              aria-label={`Letter tile ${letter}`}
              style={{
                width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius)',
                border: '2px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text-primary)', fontSize: '1rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'monospace', boxShadow: 'var(--shadow)', transition: 'all 0.15s',
              }}>
              {letter}
            </motion.button>
          ) : <div key={i} style={{ width: '2.5rem', height: '2.5rem' }} />
        ))}
      </div>
      {item?.hint && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>💡 {item.hint}</p>}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} role="alert"
            style={{
              padding: '0.75rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', fontSize: '1rem', fontFamily: FUNKY_FONT,
            }}>
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
      {/* The WHY (batch 1, item 17): the question's own hint explains
          the revealed word — never invented. */}
      {answerRevealed && item?.hint ? (
        <p style={{
          marginTop: '0.75rem', padding: '0.7rem 1rem', borderRadius: 'var(--radius)',
          background: 'color-mix(in srgb, var(--color-warning) 16%, var(--color-surface))',
          border: '2px solid var(--color-warning)',
          color: 'var(--color-text-primary)', fontSize: '0.95rem', textAlign: 'center',
        }}>
          💡 Why: {item.hint}
        </p>
      ) : null}
      {answerRevealed ? (
        <button
          onClick={nextAfterReveal}
          style={{
            marginTop: '0.75rem', width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: 'var(--color-primary)', color: '#fff', fontFamily: FUNKY_FONT,
            fontSize: '1.05rem', cursor: 'pointer',
          }}
        >
          Got it — next word →
        </button>
      ) : null}
      <div style={{ marginTop: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <ScorePill score={score} />
      </div>
    </div>
  )
}
