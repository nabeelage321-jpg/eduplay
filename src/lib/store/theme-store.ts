// Theme store — built in Phase 1
// This file is referenced here for import resolution only.
// The actual implementation is in Phase 1's theme-store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Audience, CreatorPalette, KidsTheme, RoleTheme } from '@/types'
import { getRoleThemeEntry } from '@/lib/role-themes'

export const ROLE_THEMES: RoleTheme[] = ['teacher', 'student', 'parent', 'creator']
export const CREATOR_PALETTES: CreatorPalette[] = ['sunset', 'forest', 'ocean-blue', 'plum', 'slate', 'gold']

function setHtmlAttr(name: string, value: string) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute(name, value)
  }
}

interface ThemeStore {
  audience: Audience
  kidsTheme: KidsTheme
  /** Null = no role theme; role themes override the audience palette. */
  roleTheme: RoleTheme | null
  /** Creator's own palette, only used when roleTheme === 'creator'. */
  creatorPalette: CreatorPalette
  /**
   * Role-first theme variant (build-list item 8, 2026-11-07): the id of
   * one of the 15 entries in src/lib/role-themes.ts, applied as
   * data-theme-variant on <html>. Null = no variant. A variant always
   * wins over the role look / kids world underneath it (its CSS rules
   * sit after them), and it is cleared whenever the role or audience
   * changes away from the variant's own role.
   */
  themeVariant: string | null
  locale?: string
  hasOnboarded?: boolean
  setAudience: (audience: Audience) => void
  setKidsTheme: (kidsTheme: KidsTheme) => void
  setRoleTheme: (roleTheme: RoleTheme | null) => void
  setCreatorPalette: (palette: CreatorPalette) => void
  setThemeVariant: (entryId: string | null) => void
  setLocale: (locale: string) => void
  completeOnboarding: (config?: { audience?: Audience; language?: string; direction?: string; kidsTheme?: KidsTheme }) => void
  resetTheme: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      audience: 'ladies',
      kidsTheme: 'space',
      roleTheme: null,
      creatorPalette: 'sunset',
      themeVariant: null,
      locale: 'en',
      hasOnboarded: false,
      setAudience: (audience) => {
        // Any audience change resets the role-first variant: a variant
        // belongs to exactly one role, and the audience is part of it.
        set({ audience, themeVariant: null })
        setHtmlAttr('data-theme', audience)
        if (typeof document !== 'undefined') document.documentElement.removeAttribute('data-theme-variant')
      },
      setKidsTheme: (kidsTheme) => {
        // An explicit Kids-world tap must visibly change the colours.
        // Role looks are defined later in globals.css at the SAME
        // specificity ([data-theme][data-role-theme] vs
        // [data-theme="kids"][data-kids-theme]), so while a role look
        // is set it masks every Kids colour — the stored kidsTheme
        // changed but the page kept the role's colours, which is the
        // reported "click does nothing" regression (e.g. Creator
        // selected, then a Kids world tapped). Clearing the role look
        // here makes the tap win on both surfaces that call this
        // setter (homepage ThemeSection chips, Navbar palette grid).
        // The creator palette attribute is left in place on purpose:
        // its rules require data-role-theme="creator", so it is inert
        // while no role is set and restores correctly if Creator is
        // re-selected later. Role looks still work: selecting one
        // again overrides until the next Kids-world tap.
        set({ kidsTheme, roleTheme: null, themeVariant: null })
        setHtmlAttr('data-kids-theme', kidsTheme)
        if (typeof document !== 'undefined') {
          document.documentElement.removeAttribute('data-role-theme')
          document.documentElement.removeAttribute('data-theme-variant')
        }
      },
      setRoleTheme: (roleTheme) => {
        // A variant belongs to exactly one role: keep it only when the
        // new role is that variant's role, otherwise clear it.
        const variant = get().themeVariant
        const entry = variant ? getRoleThemeEntry(variant) : undefined
        const keepVariant = !!roleTheme && !!entry && entry.role === roleTheme
        set({ roleTheme, themeVariant: keepVariant ? variant : null })
        if (roleTheme) setHtmlAttr('data-role-theme', roleTheme)
        else if (typeof document !== 'undefined') document.documentElement.removeAttribute('data-role-theme')
        if (!keepVariant && typeof document !== 'undefined') document.documentElement.removeAttribute('data-theme-variant')
      },
      setCreatorPalette: (palette) => {
        set({ creatorPalette: palette })
        setHtmlAttr('data-creator-palette', palette)
      },
      setThemeVariant: (entryId) => {
        if (typeof document === 'undefined') {
          set({ themeVariant: entryId })
          return
        }
        if (!entryId) {
          set({ themeVariant: null })
          document.documentElement.removeAttribute('data-theme-variant')
          // No variant: a stored creator palette applies again.
          if (get().roleTheme === 'creator') setHtmlAttr('data-creator-palette', get().creatorPalette)
          return
        }
        const entry = getRoleThemeEntry(entryId)
        if (!entry) return
        if (entry.role === 'kids') {
          set({ themeVariant: entryId, audience: 'kids', roleTheme: null })
          setHtmlAttr('data-theme', 'kids')
          document.documentElement.removeAttribute('data-role-theme')
        } else {
          set({ themeVariant: entryId, roleTheme: entry.role })
          setHtmlAttr('data-role-theme', entry.role)
        }
        setHtmlAttr('data-theme-variant', entryId)
      },
      setLocale: (locale) => {
        set({ locale })
      },
      completeOnboarding: (config) => {
        set({
          hasOnboarded: true,
          audience: config?.audience ?? 'ladies',
          locale: config?.language ?? 'en',
          kidsTheme: config?.kidsTheme ?? 'space',
        })
      },
      resetTheme: () => {
        set({ audience: 'ladies', kidsTheme: 'space', roleTheme: null, creatorPalette: 'sunset', themeVariant: null, hasOnboarded: false })
        if (typeof document !== 'undefined') {
          document.documentElement.removeAttribute('data-role-theme')
          document.documentElement.removeAttribute('data-creator-palette')
          document.documentElement.removeAttribute('data-theme-variant')
        }
      },
    }),
    { name: 'theme-store' }
  )
)
