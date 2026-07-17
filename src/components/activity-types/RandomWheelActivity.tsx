'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL } from './shared'

const COLORS = [
  'var(--color-primary)', 'var(--color-danger)', 'var(--color-success)',
  'var(--color-warning)', 'var(--color-primary-dark)', 'var(--color-primary-light)',
]

export default function RandomWheelActivity({ items, locale, onComplete }: ActivityProps) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [spins, setSpins] = useState(0)
  const rtl = isRTL(locale)
  const labels = items.map((i) => i.prompt || i.answer)
  const n = labels.length
  const segAngle = 360 / n

  function spin() {
    if (spinning) return
    setSpinning(true)
    const extra = 1800 + Math.random() * 900
    const newRot = rotation + extra
    setRotation(newRot)
    setTimeout(() => {
      const norm = ((newRot % 360) + 360) % 360
      const idx = Math.floor(((360 - norm) % 360) / segAngle) % n
      const picked = labels[idx]
      setHistory((prev) => [picked, ...prev].slice(0, 5))
      setSpinning(false)
      setSpins((s) => {
        if (s + 1 >= items.length) { onComplete(items.length * 10); return s + 1 }
        return s + 1
      })
    }, 3000)
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

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '440px', margin: '0 auto', textAlign: 'center' }}>
      <h3 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', marginBottom: '0.75rem' }}>
        🎡 Random Wheel
      </h3>

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
          width={320} height={320} viewBox="0 0 320 320"
          animate={{ rotate: rotation }}
          transition={{ duration: 3, ease: [0.17, 0.67, 0.35, 1] }}
          style={{ display: 'block' }}
        >
          {labels.map((label, i) => (
            <g key={i}>
              <path d={segPath(i)} fill={COLORS[i % COLORS.length]} stroke="var(--color-background)" strokeWidth="2" />
              <text
                x={labelPos(i).x} y={labelPos(i).y}
                textAnchor="middle" dominantBaseline="middle"
                fill="#fff" fontSize={n > 10 ? '9' : '12'} fontWeight="700"
                transform={`rotate(${(i + 0.5) * segAngle}, ${labelPos(i).x}, ${labelPos(i).y})`}
              >
                {label.length > 12 ? label.slice(0, 12) + '…' : label}
              </text>
            </g>
          ))}
          <circle cx="160" cy="160" r="18" fill="var(--color-background)" stroke="var(--color-border)" strokeWidth="3" />
          <text x="160" y="160" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="var(--color-text-muted)">●</text>
        </motion.svg>
      </div>

      <motion.button
        onClick={spin}
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        disabled={spinning}
        aria-label="Spin the random wheel"
        style={{
          marginTop: '1rem', padding: '0.75rem 2.5rem',
          borderRadius: 'var(--radius)', border: 'none',
          background: spinning ? 'var(--color-text-muted)' : 'var(--gradient-btn)',
          color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem',
          cursor: spinning ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow)',
        }}
      >
        {spinning ? 'Spinning…' : '🎯 Spin!'}
      </motion.button>

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
                }}
              >
                {i === 0 ? '🎯 ' : '  '}{h}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
