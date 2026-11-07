'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL, getRandomFeedback } from './shared'
import { choiceRoundLabels } from '@/lib/convert'
import { wheelSpinTo } from '@/lib/random-wheel'
import ScorePill from '@/components/game/ScorePill'
import KidActionsBar from '@/components/game/KidActionsBar'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

const COLORS = [
  'var(--color-primary)', 'var(--color-danger)', 'var(--color-success)',
  'var(--color-warning)', 'var(--color-primary-dark)', 'var(--color-primary-light)',
]

// RANDOM WHEEL — A PROPER GAME (item 34, owner 2026-11-07 13:42 PKT):
// the wheel used to print the full QUESTIONS tiny onto the slices
// (unreadable) and spinning once per item gave FULL marks —
// onComplete(items.length * 10) just for spinning, no answer ever
// required. Now the wheel lands on a question, the question shows
// BIG and fully readable below the wheel, and the kid answers it
// from options: correct +10, wrong 0, next spin. Points ONLY for
// correct answers. The wheel slices carry short number labels only
// (the question is shown big after the spin). The spin target is
// chosen first from the unasked, playable questions and the rotation
// is computed to land on it (see src/lib/random-wheel.ts), so a
// question is never asked twice and the game always finishes. A
// question with no options to borrow (a lone item) is left off the
// wheel; a game with no playable question at all says so honestly
// instead of faking a game. Recent picks stay as a history line.

