// Theme store — built in Phase 1
// This file is referenced here for import resolution only.
// The actual implementation is in Phase 1's theme-store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Audience, KidsTheme } from '@/types'

interface ThemeStore {
  audience: Audience
  kidsTheme: KidsTheme
  locale?: string
  hasOnboarded?: boolean
  setAudience: (audience: Audience) => void
  setKidsTheme: (kidsTheme: KidsTheme) => void
  setLocale: (locale: string) => void
  completeOnboarding: (config?: { audience?: Audience; language?: string; direction?: string; kidsTheme?: KidsTheme }) => void
  resetTheme: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      audience: 'ladies',
      kidsTheme: 'space',
      locale: 'en',
      hasOnboarded: false,
      setAudience: (audience) => {
        set({ audience })
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', audience)
        }
      },
      setKidsTheme: (kidsTheme) => {
        set({ kidsTheme })
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-kids-theme', kidsTheme)
        }
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
        set({ audience: 'ladies', kidsTheme: 'space', hasOnboarded: false })
      },
    }),
    { name: 'theme-store' }
  )
)
