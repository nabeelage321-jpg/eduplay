'use client'

import { useThemeStore } from '@/lib/store/theme-store'
import { useThemeIntroStore } from '@/lib/store/theme-intro-store'
import { getThemeIntro } from '@/lib/theme-intros'
import type { Audience, KidsTheme, RoleTheme } from '@/types'
import { TILES } from './tiles'

// Visible "Choose your theme" section for the homepage. This is an
// ADDITIONAL entry point — the Navbar palette button is untouched and
// still works exactly as before.
// The 3 main themes are correct by design: Ladies, Gents and Kids are
// AUDIENCES, not the whole theme system. Kids has 15 sub-themes below,
// and the 4 role looks are a separate, device-only layer on top.
const AUDIENCES: { id: Audience; emoji: string; label: string; blurb: string }[] = [
  { id: 'ladies', emoji: '🌸', label: 'Ladies', blurb: 'Elegant, calm learning' },
  { id: 'gents', emoji: '🎓', label: 'Gents', blurb: 'Professional, focused learning' },
  { id: 'kids', emoji: '🎮', label: 'Kids', blurb: 'Fun, colourful adventure' },
]

const KIDS_THEMES: { id: KidsTheme; emoji: string; label: string }[] = [
  { id: 'space', emoji: '🚀', label: 'Space' },
  { id: 'ocean', emoji: '🌊', label: 'Ocean' },
  { id: 'jungle', emoji: '🌿', label: 'Jungle' },
  { id: 'princess', emoji: '👑', label: 'Princess' },
  { id: 'superhero', emoji: '⚡', label: 'Superhero' },
  { id: 'dinosaur', emoji: '🦕', label: 'Dinosaur' },
  { id: 'candy', emoji: '🍭', label: 'Candy' },
  { id: 'farm', emoji: '🐄', label: 'Farm' },
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'magic', emoji: '✨', label: 'Magic' },
  { id: 'astronaut', emoji: '🧑‍🚀', label: 'Astronaut' },
  { id: 'garden', emoji: '🌻', label: 'Garden' },
  { id: 'mountains', emoji: '⛰️', label: 'Mountains' },
  { id: 'sky', emoji: '☁️', label: 'Sky' },
  { id: 'waterfall', emoji: '💧', label: 'Waterfall' },
]

const ROLES: { id: RoleTheme; emoji: string; label: string }[] = [
  { id: 'teacher', emoji: '👩‍🏫', label: 'Teacher' },
  { id: 'student', emoji: '🎓', label: 'Student' },
  { id: 'parent', emoji: '👨‍👩‍👧', label: 'Parents' },
  { id: 'creator', emoji: '🎨', label: 'Creator' },
]

export default function ThemeSection() {
  const { audience, kidsTheme, roleTheme, setAudience, setKidsTheme, setRoleTheme } = useThemeStore()
  const requestIntro = useThemeIntroStore((s) => s.requestIntro)

  return (
    <section aria-labelledby="themes-title" style={{ margin: '0 auto', maxWidth: '80rem', padding: '4rem 1rem' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)' }}>
        Make it yours
      </p>
      <h2 id="themes-title" style={{ marginTop: '0.5rem', fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
        Choose your theme
      </h2>
      <p style={{ marginTop: '0.75rem', fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
        Three main themes — Ladies, Gents and Kids — are the audiences. Kids has 15 worlds below, and the role looks are a
        separate layer saved on this device only.
      </p>

      <div style={{ marginTop: '2rem', display: 'grid', gap: '1.5rem' }} className="md:grid-cols-3">
        {AUDIENCES.map((a, i) => {
          const selected = audience === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAudience(a.id)}
              aria-pressed={selected}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.5rem',
                minHeight: '48px',
                borderRadius: '1.5rem',
                border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: selected ? TILES[i % TILES.length] : 'var(--color-surface)',
                padding: '1.5rem',
                textAlign: 'start',
                cursor: 'pointer',
                boxShadow: selected ? '0 6px 0 0 var(--color-border)' : 'none',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '2rem' }}>{a.emoji}</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {a.label}{selected ? ' ✓' : ''}
              </span>
              <span style={{ fontSize: '1rem', color: 'var(--color-text-secondary)' }}>{a.blurb}</span>
            </button>
          )
        })}
      </div>

      <h3 style={{ marginTop: '2.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        Kids worlds — all 15
      </h3>
      <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)' }}>
        Tap a world to switch to Kids and apply it. Tapping a world turns off a role look, so the world&apos;s own colours
        show — a role look otherwise keeps its colours on top. Tap any world for its short intro (under a minute, Skip anytime).
      </p>
      <ul style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', listStyle: 'none', padding: 0 }} aria-label="Kids themes">
        {KIDS_THEMES.map((k, i) => {
          const selected = audience === 'kids' && kidsTheme === k.id
          return (
            <li key={k.id}>
              <button
                type="button"
                onClick={() => { setAudience('kids'); setKidsTheme(k.id); const intro = getThemeIntro(k.id); if (intro) requestIntro(intro) }}
                aria-pressed={selected}
                style={{
                  display: 'inline-flex',
                  minHeight: '48px',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '9999px',
                  border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: selected ? TILES[i % TILES.length] : 'var(--color-surface)',
                  padding: '0 1.25rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                {k.emoji} {k.label}
              </button>
            </li>
          )
        })}
      </ul>

      <h3 style={{ marginTop: '2.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        Role looks — Teacher, Student, Parents, Creator
      </h3>
      <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)' }}>
        A role look is saved on this device only. Tap again to turn it off.
      </p>
      <ul style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', listStyle: 'none', padding: 0 }} aria-label="Role looks">
        {ROLES.map((r) => {
          const selected = roleTheme === r.id
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setRoleTheme(selected ? null : r.id)}
                aria-pressed={selected}
                style={{
                  display: 'inline-flex',
                  minHeight: '48px',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '9999px',
                  border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: selected ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                  padding: '0 1.25rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                {r.emoji} {r.label}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
