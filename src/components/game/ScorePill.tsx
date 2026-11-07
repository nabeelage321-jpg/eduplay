'use client'

import { motion } from 'framer-motion'

// BOLD + COLOURFUL SCORE (batch 1, final list item 19 + owner
// 12:55 PKT; KID-STYLE UPGRADE 2026-11-07, owner 18:08 PKT):
// the score was still small plain text on many play screens, so
// the pill is now the loudest thing on the screen after the game
// itself — big chunky Fredoka One, a white ring, a chunky shadow
// — and it POPS on every score change, so a correct answer feels
// alive. Used on every play screen and on the finish screen.
// Fredoka One, already loaded, no new dependency.
export default function ScorePill({ score, total, big = false }: { score: number; total?: number; big?: boolean }) {
  return (
    <motion.span
      key={score}
      initial={{ scale: 1.4 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3 }}
      aria-live="polite"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        background: 'linear-gradient(135deg, #ff6b9d, #a855f7 50%, #3b82f6)',
        color: '#fff', fontFamily: "'Fredoka One', 'Nunito', system-ui, sans-serif",
        fontWeight: 800, fontSize: big ? '1.9rem' : '1.35rem',
        padding: big ? '0.7rem 1.6rem' : '0.5rem 1.25rem',
        borderRadius: '9999px',
        border: '3px solid #fff',
        boxShadow: '0 4px 0 rgba(0,0,0,0.18), 0 8px 20px rgba(168,85,247,0.45)',
        textShadow: '0 2px 4px rgba(0,0,0,0.25)',
        lineHeight: 1.2, whiteSpace: 'nowrap',
      }}
    >
      ⭐ Score: {score}{total !== undefined ? ` / ${total}` : ''}
    </motion.span>
  )
}
