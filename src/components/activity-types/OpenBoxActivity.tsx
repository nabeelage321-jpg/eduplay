'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'
import ScorePill from '@/components/game/ScorePill'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

interface Box {
  id: number
  prompt: string
  answer: string
  imageUrl?: string
  revealed: boolean
}

// OPEN THE BOX — A PROPER GAME (item 33, owner 2026-11-07 13:41 PKT):
// tapping a box used to only reveal its answer (the question printed
// underneath, small and cut off) and opening ALL boxes gave FULL
// marks just for tapping — no question was ever asked, no wrong
// answer was possible. It told everything; it was not a game.
// Now: ONE question at a time, shown big and fully readable; the
// kid taps the box hiding the correct answer. Correct = +10 and the
// box opens with its gift-box flip. Wrong = 0 marks for that
// question, move to the next question (same rule as Fill Blank).
// The question order is shuffled, so the right box is never
// predictable from the box numbers. A box opened by a correct tap
// stays open AND stays tappable — its answer is visible, so the kid
// can tap it again when its question comes up (no dead ends: every
// question is always answerable). Scoring stays +10 per correct
// answer; finish = all questions done. The box grid and the game's
// content are unchanged.

export default function OpenBoxActivity({ items, locale, onComplete }: ActivityProps) {
  const [boxes, setBoxes] = useState<Box[]>(() =>
    items.map((item, i) => ({
      id: i, prompt: item.prompt, answer: item.answer,
      imageUrl: item.imageUrl, revealed: false,
    }))
  )
  // Shuffled question order — the right box is never predictable.
  const [questionOrder] = useState<number[]>(() => shuffleArray(items.map((_, i) => i)))
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)

  const questionIdx = questionOrder[currentQ]
  const question = questionIdx !== undefined ? items[questionIdx] : null

  function advance(finalScore: number, finalCorrect: number) {
    if (currentQ + 1 >= questionOrder.length) {
      setFinished(true)
      onComplete(finalScore, { correctCount: finalCorrect, totalCount: items.length })
    } else {
      setCurrentQ((q) => q + 1)
    }
  }

  function tapBox(id: number) {
    if (finished || feedback || !question) return
    const box = boxes.find((b) => b.id === id)
    if (!box) return
    const isCorrect = box.answer === question.answer
    if (isCorrect) {
      const newScore = score + SCORE_PER_CORRECT
      const newCorrect = correctCount + 1
      setScore(newScore)
      setCorrectCount(newCorrect)
      // The box opens with its reveal animation — and stays open.
      setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, revealed: true } : b)))
      setFeedback({ type: 'correct', msg: getRandomFeedback('correct') })
      playEduSound('correct', readInteractiveSoundOn())
      setTimeout(() => { setFeedback(null); advance(newScore, newCorrect) }, 1200)
    } else {
      setFeedback({ type: 'wrong', msg: getRandomFeedback('wrong') })
      playEduSound('wrong', readInteractiveSoundOn())
      setTimeout(() => { setFeedback(null); advance(score, correctCount) }, 1200)
    }
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🎁</div>
        <h2 style={{ fontFamily: FUNKY_FONT }}>Open the Box Done!</h2>
        <p style={{ marginTop: '0.5rem' }}>
          <ScorePill score={score} total={items.length * SCORE_PER_CORRECT} big />
        </p>
      </motion.div>
    )
  }

  const cols = items.length <= 4 ? 2 : items.length <= 9 ? 3 : 4

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.75rem 0.5rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
        Question {currentQ + 1} of {questionOrder.length}
      </p>

      {/* The question — big and fully readable, never truncated. */}
      <p style={{
        color: 'var(--color-text-primary)', fontFamily: FUNKY_FONT,
        fontSize: '1.25rem', lineHeight: 1.4, margin: '0 0 1rem',
      }}>
        {question ? question.prompt : 'All questions done'}
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(cols, items.length)}, 1fr)`,
        gap: '0.6rem',
      }}>
        {boxes.map((box) => (
          <div key={box.id} style={{ perspective: '600px' }}>
            <motion.div
              animate={{ rotateY: box.revealed ? 180 : 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              style={{
                position: 'relative', width: '100%', paddingTop: '100%',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Front — closed box */}
              <motion.button
                onClick={() => tapBox(box.id)}
                whileHover={!feedback ? { scale: 1.05 } : {}}
                whileTap={!feedback ? { scale: 0.95 } : {}}
                aria-label={box.revealed ? `Box ${box.id + 1}: ${box.answer}` : `Box ${box.id + 1}: tap to open`}
                style={{
                  position: 'absolute', inset: 0,
                  backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                  borderRadius: 'var(--radius-lg)',
                  border: `3px solid ${box.revealed ? 'var(--color-success)' : 'var(--color-primary)'}`,
                  background: box.revealed ? 'var(--color-success)' : 'var(--gradient-btn)',
                  cursor: feedback ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '0.25rem',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <span style={{ fontSize: '2rem' }}>{box.revealed ? '✅' : '🎁'}</span>
                <span style={{ color: '#fff', fontSize: '0.75rem', fontFamily: 'var(--font-display)' }}>
                  #{box.id + 1}
                </span>
              </motion.button>

              {/* Back — revealed content: the answer only. The question
                  already shows big above the grid, so the small prompt
                  line that used to sit here (and cut off) is gone.
                  The back is clickable too: an opened box stays
                  tappable (its answer is visible, so the kid can tap
                  it again when its question comes up) — otherwise a
                  question whose box was already opened would be
                  unanswerable. */}
              <div
                onClick={() => tapBox(box.id)}
                style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                borderRadius: 'var(--radius-lg)',
                border: '3px solid var(--color-success)',
                background: 'var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '0.25rem', padding: '0.5rem',
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
                cursor: feedback ? 'default' : 'pointer',
              }}>
                {box.imageUrl ? (
                  <img src={box.imageUrl} alt={box.answer}
                    style={{ width: '100%', height: '70%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                ) : (
                  <span style={{ fontSize: '1.5rem' }}>✨</span>
                )}
                <p style={{
                  color: 'var(--color-text-primary)', fontSize: '0.9rem',
                  fontFamily: FUNKY_FONT, textAlign: 'center',
                  lineHeight: 1.3, margin: 0, overflowWrap: 'anywhere',
                }}>
                  {box.answer}
                </p>
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              marginTop: '0.75rem', padding: '0.6rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', fontFamily: FUNKY_FONT, fontSize: '0.95rem',
            }}>
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
        <ScorePill score={score} total={items.length * SCORE_PER_CORRECT} />
      </p>
    </div>
  )
}