export default function RandomWheelActivity({ items, locale, onComplete }: ActivityProps) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [asked, setAsked] = useState<Set<number>>(new Set())
  const [currentIdx, setCurrentIdx] = useState<number | null>(null)
  const [options, setOptions] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [hintUsed, setHintUsed] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)

  // Only questions that can offer options are playable — a question
  // needs the correct answer plus something to borrow as a wrong
  // choice. The wheel is built over these only.
  const playable = useMemo(
    () => items.map((_, i) => i).filter((i) => choiceRoundLabels(items, i, 3) !== null),
    [items],
  )
  const n = playable.length
  const segAngle = n > 0 ? 360 / n : 360
  const question = currentIdx !== null ? items[currentIdx] : null

  function spin() {
    if (spinning || answered || finished) return
    const remaining = playable.filter((i) => !asked.has(i))
    if (remaining.length === 0) return
    const target = remaining[Math.floor(Math.random() * remaining.length)]
    const segment = playable.indexOf(target)
    setSpinning(true)
    playEduSound('click', readInteractiveSoundOn())
    setRotation((rot) => wheelSpinTo(rot, segment, n))
    setTimeout(() => {
      setCurrentIdx(target)
      setOptions(shuffleArray(choiceRoundLabels(items, target, 3) ?? [items[target].answer]))
      setSelected(null)
      setAnswered(false)
      setFeedback(null)
      setHintUsed(false)
      setShowAnswer(false)
      setHistory((prev) => [items[target].prompt || items[target].answer, ...prev].slice(0, 5))
      setSpinning(false)
    }, 3000)
  }

  function markAsked(idx: number) {
    setAsked((prev) => new Set(prev).add(idx))
  }

  function nextSpin(finalScore: number, finalCorrect: number) {
    if (currentIdx === null) return
    markAsked(currentIdx)
    const doneCount = asked.size + 1
    setCurrentIdx(null)
    setSelected(null)
    setAnswered(false)
    setFeedback(null)
    setShowAnswer(false)
    if (doneCount >= playable.length) {
      setFinished(true)
      onComplete(finalScore, { correctCount: finalCorrect, totalCount: playable.length })
    }
  }

  function answer(option: string) {
    if (currentIdx === null || answered) return
    const isCorrect = option === items[currentIdx].answer
    setSelected(option)
    setAnswered(true)
    if (isCorrect) {
      const newScore = score + SCORE_PER_CORRECT
      const newCorrect = correctCount + 1
      setScore(newScore)
      setCorrectCount(newCorrect)
      setFeedback({ type: 'correct', msg: getRandomFeedback('correct') })
      playEduSound('correct', readInteractiveSoundOn())
    } else {
      setFeedback({ type: 'wrong', msg: getRandomFeedback('wrong') })
      playEduSound('wrong', readInteractiveSoundOn())
    }
  }

  function useHint() {
    if (currentIdx === null || answered || hintUsed) return
    const wrong = options.filter((o) => o !== items[currentIdx].answer)
    if (wrong.length === 0) return
    const drop = wrong[Math.floor(Math.random() * wrong.length)]
    setOptions((prev) => prev.filter((o) => o !== drop))
    setHintUsed(true)
  }

  function skipQuestion() {
    if (currentIdx === null || answered) return
    setAnswered(true)
    setSelected(null)
    setFeedback({ type: 'wrong', msg: 'Skipped — 0 points' })
  }

  function revealAnswer() {
    if (currentIdx === null || answered) return
    setAnswered(true)
    setSelected(items[currentIdx].answer)
    setShowAnswer(true)
    setFeedback({ type: 'wrong', msg: `The correct answer is "${items[currentIdx].answer}".` })
  }

  function polarToXY(deg: number, r: number) {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: 160 + r * Math.cos(rad), y: 160 + r * Math.sin(rad) }
  }

  function segPath(i: number) {
    const s = i * segAngle, e = s + segAngle
    const sp = polarToXY(s, 150), ep = polarToXY(e, 150)
    return `M 160 160 L ${sp.x} ${sp.y} A 150 150 0 ${segAngle > 180 ? 1 : 0} 1 ${ep.x} ${ep.y} Z`
  }

  function labelPos(i: number) { return polarToXY((i + 0.5) * segAngle, 100) }

  if (finished) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🎡</div>
        <h2 style={{ fontFamily: FUNKY_FONT }}>Random Wheel Done!</h2>
        <p style={{ marginTop: '0.5rem' }}>
          <ScorePill score={score} total={playable.length * SCORE_PER_CORRECT} big />
        </p>
      </motion.div>
    )
  }

  // No question can offer options (e.g. a one-item game): say so
  // honestly instead of spinning for free marks.
  if (playable.length === 0) {
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '2rem 1rem', maxWidth: '440px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>🎡</div>
        <h2 style={{ fontFamily: FUNKY_FONT, color: 'var(--color-text-primary)' }}>This game needs more answers</h2>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Random Wheel asks a question after every spin, and a question needs at least two
          different answers to choose from. This game has only one — add more items and it will play.
        </p>
      </div>
    )
  }

  const wheelSize = currentIdx !== null ? 200 : 320
  const inQuestion = currentIdx !== null

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.75rem 0.5rem', maxWidth: '440px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        <ScorePill score={score} total={playable.length * SCORE_PER_CORRECT} />
        {' · '}
        {asked.size + (inQuestion ? 1 : 0)} of {playable.length} questions
      </p>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Pointer */}
        <div style={{
          position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, width: 0, height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '24px solid var(--color-danger)',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }} />
        <motion.svg
          width={wheelSize} height={wheelSize} viewBox="0 0 320 320"
          animate={{ rotate: rotation }}
          transition={{ duration: 3, ease: [0.17, 0.67, 0.35, 1] }}
          style={{ display: 'block' }}
        >
          {playable.map((_, i) => (
            <g key={i}>
              <path d={segPath(i)} fill={COLORS[i % COLORS.length]} stroke="var(--color-background)" strokeWidth="2" />
              <text
                x={labelPos(i).x} y={labelPos(i).y}
                textAnchor="middle" dominantBaseline="middle"
                fill="#fff" fontSize={n > 10 ? '10' : '13'} fontWeight="700"
                transform={`rotate(${(i + 0.5) * segAngle}, ${labelPos(i).x}, ${labelPos(i).y})`}
              >
                {i + 1}
              </text>
            </g>
          ))}
          <circle cx="160" cy="160" r="18" fill="var(--color-background)" stroke="var(--color-border)" strokeWidth="3" />
          <text x="160" y="160" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="var(--color-text-muted)">●</text>
        </motion.svg>
      </div>

      {!inQuestion && (
        <motion.button
          onClick={spin}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          disabled={spinning}
          aria-label="Spin the random wheel"
          style={{
            marginTop: '1rem', padding: '0.75rem 2.5rem',
            borderRadius: 'var(--radius)', border: 'none',
            background: spinning ? 'var(--color-text-muted)' : 'var(--gradient-btn)',
            color: '#fff', fontFamily: FUNKY_FONT, fontSize: '1rem',
            cursor: spinning ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow)',
          }}
        >
          {spinning ? 'Spinning…' : '🎯 Spin!'}
        </motion.button>
      )}

      {/* The question — big and fully readable, shown AFTER the spin. */}
      {inQuestion && question && (
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{
            color: 'var(--color-text-primary)', fontFamily: FUNKY_FONT,
            fontSize: '1.25rem', lineHeight: 1.4, margin: '0 0 0.75rem',
          }}>
            {question.prompt}
          </p>

          <KidActionsBar
            onHint={!answered && !hintUsed ? useHint : undefined}
            onSkip={!answered ? skipQuestion : undefined}
            onShowAnswer={!answered ? revealAnswer : undefined}
            hintUsed={hintUsed}
            answerShown={showAnswer}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
            {options.map((option) => {
              const isCorrect = option === question.answer
              const isPicked = selected === option
              return (
                <motion.button
                  key={option}
                  onClick={() => answer(option)}
                  disabled={answered}
                  whileHover={!answered ? { scale: 1.03 } : {}}
                  whileTap={!answered ? { scale: 0.97 } : {}}
                  style={{
                    padding: '0.75rem 0.5rem', borderRadius: 'var(--radius)',
                    border: `2px solid ${answered && isCorrect ? 'var(--color-success)' : answered && isPicked ? 'var(--color-danger)' : 'var(--color-border)'}`,
                    background: answered && isCorrect ? 'var(--color-success)' : answered && isPicked ? 'var(--color-danger)' : 'var(--color-surface)',
                    color: answered && (isCorrect || isPicked) ? '#fff' : 'var(--color-text-primary)',
                    fontFamily: FUNKY_FONT, fontSize: '0.95rem', cursor: answered ? 'default' : 'pointer',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {option}
                </motion.button>
              )
            })}
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
                {showAnswer && question.hint && (
                  <span style={{ display: 'block', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    💡 Why: {question.hint}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {answered && (
            <motion.button
              onClick={() => nextSpin(score, correctCount)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                marginTop: '0.75rem', padding: '0.7rem 1.5rem',
                borderRadius: 'var(--radius)', border: 'none',
                background: 'var(--gradient-btn)', color: '#fff',
                fontFamily: FUNKY_FONT, fontSize: '1rem', cursor: 'pointer',
              }}
            >
              {asked.size + 1 >= playable.length ? '🎉 See my score →' : '🎡 Next spin →'}
            </motion.button>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Recent picks:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {history.map((h, i) => (
              <motion.div
                key={`${h}-${i}`}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                style={{
                  padding: '0.4rem 0.75rem', borderRadius: 'var(--radius)',
                  background: i === 0 ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: i === 0 ? '#fff' : 'var(--color-text-secondary)',
                  fontSize: '0.875rem', fontFamily: 'var(--font-body)',
                  border: `1px solid ${i === 0 ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {i === 0 ? '🎯 ' : '  '}{h.length > 60 ? h.slice(0, 60) + '…' : h}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
