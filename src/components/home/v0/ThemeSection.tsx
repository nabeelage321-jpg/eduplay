'use client'

import { useState } from 'react'
import { useThemeStore } from '@/lib/store/theme-store'
import { useThemeIntroStore } from '@/lib/store/theme-intro-store'
import { getThemeIntro } from '@/lib/theme-intros'
import {
  FONT_LABELS,
  KIDS_WORLDS,
  ROLE_PILLARS,
  getRoleThemeEntry,
  getThemesForRole,
  type RoleId,
  type RoleThemeEntry,
} from '@/lib/role-themes'
import { TILES } from './tiles'
import ThemeRequestSection from './ThemeRequestSection'

// Role-first theme section for the homepage (build-list item 8, owner
// order 2026-11-07). Themes are by ROLE, not gender — Ladies/Gents
// are gone. Pick a role first, then see only that role's themes:
// NOTHING shows before the role pick. The 4 pillars are Teacher,
// Parents, Kids, Creator. Kids keep all 15 worlds UNTOUCHED (same
// names, order, emojis). Gen is a FLAVOR inside each role, never a
// top picker. Picking a theme still applies it exactly as before.
export default function ThemeSection() {
  const { audience, kidsTheme, roleTheme, themeVariant, setAudience, setKidsTheme, setRoleTheme, setThemeVariant } = useThemeStore()
  const requestIntro = useThemeIntroStore((s) => s.requestIntro)
  const [pickedRole, setPickedRole] = useState<RoleId | null>(null)

  // Which role is currently applied, for the ✓ on the pillar cards.
  // 'student' is a legacy stored roleTheme value, not a pillar.
  const variantEntry = themeVariant ? getRoleThemeEntry(themeVariant) : undefined
  const activeRole: RoleId | null = variantEntry
    ? variantEntry.role
    : (roleTheme === 'teacher' || roleTheme === 'parent' || roleTheme === 'creator'
        ? roleTheme
        : (audience === 'kids' ? 'kids' : null))

  const pickRole = (role: RoleId) => {
    setPickedRole(role)
    // Picking a pillar also applies that role's base look, as before.
    if (role === 'kids') setAudience('kids')
    else setRoleTheme(role)
  }

  const roleThemes: RoleThemeEntry[] = pickedRole ? getThemesForRole(pickedRole) : []
  const pickedPillar = pickedRole ? ROLE_PILLARS.find((p) => p.id === pickedRole) : undefined

  return (
    <section aria-labelledby="themes-title" style={{ margin: '0 auto', maxWidth: '80rem', padding: '4rem 1rem' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)' }}>
        Make it yours
      </p>
      <h2 id="themes-title" style={{ marginTop: '0.5rem', fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
        Choose your theme
      </h2>
      <p style={{ marginTop: '0.75rem', fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
        Pick who you are first — then see only your themes. Themes are by role, not by gender: a teacher can be a lady
        or a gent. A theme is saved on this device only.
      </p>

      {!pickedRole && (
        <div style={{ marginTop: '2rem', display: 'grid', gap: '1.5rem' }} className="md:grid-cols-2 lg:grid-cols-4">
          {ROLE_PILLARS.map((p, i) => {
            const selected = activeRole === p.id
            const prominent = p.prominent
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => pickRole(p.id)}
                aria-pressed={selected}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  minHeight: '48px',
                  borderRadius: '1.5rem',
                  border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: prominent
                    ? 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #0891B2 100%)'
                    : (selected ? TILES[i % TILES.length] : 'var(--color-surface)'),
                  padding: '1.5rem',
                  textAlign: 'start',
                  cursor: 'pointer',
                  boxShadow: selected || prominent ? '0 6px 0 0 var(--color-border)' : 'none',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '2rem' }}>{p.emoji}</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: prominent ? '#fff' : 'var(--color-text-primary)' }}>
                  {p.label}{selected ? ' ✓' : ''}
                </span>
                <span style={{ fontSize: '1rem', color: prominent ? 'rgba(255,255,255,0.9)' : 'var(--color-text-secondary)' }}>{p.blurb}</span>
                {prominent && p.prominentNote && (
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{p.prominentNote}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {pickedRole && pickedPillar && (
        <div style={{ marginTop: '2rem' }}>
          <button
            type="button"
            onClick={() => setPickedRole(null)}
            style={{
              minHeight: '48px',
              borderRadius: '9999px',
              border: '2px solid var(--color-border)',
              background: 'var(--color-surface)',
              padding: '0 1.25rem',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            ← Change role
          </button>
          <h3 style={{ marginTop: '1.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {pickedPillar.emoji} {pickedPillar.label} themes
          </h3>
          {pickedPillar.prominentNote && (
            <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)' }}>{pickedPillar.prominentNote}</p>
          )}

          {pickedRole === 'kids' && (
            <>
              <h4 style={{ marginTop: '1.5rem', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Kids worlds — all 15
              </h4>
              <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)' }}>
                Tap a world to switch to Kids and apply it. Tapping a world turns off a role look, so the world&apos;s own
                colours show — a role look otherwise keeps its colours on top. Tap any world for its short intro (under a
                minute, Skip anytime).
              </p>
              <ul style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', listStyle: 'none', padding: 0 }} aria-label="Kids themes">
                {KIDS_WORLDS.map((k, i) => {
                  const selected = audience === 'kids' && kidsTheme === k.id && !themeVariant
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

              {/* THEME REQUESTS (2026-11-07, final 6, item 9): below
                  the 15 kids worlds, signed-in users only — the
                  component itself renders nothing when signed out. */}
              <ThemeRequestSection />

              <h4 style={{ marginTop: '2rem', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Gen Alpha themes
              </h4>
              <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)' }}>
                The themes Gen Alpha loves — for kids who make games for their friends.
              </p>
            </>
          )}

          <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }} className="md:grid-cols-2 lg:grid-cols-3">
            {roleThemes.map((t) => {
              const selected = themeVariant === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeVariant(t.id)}
                  aria-pressed={selected}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    minHeight: '48px',
                    borderRadius: '1.5rem',
                    border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: t.background,
                    padding: '1.25rem',
                    textAlign: 'start',
                    cursor: 'pointer',
                    boxShadow: selected ? '0 6px 0 0 var(--color-border)' : 'none',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '9999px',
                      background: t.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                    }}
                  >
                    {t.emoji}
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {t.name}{selected ? ' ✓' : ''}
                  </span>
                  <span style={{ fontSize: '1rem', color: 'var(--color-text-secondary)' }}>{t.blurb}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                    {t.gen} · Font: {FONT_LABELS[t.font]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
