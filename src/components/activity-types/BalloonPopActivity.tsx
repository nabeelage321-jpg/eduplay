'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'
import { choiceRoundLabels } from '@/lib/convert'
import KidActionsBar from '@/components/game/KidActionsBar'
import ScorePill from '@/components/game/ScorePill'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import type { ActivityItem } from '@/types'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

interface Balloon {
  id: string
  label: string
  isCorrect: boolean
  x: number
  color: string
  popped: boolean
}

const BALLOON_COLORS = [
  'var(--color-primary)',
  'var(--color-danger)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-primary-dark)',
]

export default function BalloonPopActivity({ items, locale, onComplete }: ActivityProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [balloons, setBalloons] = useState<Balloon[]>([])
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  // NO-LOOP RISE (batch-2 #2, owner 12:54 PKT): each balloon rises
  // ONCE and never comes back. If the CORRECT balloon floats off
  // the top unpopped, the round counts as WRONG (0 points, next
  // question). roundDoneRef guards the advance so a pop and an
  // escape can never both fire for the same round.
  const roundDoneRef = useRef(false)
  // HINT (batch-2 #2): once per round, the CORRECT balloon glows
  // and pulses gold so the kid can spot it. Skip / see-the-answer
  // do not map to popping — they are hidden, never faked.
  const [hintUsed, setHintUsed] = useState(false)
  const rtl = isRTL(locale)
  const item = items[currentIdx]

  useEffect(() => {
    if (!item) return
    // BALLOON CONVERT 2026-11-07: the round's balloons come from the
    // shared adapter — the question's own options when it has them,
    // otherwise wrong balloons borrowed from the other items'
    // answers (nothing invented). The adapter returns null only for
    // a lone question with no options and nothing to borrow; native
    // play never passes the convert gate, so it falls back to
    // today's single-balloon round instead of an empty arena.
    const labels = choiceRoundLabels(items, currentIdx) ?? [item.answer]
    const opts = shuffleArray(labels)
    const bs: Balloon[] = opts.map((label, i) => ({
      id: `b-${currentIdx}-${i}`,
      label,
      isCorrect: label === item.answer,
      x: 10 + (i * 22) + Math.random() * 8,
      color: BALLOON_COLORS[i % BALLOON_COLORS.length],
      popped: false,
    }))
    setBalloons(bs)
    setHintUsed(false)
    roundDoneRef.current = false
  }, [currentIdx, item, items])

  function useHint() {
    if (hintUsed || feedback) return
    setHintUsed(true)
  }

  function popBalloon(id: string, isCorrect: boolean) {
    if (roundDoneRef.current) return
    setBalloons((prev) => prev.map((b) => b.id === id ? { ...b, popped: true } : b))
    if (isCorrect) {
      roundDoneRef.current = true
      const newScore = score + SCORE_PER_CORRECT
      const newCorrect = correctCount + 1
      setScore(newScore)
      setCorrectCount(newCorrect)
      setFeedback({ type: 'correct', msg: getRandomFeedback('correct') })
      playEduSound('correct', readInteractiveSoundOn())
      setTimeout(() => {
        setFeedback(null)
        if (currentIdx + 1 >= items.length) {
          setFinished(true)
          onComplete(newScore, { correctCount: newCorrect, totalCount: items.length })
        } else {
          setCurrentIdx((i) => i + 1)
        }
      }, 1000)
    } else {
      setFeedback({ type: 'wrong', msg: getRandomFeedback('wrong') })
      playEduSound('wrong', readInteractiveSoundOn())
      setTimeout(() => setFeedback(null), 800)
    }
  }

  // The correct balloon escaped off the top unpopped: the round
  // counts as WRONG — no points, move to the next question (or
  // finish). Fires only for the correct balloon's rise finishing,
  // and only while the round is still live.
  function handleEscape(b: Balloon) {
    if (!b.isCorrect || roundDoneRef.current || finished) return
    roundDoneRef.current = true
    setFeedback({ type: 'wrong', msg: '💨 The correct balloon floated away! 0 points' })
    playEduSound('wrong', readInteractiveSoundOn())
    setTimeout(() => {
      setFeedback(null)
      if (currentIdx + 1 >= items.length) {
        setFinished(true)
        onComplete(score, { correctCount, totalCount: items.length })
      } else {
        setCurrentIdx((i) => i + 1)
      }
    }, 1400)
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🎈</div>
        <h2 style={{ fontFamily: FUNKY_FONT }}>All Balloons Popped!</h2>
        <p style={{ marginTop: '0.5rem' }}><ScorePill score={score} total={items.length * SCORE_PER_CORRECT} big /></p>
      </motion.div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.75rem 0.5rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
        {currentIdx + 1} / {items.length}
      </p>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.85rem',
        marginBottom: '0.75rem',
        color: 'var(--color-text-primary)',
        fontFamily: FUNKY_FONT,
        fontSize: '1.1rem',
        boxShadow: 'var(--shadow-card)',
      }}>
        {item?.prompt}
      </div>
      {/* KID ACTIONS (batch 1, item 17 + batch-2 #2): Hint only — the
          correct balloon glows. */}
      <KidActionsBar onHint={useHint} hintUsed={hintUsed} />

      {/* Balloon arena */}
      <div style={{ position: 'relative', height: '280px', overflow: 'hidden', marginBottom: '1rem' }}>
        <AnimatePresence>
          {balloons.map((b) => !b.popped && (
            <motion.button
              key={b.id}
              initial={{ y: 300, opacity: 1 }}
              animate={{ y: -20 }}
              // SLOW RISE, ONCE (batch-2 #2): ~10 seconds per pass so
              // a kid can read the balloons and aim in time — and NO
              // infinite loop. A balloon that floats off the top is
              // gone; if it was the correct one, the round is wrong.
              transition={{ duration: 10 + Math.random() * 2, ease: 'linear' }}
              onAnimationComplete={() => handleEscape(b)}
              onClick={() => popBalloon(b.id, b.isCorrect)}
              aria-label={`Balloon: ${b.label}`}
              style={{
                position: 'absolute',
                left: `${b.x}%`,
                bottom: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Balloon body — glows + pulses gold when the hint is on
                  and this is the correct balloon, with a 💡 badge on
                  top so the hint is unmistakable: a real helping
                  hint (which balloon to pop), never a generic line. */}
              <motion.div
                animate={hintUsed && b.isCorrect ? { scale: [1, 1.12, 1] } : {}}
                transition={hintUsed && b.isCorrect ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : {}}
                style={{
                width: '64px',
                height: '80px',
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                background: b.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                padding: '0.25rem',
                textAlign: 'center',
                wordBreak: 'break-word',
                boxShadow: hintUsed && b.isCorrect
                  ? '0 0 0 4px #ffc93c, 0 0 24px #ffc93c, 2px 4px 8px rgba(0,0,0,0.25)'
                  : '2px 4px 8px rgba(0,0,0,0.25)',
                position: 'relative',
              }}>
                {hintUsed && b.isCorrect ? (
                  <span aria-hidden="true" style={{
                    position: 'absolute', top: '-14px', right: '-10px',
                    fontSize: '1.3rem', lineHeight: 1, pointerEvents: 'none',
                  }}>💡</span>
                ) : null}
                {b.label}
                {/* Shine */}
                <div style={{
                  position: 'absolute', top: '10px', left: '12px',
                  width: '14px', height: '10px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.4)',
                  transform: 'rotate(-30deg)',
                }} />
              </motion.div>
              {/* String */}
              <div style={{ width: '2px', height: '30px', background: 'var(--color-text-muted)', opacity: 0.5 }} />
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Pop effects */}
        <AnimatePresence>
          {balloons.filter((b) => b.popped).map((b) => (
            <motion.div
              key={`pop-${b.id}`}
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{}}
              transition={{ duration: 0.4 }}
              style={{
                position: 'absolute',
                left: `${b.x}%`,
                top: '40%',
                fontSize: '1.5rem',
                pointerEvents: 'none',
              }}
            >
              💥
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', fontSize: '1rem', fontFamily: FUNKY_FONT,
            }}>
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
        <ScorePill score={score} />
      </p>
    </div>
  )
}
