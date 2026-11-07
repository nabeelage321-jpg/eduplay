'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'
import { choiceRoundLabels } from '@/lib/convert'
import KidActionsBar from '@/components/game/KidActionsBar'
import ScorePill from '@/components/game/ScorePill'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

const COLORS = [
  'var(--color-primary)',
  'var(--color-primary-dark)',
  'var(--color-primary-light)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-danger)',
]

// SPIN WHEEL PURPOSE FIX (batch 1, final list item 24): the wheel
// used to be a random picker only — spin, land on an answer (e.g.
// "Indus Valley"), 3 spins, fixed onComplete(30). No question was
// asked and no marks were earned per spin, so the game had no
// point. Now the wheel works like a teacher spinning it in class
// to pick a question: when it lands on a segment, the kid answers
// the QUESTION linked to that answer (items[idx].prompt — the
// segments are the items' answers), and earns 10 points ONLY for a
// correct answer. The wheel, the spin animation, and the 3-spin
// structure are unchanged; the score is real now (0–30), and the
// finish reports correct/total counts like Quiz does.
export default function SpinWheelActivity({ items, locale, onComplete }: ActivityProps) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [landedIdx, setLandedIdx] = useState<number | null>(null)
  const [answered, setAnswered] = useState(0)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  // KID ACTIONS (batch 1, item 17): one hint per question (removes
  // ONE wrong answer), skip (0 points, next spin), see the answer
  // + why (the item's own hint when it has one — never invented).
  const [hiddenIdx, setHiddenIdx] = useState<number | null>(null)
  const [answerRevealed, setAnswerRevealed] = useState(false)
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rtl = isRTL(locale)
  const labels = items.map((i) => i.answer)
  const n = labels.length
  const segAngle = 360 / n

  const landedItem = landedIdx !== null ? items[landedIdx] : null
  const options = landedIdx !== null
    ? shuffleArray(choiceRoundLabels(items, landedIdx, 3) ?? [items[landedIdx].answer])
    : []
  const correctIndex = landedItem ? options.indexOf(landedItem.answer) : -1

  function spin() {
    if (spinning || landedIdx !== null) return
    setSpinning(true)
    const extra = 1800 + Math.random() * 720
    const newRotation = rotation + extra
    setRotation(newRotation)

    setTimeout(() => {
      const normalised = ((newRotation % 360) + 360) % 360
      const idx = Math.floor(((360 - normalised) % 360) / segAngle) % n
      setLandedIdx(idx)
      setSpinning(false)
      setSelected(null)
      setFeedback(null)
      setHiddenIdx(null)
      setAnswerRevealed(false)
    }, 3000)
  }

  function advanceAfterAnswer(wasCorrect: boolean) {
    const newScore = score + (wasCorrect ? SCORE_PER_CORRECT : 0)
    const newCorrect = correctCount + (wasCorrect ? 1 : 0)
    const newAnswered = answered + 1
    advanceTimeoutRef.current = setTimeout(() => {
      setFeedback(null)
      setSelected(null)
      setHiddenIdx(null)
      setAnswerRevealed(false)
      setScore(newScore)
      setCorrectCount(newCorrect)
      setAnswered(newAnswered)
      if (newAnswered >= 3) {
        setFinished(true)
        onComplete(newScore, { correctCount: newCorrect, totalCount: 3 })
      } else {
        setLandedIdx(null)
      }
    }, 1400)
  }

  function handleSelect(idx: number) {
    if (selected !== null || landedIdx === null) return
    playEduSound('click', readInteractiveSoundOn())
    setSelected(idx)
    const wasCorrect = idx === correctIndex
    setFeedback({
      type: wasCorrect ? 'correct' : 'wrong',
      msg: wasCorrect ? getRandomFeedback('correct') : getRandomFeedback('wrong'),
    })
    playEduSound(wasCorrect ? 'correct' : 'wrong', readInteractiveSoundOn())
    advanceAfterAnswer(wasCorrect)
  }

  function useHint() {
    if (selected !== null || hiddenIdx !== null || landedIdx === null) return
    const wrongIdx = options.findIndex((_, i) => i !== correctIndex)
    if (wrongIdx === -1) return
    playEduSound('click', readInteractiveSoundOn())
    setHiddenIdx(wrongIdx)
  }

  function skipQuestion() {
    if (selected !== null || landedIdx === null) return
    playEduSound('click', readInteractiveSoundOn())
    setSelected(-2)
    setFeedback({ type: 'wrong', msg: 'Skipped — 0 points' })
    advanceAfterAnswer(false)
  }

  function revealAnswer() {
    if (selected !== null || landedIdx === null) return
    playEduSound('click', readInteractiveSoundOn())
    setSelected(correctIndex)
    setAnswerRevealed(true)
    setFeedback({ type: 'correct', msg: `The correct answer is "${landedItem?.answer}".` })
  }

  function nextAfterReveal() {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    advanceAfterAnswer(false)
  }

  function polarToXY(angleDeg: number, r: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return { x: 150 + r * Math.cos(rad), y: 150 + r * Math.sin(rad) }
  }

  function segPath(i: number) {
    const startAngle = i * segAngle
    const endAngle = startAngle + segAngle
    const start = polarToXY(startAngle, 140)
    const end = polarToXY(endAngle, 140)
    const largeArc = segAngle > 180 ? 1 : 0
    return `M 150 150 L ${start.x} ${start.y} A 140 140 0 ${largeArc} 1 ${end.x} ${end.y} Z`
  }

  function labelPos(i: number) {
    const mid = (i + 0.5) * segAngle
    return polarToXY(mid, 90)
  }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🎡</div>
        <h2 style={{ fontFamily: FUNKY_FONT, marginTop: '0.5rem' }}>Spin Wheel Complete!</h2>
        <p style={{ marginTop: '0.5rem' }}><ScorePill score={score} total={30} big /></p>
      </motion.div>
    )
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.75rem 0.5rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        Spin {Math.min(answered + 1, 3)} of 3 · <ScorePill score={score} />
      </p>

      {landedIdx === null ? (
        <>
          {/* Pointer */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.5rem' }}>
            <div style={{
              position: 'absolute',
              top: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '20px solid var(--color-danger)',
              zIndex: 10,
            }} />
            <motion.svg
              width={300}
              height={300}
              viewBox="0 0 300 300"
              animate={{ rotate: rotation }}
              transition={{ duration: 3, ease: [0.17, 0.67, 0.35, 1] }}
              style={{ display: 'block' }}
            >
              {labels.map((label, i) => (
                <g key={i}>
                  <path d={segPath(i)} fill={COLORS[i % COLORS.length]} stroke="var(--color-background)" strokeWidth={2} />
                  <text
                    x={labelPos(i).x}
                    y={labelPos(i).y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize={n > 8 ? '8' : '11'}
                    fontWeight="700"
                    transform={`rotate(${(i + 0.5) * segAngle}, ${labelPos(i).x}, ${labelPos(i).y})`}
                  >
                    {label.length > 10 ? label.slice(0, 10) + '…' : label}
                  </text>
                </g>
              ))}
              <circle cx={150} cy={150} r={15} fill="var(--color-background)" stroke="var(--color-border)" strokeWidth={3} />
            </motion.svg>
          </div>

          <motion.button
            onClick={spin}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={spinning}
            aria-label="Spin the wheel"
            style={{
              padding: '0.75rem 2rem',
              borderRadius: 'var(--radius)',
              border: 'none',
              background: spinning ? 'var(--color-text-muted)' : 'var(--gradient-btn)',
              color: '#fff',
              fontSize: '1rem',
              fontFamily: FUNKY_FONT,
              cursor: spinning ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow)',
              transition: 'background 0.2s',
              marginBottom: '1rem',
            }}
          >
            {spinning ? 'Spinning…' : '🎡 Spin!'}
          </motion.button>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Spin the wheel — then answer the question it picks. A correct answer earns 10 points.
          </p>
        </>
      ) : (
        <>
          {/* The wheel landed — now the QUESTION for that segment. */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: '1.15rem',
              fontFamily: FUNKY_FONT,
              marginBottom: '0.75rem',
            }}
          >
            🎯 {labels[landedIdx]}
          </motion.div>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '0.75rem',
            color: 'var(--color-text-primary)', fontSize: '1.15rem',
            fontFamily: FUNKY_FONT, boxShadow: 'var(--shadow-card)', textAlign: 'left',
          }}>
            {landedItem?.prompt}
          </div>
          {/* KID ACTIONS (batch 1, item 17): hint, skip, see the answer. */}
          <KidActionsBar
            onHint={selected === null ? useHint : undefined}
            onSkip={selected === null ? skipQuestion : undefined}
            onShowAnswer={selected === null ? revealAnswer : undefined}
            hintUsed={hiddenIdx !== null}
            answerShown={answerRevealed}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {options.map((opt, idx) => {
              if (idx === hiddenIdx) return <div key={idx} aria-hidden="true" />
              let bg = 'var(--color-surface)'
              let border = 'var(--color-border)'
              let color = 'var(--color-text-primary)'
              if (selected !== null) {
                if (idx === correctIndex) { bg = 'var(--color-success)'; border = 'var(--color-success)'; color = '#fff' }
                else if (idx === selected) { bg = 'var(--color-danger)'; border = 'var(--color-danger)'; color = '#fff' }
              }
              return (
                <motion.button key={idx} onClick={() => handleSelect(idx)}
                  whileHover={selected === null ? { scale: 1.02 } : {}}
                  whileTap={selected === null ? { scale: 0.98 } : {}}
                  aria-label={`Option ${idx + 1}: ${opt}`}
                  style={{
                    background: bg, border: `2px solid ${border}`, borderRadius: 'var(--radius)',
                    padding: '0.7rem 0.85rem', color, fontSize: '0.95rem',
                    cursor: selected !== null ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {opt}
                </motion.button>
              )
            })}
          </div>
          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
                role="alert"
                style={{
                  marginTop: '0.75rem', padding: '0.7rem 1rem', borderRadius: 'var(--radius)',
                  background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
                  color: '#fff', fontFamily: FUNKY_FONT, fontSize: '1rem',
                }}>
                {feedback.type === 'correct' ? '✅ ' : '❌ '}{feedback.msg}
              </motion.div>
            )}
          </AnimatePresence>
          {answerRevealed && landedItem?.hint ? (
            <p style={{
              marginTop: '0.75rem', padding: '0.7rem 1rem', borderRadius: 'var(--radius)',
              background: 'color-mix(in srgb, var(--color-warning) 16%, var(--color-surface))',
              border: '2px solid var(--color-warning)',
              color: 'var(--color-text-primary)', fontSize: '0.95rem', textAlign: 'center',
            }}>
              💡 Why: {landedItem.hint}
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
              Got it — next spin →
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
