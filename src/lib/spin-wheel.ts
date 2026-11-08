/**
 * Spin the Wheel and Play — pure helpers (2026-11-08, owner order).
 *
 * The homepage wheel has one segment per game type (ACTIVITY_TYPE_META
 * is the single source of truth — 65 types). The wheel is the visual:
 * a spin picks ONE specific real public game first (random offset into
 * the public /api/activities list, so every public game has an equal
 * chance), then the wheel is rotated so it lands on that game's type
 * segment. The pointer sits at the top of the wheel (270 degrees in
 * SVG coordinates: x right, y down, angles clockwise from 3 o'clock).
 *
 * One button, two states (owner correction 2026-11-08 11:16 PKT):
 * "Spin and Play" spins the wheel; once a game has landed the SAME
 * button becomes the Play button and opens that exact game. No
 * separate Play button, no Spin Again button.
 */
import { ACTIVITY_TYPE_META } from '@/lib/activity-type-meta'
import { typeHue } from '@/lib/type-colour'

export interface WheelSegment {
  /** Meta slug (e.g. 'wordsearch'). */
  slug: string
  /** Live DB `activities.type` value (e.g. 'word-search'). */
  dbType: string
  name: string
  icon: string
  /** Slice fill colour — the type's own hue, same as its pills/cards. */
  colour: string
}

/** 'wordsearch' is the one meta slug that differs from its DB value. */
export function dbTypeToMetaSlug(dbType: string): string {
  return dbType === 'word-search' ? 'wordsearch' : dbType
}

export function metaSlugToDbType(slug: string): string {
  return slug === 'wordsearch' ? 'word-search' : slug
}

/** One wheel segment per game type, in ACTIVITY_TYPE_META order. */
export const WHEEL_SEGMENTS: WheelSegment[] = ACTIVITY_TYPE_META.map((t) => ({
  slug: t.slug,
  dbType: metaSlugToDbType(t.slug),
  name: t.name,
  icon: t.icon,
  colour: `hsl(${typeHue(t.slug)}, 70%, 62%)`,
}))

/** Degrees per segment. */
export function segmentAngle(): number {
  return 360 / WHEEL_SEGMENTS.length
}

/** Index of the segment for a live DB type value, or -1 if unknown. */
export function segmentIndexForDbType(dbType: string): number {
  return WHEEL_SEGMENTS.findIndex((s) => s.dbType === dbType)
}

/**
 * Rotation (degrees, clockwise) that brings segment `index`'s centre
 * under the pointer at the top (270 degrees), starting from rotation
 * `from`. Always spins forward at least five full turns, so the wheel
 * visibly spins instead of twitching to its target.
 */
export function rotationForSegment(index: number, from: number): number {
  const seg = segmentAngle()
  const centre = (index + 0.5) * seg
  const want = (((270 - centre) % 360) + 360) % 360
  let r = Math.ceil(from / 360) * 360 + want
  while (r - from < 360 * 5) r += 360
  return r
}

/** A uniform random offset into a list of `total` public games. */
export function randomOffset(total: number): number {
  if (total <= 0) return 0
  return Math.floor(Math.random() * total)
}

/** 'grade-6' -> 'Grade 6', 'pre-k' -> 'Pre-K', 'kg' -> 'KG'. */
export function humanizeGrade(grade: string): string {
  if (grade === 'pre-k') return 'Pre-K'
  if (grade === 'kg') return 'KG'
  const m = /^grade-(\d+)$/.exec(grade)
  if (m) return `Grade ${m[1]}`
  return grade
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
