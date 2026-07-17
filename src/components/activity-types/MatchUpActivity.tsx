'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { ActivityProps } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL } from './shared'

interface MatchItem { id: string; prompt: string; answer: string }

export default function MatchUpActivity({ items, locale, onComplete }: ActivityProps) {
  const [pairs, setPairs] = useState<MatchItem[]>([])
  const [rightItems, setRightItems] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const rtl = isRTL(locale)

  useEffect(() => {
    const p: MatchItem[] = items.map((item, i) => ({ id: `item-${i}`, prompt: item.prompt, answer: item.answer }))
    setPairs(p)
    setRightItems(shuffleArray(p.map((x) => x.answer)))
  }, [items])

  function selectLeft(id: string) {
    if (matched.has(id)) return
    setSelected((prev) => (prev === id ? null : id))
  }

  function selectRight(answer: string) {
    if (!selected) return
    const pair = pairs.find((p) => p.id === selected)
    if (!pair) return
    if (pair.answer === answer) {
      const newMatched = new Set(matched).add(selected)
      setMatched(newMatched)
      setScore((s) => s + SCORE_PER_CORRECT)
      setSelected(null)
      if (newMatched.size === pairs.length) { setFinished(true); onComplete(score + SCORE_PER_CORRECT) }
    } else {
      setWrongFlash(answer)
      setTimeout(() => setWrongFlash(null), 600)
    }
  }

  if (finished) return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
      <div style={{ fontSize: '3rem' }}>🎯</div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginTop: '0.5rem' }}>All Matched!</h2>
      <p style={{ color: 'var(--color-text-secondary)' }}>Score: {score}</p>
    </motion.div>
  )

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Select a prompt, then select its matching answer
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {pairs.map((pair) => {
            const isMatched = matched.has(pair.id)
            const isSel = selected === pair.id
            return (
              <motion.button key={pair.id} onClick={() => selectLeft(pair.id)}
                whileHover={!isMatched ? { scale: 1.02 } : {}} aria-pressed={isSel}
                aria-label={`Prompt: ${pair.prompt}`}
                style={{
                  padding: '0.75rem', borderRadius: 'var(--radius)',
                  border: `2px solid ${isMatched ? 'var(--color-success)' : isSel ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: isMatched ? 'var(--color-success)' : isSel ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  color: isMatched ? '#fff' : 'var(--color-text-primary)',
                  cursor: isMatched ? 'default' : 'pointer', opacity: isMatched ? 0.7 : 1,
                  textAlign: rtl ? 'right' : 'left', fontSize: '0.9rem',
                  fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                }}>
                {pair.prompt}
              </motion.button>
            )
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rightItems.map((answer) => {
            const isMatched = pairs.some((p) => p.answer === answer && matched.has(p.id))
            const isWrong = wrongFlash === answer
            return (
              <motion.button key={answer} onClick={() => selectRight(answer)}
                animate={isWrong ? { x: [0, -8, 8, -8, 0] } : {}} transition={{ duration: 0.3 }}
                aria-label={`Answer: ${answer}`}
                style={{
                  padding: '0.75rem', borderRadius: 'var(--radius)',
                  border: `2px solid ${isMatched ? 'var(--color-success)' : isWrong ? 'var(--color-danger)' : 'var(--color-border)'}`,
                  background: isMatched ? 'var(--color-success)' : isWrong ? 'var(--color-danger)' : 'var(--color-surface)',
                  color: isMatched || isWrong ? '#fff' : 'var(--color-text-primary)',
                  cursor: isMatched ? 'default' : 'pointer', opacity: isMatched ? 0.7 : 1,
                  textAlign: rtl ? 'right' : 'left', fontSize: '0.9rem',
                  fontFamily: 'var(--font-body)', transition: 'background 0.2s, border-color 0.2s',
                }}>
                {answer}
              </motion.button>
            )
          })}
        </div>
      </div>
      <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        {matched.size} / {pairs.length} matched · Score: <strong style={{ color: 'var(--color-primary)' }}>{score}</strong>
      </div>
    </div>
  )
}
