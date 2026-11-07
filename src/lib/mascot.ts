// EduPlay helper mascot — ONE central place for the mascot's name.
// Rename = change MASCOT_NAME below, one line, nothing else.
// "Twinkle" — from "Twinkle Twinkle Little Star", a rhyme every kid
// worldwide knows; star-related, kid-friendly, no country attached.
// The owner vetoed "Tara" (2026-11-07): it read as Pakistani/Urdu,
// and EduPlay is worldwide — Pakistan is only the wedge.
export const MASCOT_NAME = 'Twinkle'

// Roaming anchors: the mascot gently wanders the WHOLE screen — top,
// middle and bottom on both edges — so kids see it walking around
// everywhere, not locked in one corner. left/top are explicit (never
// "auto") so the CSS transition animates the drift. The button is up
// to 128px (8rem); the bottom anchors sit 6.5rem above the viewport
// bottom so the fixed mobile play bar never covers it; the top anchors
// sit 4.5rem down so the header never covers it. The centre of the
// screen is deliberately NOT an anchor — that is where the game, the
// Start button and the right panel live, and the mascot must never
// cover them.
export type MascotAnchor = {
  id: string
  left: string
  top: string
  side: 'left' | 'right'
}

export const MASCOT_ANCHORS: readonly MascotAnchor[] = [
  { id: 'bottom-right', left: 'calc(100vw - 9rem)', top: 'calc(100dvh - 14.5rem)', side: 'right' },
  { id: 'mid-right', left: 'calc(100vw - 9rem)', top: 'calc(50dvh - 4rem)', side: 'right' },
  { id: 'top-right', left: 'calc(100vw - 9rem)', top: '4.5rem', side: 'right' },
  { id: 'top-left', left: '1rem', top: '4.5rem', side: 'left' },
  { id: 'mid-left', left: '1rem', top: 'calc(50dvh - 4rem)', side: 'left' },
  { id: 'bottom-left', left: '1rem', top: 'calc(100dvh - 14.5rem)', side: 'left' },
]

// During play the mascot stays at the bottom corners only — never near
// the header/timer, never over the game area or the right panel.
// (Looked up by id, not by index — the anchor order is not the play set.)
export const MASCOT_PLAY_ANCHORS: readonly MascotAnchor[] = [
  MASCOT_ANCHORS.find((a) => a.id === 'bottom-right')!,
  MASCOT_ANCHORS.find((a) => a.id === 'bottom-left')!,
]

// Pick a different anchor than the current one (never sits still twice
// in a row). `random` is injectable so tests can prove the no-repeat rule.
export function pickNextAnchor(
  currentId: string,
  allowed: readonly MascotAnchor[],
  random: () => number = Math.random,
): MascotAnchor {
  if (allowed.length === 0) return MASCOT_ANCHORS[0]
  const others = allowed.filter((a) => a.id !== currentId)
  const pool = others.length > 0 ? others : allowed
  return pool[Math.floor(random() * pool.length)]
}

// True on the play pages (/en/activity/<id>/play and legacy /en/play/<id>).
export function isPlayPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return pathname.split('/').includes('play')
}

// Wander timing: drift to a new spot every 14s, the move itself takes 7s.
export const MASCOT_WANDER_MS = 14_000
export const MASCOT_MOVE_MS = 7_000
