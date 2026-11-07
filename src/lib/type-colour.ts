import { ACTIVITY_TYPE_META } from '@/lib/activity-type-meta'

/**
 * PER-TYPE COLOURS (2026-11-07, build-list final 6: items 11 + 14).
 *
 * Every game type gets its OWN colour, so a kid recognises a game
 * before reading its name — on the homepage "Browse by game type"
 * pills and on the Popular Activities cards (same hues in both
 * places, so a type looks the same wherever it appears).
 *
 * Hues come from a golden-angle walk over the sorted slug list:
 * deterministic, stable while the type set is stable, and spread
 * across the wheel instead of repeating a 6-colour cycle. The
 * icons are the single source of truth, ACTIVITY_TYPE_META
 * (TypeSelector) — never a second copy of the icon list.
 */
const TYPE_SLUGS_SORTED = [...ACTIVITY_TYPE_META.map((t) => t.slug)].sort()

export function typeHue(slug: string): number {
  const i = TYPE_SLUGS_SORTED.indexOf(slug)
  if (i < 0) return 210
  return Math.round((i * 137.508) % 360)
}

/** Soft pastel tile background for a type (cards). */
export function typeTileColour(slug: string): string {
  return `hsl(${typeHue(slug)}, 70%, 88%)`
}

/** Pill background + border for a type (homepage type pills). */
export function typePillStyle(slug: string): { background: string; borderColor: string; color: string } {
  const h = typeHue(slug)
  return {
    background: `hsl(${h}, 70%, 93%)`,
    borderColor: `hsl(${h}, 55%, 68%)`,
    color: '#26264A',
  }
}

/** One pill's full rendering data: the type's own icon + name + colours. */
export function getTypePill(slug: string): {
  icon: string
  name: string
  background: string
  borderColor: string
} | null {
  const meta = ACTIVITY_TYPE_META.find((t) => t.slug === slug)
  if (!meta) return null
  const style = typePillStyle(slug)
  return { icon: meta.icon, name: meta.name, background: style.background, borderColor: style.borderColor }
}
