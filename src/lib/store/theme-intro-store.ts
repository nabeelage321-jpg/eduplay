// Theme-intro request store — separate from the theme store on purpose.
//
// The theme store (theme-store.ts) owns colours/audience/role and is
// NOT modified by the intro feature. This tiny, non-persisted store
// only carries "the user just tapped a world that has an intro".
// ThemeIntroHost (mounted in the Navbar, present on every page)
// renders the overlay while pendingIntro is set and clears it when
// the intro ends or is skipped, which unmounts the overlay entirely
// — nothing keeps animating in the background afterwards.
//
// Nothing in this store ever auto-requests an intro: requestIntro is
// called only from an explicit Kids-world tap handler.
import { create } from 'zustand'
import type { ThemeIntroId } from '@/lib/theme-intros'

interface ThemeIntroStore {
  pendingIntro: ThemeIntroId | null
  requestIntro: (intro: ThemeIntroId) => void
  clearIntro: () => void
}

export const useThemeIntroStore = create<ThemeIntroStore>()((set) => ({
  pendingIntro: null,
  requestIntro: (intro) => set({ pendingIntro: intro }),
  clearIntro: () => set({ pendingIntro: null }),
}))
