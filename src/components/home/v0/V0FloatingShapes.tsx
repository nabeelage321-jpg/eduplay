'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Cloud, Dices, Puzzle, Rainbow, Star } from 'lucide-react'
import { TILES, TILE_INK } from './tiles'

// V0 floating-shapes port: same shapes/positions, driven by framer-motion
// (already in the repo) instead of V0's Tailwind-4 animate-float classes,
// which do not exist in EduPlay's Tailwind 3 setup. Static when the user
// prefers reduced motion. aria-hidden, pointer-events none.
const SHAPES = [
  { Icon: Star, tile: TILES[2], className: 'hidden md:flex', top: '6%', insetInlineStart: '4%', size: 80, duration: 6, delay: 0, rotate: -8 },
  { Icon: Cloud, tile: TILES[3], className: 'hidden md:flex', top: '10%', insetInlineEnd: '6%', size: 96, duration: 8, delay: 0.6, rotate: 4 },
  { Icon: Dices, tile: TILES[4], className: 'hidden sm:flex', bottom: '12%', insetInlineStart: '8%', size: 64, duration: 7, delay: 1.2, rotate: 10 },
  { Icon: Rainbow, tile: TILES[5], className: 'hidden md:flex', bottom: '6%', insetInlineEnd: '42%', size: 80, duration: 9, delay: 0.3, rotate: -6 },
  { Icon: Puzzle, tile: TILES[0], className: 'hidden sm:flex', top: '44%', insetInlineEnd: '2%', size: 64, duration: 6.5, delay: 1.8, rotate: 8 },
] as const

export default function V0FloatingShapes() {
  const reduceMotion = useReducedMotion()
  return (
    <div aria-hidden="true" style={{ pointerEvents: 'none', position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-6rem', insetInlineStart: '33%', width: '24rem', height: '24rem', borderRadius: '9999px', background: TILES[2], opacity: 0.4, filter: 'blur(48px)' }} />
      <div style={{ position: 'absolute', bottom: '-8rem', insetInlineEnd: '-5rem', width: '24rem', height: '24rem', borderRadius: '9999px', background: TILES[0], opacity: 0.4, filter: 'blur(48px)' }} />
      {SHAPES.map(({ Icon, tile, className, size, duration, delay, rotate, ...pos }) => {
        const style = {
          position: 'absolute' as const,
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '1.5rem',
          border: '2px solid rgba(0,0,0,0.08)',
          background: tile,
          boxShadow: '0 6px 0 0 rgba(0,0,0,0.08)',
          ...pos,
        }
        const icon = <Icon style={{ width: size / 2, height: size / 2, color: TILE_INK }} strokeWidth={2.25} />
        return reduceMotion ? (
          <div key={tile + String(size) + String(delay)} className={className} style={style}>
            {icon}
          </div>
        ) : (
          <motion.div
            key={tile + String(size) + String(delay)}
            className={className}
            style={{ ...style, rotate }}
            animate={{ y: [0, -14, 0] }}
            transition={{ duration, repeat: Infinity, delay, ease: 'easeInOut' }}
          >
            {icon}
          </motion.div>
        )
      })}
    </div>
  )
}
