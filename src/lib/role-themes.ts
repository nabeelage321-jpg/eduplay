// Role-first theme data — single source of truth for the theme page
// (homepage ThemeSection) and the Navbar ThemeSwitcher panel.
// Build-list item 8, owner order 2026-11-07: themes are by ROLE, not
// gender. Ladies/Gents are gone. The 4 pillars are Teacher, Parents,
// Kids, Creator. Gen is a FLAVOR inside each role, never a top picker.
// Gen Beta is OUT (babies). Gen Alpha = kids AND creators; Gen Z =
// creators; Millennials = young parents/teachers AND creators; Gen X =
// the same themes as parents/teachers.
// Every entry is a REAL theme: a palette (primary + background swatch
// shown in the UI; the full palette lives in globals.css under
// [data-theme-variant="<id>"]) + a font (part of the theme, per the
// owner 2026-11-07 09:08 PKT). Fonts reuse what the project already
// loads in globals.css — Nunito, Inter, Fredoka One — no new font
// dependency. Gen Z = bold modern (Inter); Gen Alpha = playful kid
// friendly (Fredoka One display + Nunito body).

import type { KidsTheme } from '@/types'

export type RoleId = 'teacher' | 'parent' | 'kids' | 'creator'

export type ThemeFont = 'nunito' | 'inter' | 'fredoka'

export interface RoleThemeEntry {
  /** data-theme-variant value + stable id. */
  id: string
  role: RoleId
  name: string
  emoji: string
  blurb: string
  /** Which generation this theme speaks to. */
  gen: string
  font: ThemeFont
  /** Palette swatch shown on the theme card. */
  primary: string
  background: string
}

export interface RolePillar {
  id: RoleId
  emoji: string
  label: string
  blurb: string
  /** Creator is distribution — it gets real prominence, not a side pill. */
  prominent?: boolean
  prominentNote?: string
}

export const ROLE_PILLARS: RolePillar[] = [
  { id: 'teacher', emoji: '👩‍🏫', label: 'Teacher', blurb: 'Calm themes for class time' },
  { id: 'parent', emoji: '👨‍👩‍👧', label: 'Parents', blurb: 'Warm themes for home learning' },
  { id: 'kids', emoji: '🎮', label: 'Kids', blurb: '15 worlds + Gen Alpha themes' },
  {
    id: 'creator',
    emoji: '🎨',
    label: 'Creator',
    blurb: 'Stand-out Gen Z themes for your audience',
    prominent: true,
    prominentNote: 'Creators carry EduPlay to the world — these themes are made to stand out on a feed.',
  },
]

// Teachers + Parents share the SAME 5 themes (owner order 2026-11-07).
const SHARED_TEACHER_PARENT_THEMES: Omit<RoleThemeEntry, 'role'>[] = [
  {
    id: 'clean-minimal', name: 'Clean Minimal', emoji: '🤍',
    blurb: 'Warm whites, lots of breathing room', gen: 'Millennials · Gen X',
    font: 'inter', primary: '#2F6B5E', background: '#FDFBF7',
  },
  {
    id: 'calm-focused', name: 'Calm / Focused', emoji: '🌿',
    blurb: 'Low-stimulation, easy on tired eyes', gen: 'Millennials · Gen X',
    font: 'nunito', primary: '#5B7A8C', background: '#F2F5F3',
  },
  {
    id: 'warm-nature', name: 'Warm Nature', emoji: '🌻',
    blurb: 'Earthy greens and warm wood tones', gen: 'Millennials · Gen X',
    font: 'nunito', primary: '#4A6B3A', background: '#F7F3EA',
  },
  {
    id: 'professional-trust', name: 'Professional / Trust', emoji: '💼',
    blurb: 'Structured dashboard, serious and clear', gen: 'Millennials · Gen X',
    font: 'inter', primary: '#1F3A5F', background: '#F2F4F7',
  },
  {
    id: 'soft-classroom', name: 'Soft Friendly Classroom', emoji: '🧸',
    blurb: 'Soft peach, warm and welcoming', gen: 'Millennials · Gen X',
    font: 'nunito', primary: '#D97757', background: '#FFF8F3',
  },
]

// Gen Alpha — the kids' creator side. The 15 worlds below are UNTOUCHED;
// these 5 are separate theme entries on top of them.
const GEN_ALPHA_THEMES: Omit<RoleThemeEntry, 'role'>[] = [
  {
    id: 'gaming-world', name: 'Gaming / Build-a-World', emoji: '🧱',
    blurb: 'Blocky, bright, build-your-own fun', gen: 'Gen Alpha',
    font: 'fredoka', primary: '#7C3AED', background: '#F5F3FF',
  },
  {
    id: 'superheroes', name: 'Superheroes', emoji: '🦸',
    blurb: 'Bold red and blue hero energy', gen: 'Gen Alpha',
    font: 'fredoka', primary: '#DC2626', background: '#FEF2F2',
  },
  {
    id: 'cute-creatures', name: 'Animals & Cute Creatures', emoji: '🐾',
    blurb: 'Soft pastels and friendly animals', gen: 'Gen Alpha',
    font: 'fredoka', primary: '#EC4899', background: '#FDF2F8',
  },
  {
    id: 'dinosaurs', name: 'Dinosaurs', emoji: '🦕',
    blurb: 'Jungle greens and big stompy fun', gen: 'Gen Alpha',
    font: 'fredoka', primary: '#15803D', background: '#F0FDF4',
  },
  {
    id: 'space-adventure', name: 'Space Adventure', emoji: '🛸',
    blurb: 'Deep-space purples and starlight', gen: 'Gen Alpha',
    font: 'fredoka', primary: '#6D28D9', background: '#F5F3FF',
  },
]

