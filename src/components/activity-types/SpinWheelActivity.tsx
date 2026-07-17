'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL } from './shared'

const COLORS = [
  'var(--color-primary)',
  'var(--color-primary-dark)',
  'var(--color-primary-light)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-danger)',
]

export default function SpinWheelActivity({ items, locale, onComplete }: ActivityProps) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [spunCount, setSpunCount] = useState(0)
  const rtl = isRTL(locale)
  const labels = items.map((i) => i.answer)
  const n = labels.length
  const segAngle = 360 / n

  function spin() {
    if (spinning) return
    setSpinning(true)
    setResult(null)
    const extra = 1800 + Math.random() * 720
    const newRotation = rotation + extra
    setRotation(newRotation)

    setTimeout(() => {
      const normalised = ((newRotation % 360) + 360) % 360
      const idx = Math.floor(((360 - normalised) % 360) / segAngle) % n
      setResult(labels[idx])
      setSpinning(false)
      setSpunCount((c) => c + 1)
      if (spunCount + 1 >= 3) onComplete(30)
    }, 3000)
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

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
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
          fontFamily: 'var(--font-display)',
          cursor: spinning ? 'not-allowed' : 'pointer',
          boxShadow: 'var(--shadow)',
          transition: 'background 0.2s',
          marginBottom: '1rem',
        }}
      >
        {spinning ? 'Spinning…' : '🎡 Spin!'}
      </motion.button>

      {result && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-primary)',
            color: '#fff',
            fontSize: '1.25rem',
            fontFamily: 'var(--font-display)',
          }}
        >
          🎯 {result}
        </motion.div>
      )}

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Spins: {spunCount} / 3
      </p>
    </div>
  )
}
