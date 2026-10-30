'use client'

import { motion } from 'framer-motion'
import { CREATOR_PALETTES, useThemeStore } from '@/lib/store/theme-store'
import type { Audience, CreatorPalette, KidsTheme, RoleTheme } from '@/types'

const AUDIENCE_OPTIONS: { id: Audience; emoji: string; label: string }[] = [
  { id: 'ladies',    emoji: '🌸', label: 'Ladies' },
  { id: 'gents',     emoji: '🎓', label: 'Gents' },
  { id: 'kids',      emoji: '🎮', label: 'Kids' },
]

const KIDS_THEME_OPTIONS: { id: KidsTheme; emoji: string; label: string }[] = [
  { id: 'space',     emoji: '🚀', label: 'Space' },
  { id: 'ocean',     emoji: '🌊', label: 'Ocean' },
  { id: 'jungle',    emoji: '🌿', label: 'Jungle' },
  { id: 'princess',  emoji: '👑', label: 'Princess' },
  { id: 'superhero', emoji: '⚡', label: 'Superhero' },
  { id: 'dinosaur',  emoji: '🦕', label: 'Dinosaur' },
  { id: 'candy',     emoji: '🍭', label: 'Candy' },
  { id: 'farm',      emoji: '🐄', label: 'Farm' },
  { id: 'robot',     emoji: '🤖', label: 'Robot' },
  { id: 'magic',     emoji: '✨', label: 'Magic' },
  { id: 'astronaut', emoji: '🧑‍🚀', label: 'Astronaut' },
  { id: 'garden',    emoji: '🌻', label: 'Garden' },
  { id: 'mountains', emoji: '⛰️', label: 'Mountains' },
  { id: 'sky',       emoji: '☁️', label: 'Sky' },
  { id: 'waterfall', emoji: '💧', label: 'Waterfall' },
]

const ROLE_OPTIONS: { id: RoleTheme; emoji: string; label: string }[] = [
  { id: 'teacher', emoji: '👩‍🏫', label: 'Teacher' },
  { id: 'student', emoji: '🎓', label: 'Student' },
  { id: 'parent',  emoji: '👨‍👩‍👧', label: 'Parents' },
  { id: 'creator', emoji: '🎨', label: 'Creator' },
]

const CREATOR_PALETTE_LABELS: Record<CreatorPalette, string> = {
  sunset: 'Sunset', forest: 'Forest', 'ocean-blue': 'Ocean blue',
  plum: 'Plum', slate: 'Slate', gold: 'Gold',
}

export default function ThemeSwitcher({ onClose }: { onClose: () => void }) {
  const { audience, kidsTheme, roleTheme, creatorPalette, setAudience, setKidsTheme, setRoleTheme, setCreatorPalette } = useThemeStore()

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
              minHeight: '48px',
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
                  minHeight: '48px',
                  background: kidsTheme === th.id ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                  transform: kidsTheme === th.id ? 'scale(1.15)' : 'scale(1)',
                }}
                title={th.label}
                aria-label={`Kids theme: ${th.label}`}
              >
                {th.emoji}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Role themes — teacher / student / parents / creator */}
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2"
           style={{ color: 'var(--color-text-muted)' }}>
          I am a…
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setRoleTheme(roleTheme === opt.id ? null : opt.id)}
              aria-pressed={roleTheme === opt.id}
              className="py-2 rounded-theme-sm text-sm font-medium transition-all"
              style={{
                minHeight: '48px',
                background: roleTheme === opt.id ? 'var(--gradient-btn)' : 'var(--color-surface-alt)',
                color: roleTheme === opt.id ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
          A role look is saved on this device only. Tap again to turn it off.
        </p>
      </div>

      {/* Creator's own palette — safe fixed list, on their own view */}
      {roleTheme === 'creator' && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
             style={{ color: 'var(--color-text-muted)' }}>
            My creator palette
          </p>
          <div className="grid grid-cols-3 gap-2">
            {CREATOR_PALETTES.map((p) => (
              <button
                key={p}
                onClick={() => setCreatorPalette(p)}
                aria-pressed={creatorPalette === p}
                className="py-2 rounded-theme-sm text-xs font-medium transition-all"
                style={{
                  minHeight: '48px',
                  background: creatorPalette === p ? 'var(--gradient-btn)' : 'var(--color-surface-alt)',
                  color: creatorPalette === p ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {CREATOR_PALETTE_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