// Gen Z — creators.
const GEN_Z_THEMES: Omit<RoleThemeEntry, 'role'>[] = [
  {
    id: 'dopamine-brights', name: 'Dopamine Brights', emoji: '🌈',
    blurb: 'Neon gradients that pop on a feed', gen: 'Gen Z',
    font: 'inter', primary: '#EC4899', background: '#FFF1F2',
  },
  {
    id: 'y2k-aero', name: 'Y2K / Frutiger Aero', emoji: '🫧',
    blurb: 'Glossy aqua, early-2000s shine', gen: 'Gen Z',
    font: 'inter', primary: '#0891B2', background: '#F0FDFA',
  },
  {
    id: 'dark-luxe', name: 'Dark Mode Luxe', emoji: '🌙',
    blurb: 'Neon-noir dark, made for night scrolling', gen: 'Gen Z',
    font: 'inter', primary: '#A78BFA', background: '#0F0F1A',
  },
  {
    id: 'maximalism', name: 'Maximalism', emoji: '🎪',
    blurb: 'Cluttercore — loud, proud, imperfect', gen: 'Gen Z',
    font: 'inter', primary: '#F97316', background: '#FFF7ED',
  },
  {
    id: 'anime-cyberpunk', name: 'Anime / Cyberpunk', emoji: '🤖',
    blurb: 'Neon magenta and cyber cyan', gen: 'Gen Z',
    font: 'inter', primary: '#D946EF', background: '#FDF4FF',
  },
]

export const ROLE_THEME_ENTRIES: Record<RoleId, RoleThemeEntry[]> = {
  teacher: SHARED_TEACHER_PARENT_THEMES.map((t) => ({ ...t, role: 'teacher' as const })),
  parent: SHARED_TEACHER_PARENT_THEMES.map((t) => ({ ...t, role: 'parent' as const })),
  kids: GEN_ALPHA_THEMES.map((t) => ({ ...t, role: 'kids' as const })),
  creator: GEN_Z_THEMES.map((t) => ({ ...t, role: 'creator' as const })),
}

/** All 15 role-theme entries, in role order. */
export const ALL_ROLE_THEME_ENTRIES: RoleThemeEntry[] = [
  ...ROLE_THEME_ENTRIES.teacher,
  ...ROLE_THEME_ENTRIES.parent,
  ...ROLE_THEME_ENTRIES.kids,
  ...ROLE_THEME_ENTRIES.creator,
]

export function getThemesForRole(role: RoleId): RoleThemeEntry[] {
  return ROLE_THEME_ENTRIES[role]
}

export function getRoleThemeEntry(id: string): RoleThemeEntry | undefined {
  return ALL_ROLE_THEME_ENTRIES.find((t) => t.id === id)
}

/** The 15 kids worlds — UNTOUCHED by the role-first redesign: same 15
 * names, same order, same emojis as before. Moved here so the homepage
 * section and the Navbar panel share one list and can never drift. */
export const KIDS_WORLDS: { id: KidsTheme; emoji: string; label: string }[] = [
  { id: 'space', emoji: '🚀', label: 'Space' },
  { id: 'ocean', emoji: '🌊', label: 'Ocean' },
  { id: 'jungle', emoji: '🌿', label: 'Jungle' },
  { id: 'princess', emoji: '👑', label: 'Princess' },
  { id: 'superhero', emoji: '⚡', label: 'Superhero' },
  { id: 'dinosaur', emoji: '🦕', label: 'Dinosaur' },
  { id: 'candy', emoji: '🍭', label: 'Candy' },
  { id: 'farm', emoji: '🐄', label: 'Farm' },
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'magic', emoji: '✨', label: 'Magic' },
  { id: 'astronaut', emoji: '🧑‍🚀', label: 'Astronaut' },
  { id: 'garden', emoji: '🌻', label: 'Garden' },
  { id: 'mountains', emoji: '⛰️', label: 'Mountains' },
  { id: 'sky', emoji: '☁️', label: 'Sky' },
  { id: 'waterfall', emoji: '💧', label: 'Waterfall' },
]

export const FONT_LABELS: Record<ThemeFont, string> = {
  nunito: 'Nunito',
  inter: 'Inter',
  fredoka: 'Fredoka One',
}
