'use client'

import { useEffect, useRef } from 'react'

/**
 * Fireworks (2026-11-07, build-list item 4): the finish celebration
 * for good marks (50% and above). Own lightweight canvas particles —
 * no image, no video, no external asset, no copied animation.
 * Bursts of coloured dots launch, rise, and fade; the canvas is
 * decorative only (aria-hidden, pointer-events none) and renders
 * nothing at all when the player prefers reduced motion.
 */

const BURST_COLORS = ['#ff5a8a', '#ffc93c', '#4ade80', '#38bdf8', '#c084fc', '#fb923c']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export default function Fireworks() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement
    const resize = () => {
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
    }
    resize()

    let raf = 0
    let particles: Particle[] = []
    let lastBurst = 0

    const launch = () => {
      const x = canvas.width * (0.15 + Math.random() * 0.7)
      const y = canvas.height * (0.2 + Math.random() * 0.4)
      const color = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)]
      for (let i = 0; i < 42; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 3.2
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 0,
          maxLife: 45 + Math.random() * 25,
          color,
          size: 2 + Math.random() * 2.5,
        })
      }
    }

    const tick = (now: number) => {
      if (now - lastBurst > 700) {
        launch()
        lastBurst = now
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles = particles.filter((p) => p.life < p.maxLife)
      for (const p of particles) {
        p.life += 1
        p.vy += 0.045
        p.x += p.vx
        p.y += p.vy
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
