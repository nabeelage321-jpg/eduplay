// Theme store — built in Phase 1
// This file is referenced here for import resolution only.
// The actual implementation is in Phase 1's theme-store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Audience, CreatorPalette, KidsTheme, RoleTheme } from '@/types'

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
  locale?: string
  hasOnboarded?: boolean
  setAudience: (audience: Audience) => void
  setKidsTheme: (kidsTheme: KidsTheme) => void
  setRoleTheme: (roleTheme: RoleTheme | null) => void
  setCreatorPalette: (palette: CreatorPalette) => void
  setLocale: (locale: string) => void
  completeOnboarding: (config?: { audience?: Audience; language?: string; direction?: string; kidsTheme?: KidsTheme }) => void
  resetTheme: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      audience: 'ladies',
      kidsTheme: 'space',
      roleTheme: null,
      creatorPalette: 'sunset',
      locale: 'en',
      hasOnboarded: false,
      setAudience: (audience) => {
        set({ audience })
        setHtmlAttr('data-theme', audience)
      },
      setKidsTheme: (kidsTheme) => {
        set({ kidsTheme })
        setHtmlAttr('data-kids-theme', kidsTheme)
      },
      setRoleTheme: (roleTheme) => {
        set({ roleTheme })
        if (roleTheme) setHtmlAttr('data-role-theme', roleTheme)
        else if (typeof document !== 'undefined') document.documentElement.removeAttribute('data-role-theme')
      },
      setCreatorPalette: (palette) => {
        set({ creatorPalette: palette })
        setHtmlAttr('data-creator-palette', palette)
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
        set({ audience: 'ladies', kidsTheme: 'space', roleTheme: null, creatorPalette: 'sunset', hasOnboarded: false })
        if (typeof document !== 'undefined') {
          document.documentElement.removeAttribute('data-role-theme')
          document.documentElement.removeAttribute('data-creator-palette')
        }
      },
    }),
    { name: 'theme-store' }
  )
)
