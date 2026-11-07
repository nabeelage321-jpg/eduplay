// V0 design port: fixed pastel tile colours (design accents, not theme
// variables). All text, surfaces and borders elsewhere use EduPlay's
// CSS-variable theme system, so audience themes still work.
export const TILES = [
  '#FFD9A0', // orange
  '#B2E8E0', // teal
  '#FFE89A', // yellow
  '#BDE0FF', // sky
  '#FFC4D6', // berry
  '#C6E8B8', // leaf
] as const

export const TILE_INK = '#26264A'

// SUBJECT TILE COLOURS (2026-11-07, build-list final 6, item 10):
// one OWN pastel per subject — the 15 subject tiles no longer cycle
// the same 6 colours. Keyed by DB subject slug.
export const SUBJECT_TILE_COLOURS: Record<string, string> = {
  mathematics: '#FFD9A0', // orange
  science: '#B2E8E0', // teal
  english: '#FFE89A', // yellow
  urdu: '#FFC4D6', // berry
  islamiat: '#C6E8B8', // leaf
  history: '#BDE0FF', // sky
  geography: '#D9C8FF', // lavender
  'computer-science': '#FFC9A8', // peach
  art: '#F5B8D4', // pink
  'physical-education': '#A8E6CF', // mint
  biology: '#D8F0A0', // lime
  chemistry: '#E8C8F0', // lilac
  physics: '#9CC8FF', // deep sky
  'social-studies': '#FFE3B3', // cream
  'general-knowledge': '#FFB8B8', // coral
} as const
