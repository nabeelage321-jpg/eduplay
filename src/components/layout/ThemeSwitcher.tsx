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
} from '@/lib/role-themes'

// Role-first theme panel (build-list item 8, owner order 2026-11-07).
// Same flow as the homepage ThemeSection, compact: pick a role first,
// then see only that role's themes — nothing shows before the role
// pick. Ladies/Gents are gone. Kids keep all 15 worlds UNTOUCHED.
// The old creator palette grid is replaced by the 5 Gen Z themes;
// the palette store field stays for stored state, but the panel no
// longer offers it. Picking a theme applies it exactly as before.
export default function ThemeSwitcher({ onClose }: { onClose: () => void }) {
  const { audience, kidsTheme, roleTheme, themeVariant, setAudience, setKidsTheme, setRoleTheme, setThemeVariant } = useThemeStore()
  const requestIntro = useThemeIntroStore((s) => s.requestIntro)
  const [pickedRole, setPickedRole] = useState<RoleId | null>(null)

  // 'student' is a legacy stored roleTheme value, not a pillar.
  const variantEntry = themeVariant ? getRoleThemeEntry(themeVariant) : undefined
  const activeRole: RoleId | null = variantEntry
    ? variantEntry.role
    : (roleTheme === 'teacher' || roleTheme === 'parent' || roleTheme === 'creator'
        ? roleTheme
        : (audience === 'kids' ? 'kids' : null))

  const pickRole = (role: RoleId) => {
    setPickedRole(role)
    if (role === 'kids') setAudience('kids')
    else setRoleTheme(role)
  }

  const roleThemes = pickedRole ? getThemesForRole(pickedRole) : []
  const pickedPillar = pickedRole ? ROLE_PILLARS.find((p) => p.id === pickedRole) : undefined

  return (
    <div
      className="card p-4 w-72 shadow-lg"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider mb-3"
         style={{ color: 'var(--color-text-muted)' }}>
        Theme
      </p>

      {!pickedRole && (
        <>
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Pick who you are first:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_PILLARS.map((p) => {
              const selected = activeRole === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => pickRole(p.id)}
                  aria-pressed={selected}
                  className="py-2 rounded-theme-sm text-sm font-medium transition-all"
                  style={{
                    minHeight: '48px',
                    background: p.prominent
                      ? 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #0891B2 100%)'
                      : (selected ? 'var(--gradient-btn)' : 'var(--color-surface-alt)'),
                    color: p.prominent || selected ? '#fff' : 'var(--color-text-secondary)',
                  }}
                >
                  {p.emoji} {p.label}
                </button>
              )
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
            Themes are by role, not by gender. A theme is saved on this device only.
          </p>
        </>
      )}

      {pickedRole && pickedPillar && (
        <>
          <button
            onClick={() => setPickedRole(null)}
            className="text-sm font-medium mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            ← Roles
          </button>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {pickedPillar.emoji} {pickedPillar.label} themes
          </p>
          {pickedPillar.prominentNote && (
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {pickedPillar.prominentNote}
            </p>
          )}

          {pickedRole === 'kids' && (
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                 style={{ color: 'var(--color-text-muted)' }}>
                Kids worlds — all 15
              </p>
              <div className="grid grid-cols-5 gap-2">
                {KIDS_WORLDS.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => { setKidsTheme(th.id); const intro = getThemeIntro(th.id); if (intro) requestIntro(intro); onClose() }}
                    className="p-2 rounded-xl text-xl flex items-center justify-center transition-all"
                    style={{
                      minHeight: '48px',
                      background: audience === 'kids' && kidsTheme === th.id && !themeVariant ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                      transform: audience === 'kids' && kidsTheme === th.id && !themeVariant ? 'scale(1.15)' : 'scale(1)',
                    }}
                    title={th.label}
                    aria-label={`Kids theme: ${th.label}`}
                  >
                    {th.emoji}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mt-3 mb-2"
                 style={{ color: 'var(--color-text-muted)' }}>
                Gen Alpha themes
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {roleThemes.map((t) => {
              const selected = themeVariant === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setThemeVariant(t.id)}
                  aria-pressed={selected}
                  className="py-2 px-3 rounded-theme-sm text-sm font-medium text-left transition-all"
                  style={{
                    minHeight: '48px',
                    background: selected ? 'var(--gradient-btn)' : t.background,
                    color: selected ? '#fff' : 'var(--color-text-primary)',
                    border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  {t.emoji} {t.name}{selected ? ' ✓' : ''}
                  <span className="block text-xs font-normal" style={{ color: selected ? 'rgba(255,255,255,0.85)' : 'var(--color-text-muted)' }}>
                    {t.gen} · Font: {FONT_LABELS[t.font]}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
