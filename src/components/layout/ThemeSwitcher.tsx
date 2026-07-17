'use client'

import { motion } from 'framer-motion'
import { useThemeStore } from '@/lib/store/theme-store'
import type { Audience, KidsTheme } from '@/types'

const AUDIENCE_OPTIONS: { id: Audience; emoji: string; label: string }[] = [
  { id: 'ladies',    emoji: '🌸', label: 'Ladies' },
  { id: 'gents',     emoji: '🎓', label: 'Gents' },
  { id: 'kids',      emoji: '🎮', label: 'Kids' },
]

const KIDS_THEME_OPTIONS: { id: KidsTheme; emoji: string }[] = [
  { id: 'space',     emoji: '🚀' },
  { id: 'ocean',     emoji: '🌊' },
  { id: 'jungle',    emoji: '🌿' },
  { id: 'princess',  emoji: '👑' },
  { id: 'superhero', emoji: '⚡' },
  { id: 'dinosaur',  emoji: '🦕' },
  { id: 'candy',     emoji: '🍭' },
  { id: 'farm',      emoji: '🐄' },
  { id: 'robot',     emoji: '🤖' },
  { id: 'magic',     emoji: '✨' },
]

export default function ThemeSwitcher({ onClose }: { onClose: () => void }) {
  const { audience, kidsTheme, setAudience, setKidsTheme } = useThemeStore()

  return (
    <div
      className="card p-4 w-72 shadow-lg"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-3"
         style={{ color: 'var(--color-text-muted)' }}>
        Theme
      </p>

      {/* Audience toggle */}
      <div className="flex gap-2 mb-4">
        {AUDIENCE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              setAudience(opt.id)
              if (opt.id !== 'kids') onClose()
            }}
            className="flex-1 py-2 rounded-theme-sm text-sm font-medium transition-all"
            style={{
              background: audience === opt.id ? 'var(--gradient-btn)' : 'var(--color-surface-alt)',
              color: audience === opt.id ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>

      {/* Kids theme grid */}
      {audience === 'kids' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
             style={{ color: 'var(--color-text-muted)' }}>
            Kids Theme
          </p>
          <div className="grid grid-cols-5 gap-2">
            {KIDS_THEME_OPTIONS.map((th) => (
              <button
                key={th.id}
                onClick={() => { setKidsTheme(th.id); onClose() }}
                className="p-2 rounded-xl text-xl flex items-center justify-center transition-all"
                style={{
                  background: kidsTheme === th.id ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                  transform: kidsTheme === th.id ? 'scale(1.15)' : 'scale(1)',
                }}
                title={th.id}
              >
                {th.emoji}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
