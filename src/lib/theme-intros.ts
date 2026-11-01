// Theme-intro registry — one entry per Kids world, added WITHOUT
// rewriting the player.
//
// A Kids world gets a short intro only when it has an entry here.
// Every other world maps to null, so tapping it just applies its
// colours (the existing theme-store behaviour) and plays nothing.
// To add a future world (Garden, Mountains, ...), add its storyboard
// component, add its id to ThemeIntroId, and point its entry here —
// ThemeSection, ThemeSwitcher and ThemeIntroHost do not change.
//
// An intro is NEVER auto-played: it is requested only by an explicit
// tap on that world (see ThemeIntroHost), never on page load.
import type { KidsTheme } from '@/types'

export type ThemeIntroId =
  | 'space' | 'ocean' | 'jungle' | 'princess' | 'superhero'
  | 'dinosaur' | 'candy' | 'farm' | 'robot' | 'magic'
  | 'astronaut' | 'garden' | 'mountains' | 'sky' | 'waterfall'

export const THEME_INTRO_BY_KIDS_THEME: Record<KidsTheme, ThemeIntroId | null> = {
  space: 'space',
  ocean: 'ocean',
  jungle: 'jungle',
  princess: 'princess',
  superhero: 'superhero',
  dinosaur: 'dinosaur',
  candy: 'candy',
  farm: 'farm',
  robot: 'robot',
  magic: 'magic',
  astronaut: 'astronaut',
  garden: 'garden',
  mountains: 'mountains',
  sky: 'sky',
  waterfall: 'waterfall',
}

export function getThemeIntro(kidsTheme: KidsTheme): ThemeIntroId | null {
  return THEME_INTRO_BY_KIDS_THEME[kidsTheme] ?? null
}
