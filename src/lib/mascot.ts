// EduPlay helper mascot — ONE central place for the mascot's name.
// Rename = change MASCOT_NAME below, one line, nothing else.
// "Twinkle" — from "Twinkle Twinkle Little Star", a rhyme every kid
// worldwide knows; star-related, kid-friendly, no country attached.
// The owner vetoed "Tara" (2026-11-07): it read as Pakistani/Urdu,
// and EduPlay is worldwide — Pakistan is only the wedge.
export const MASCOT_NAME = 'Twinkle'

// Twinkle's speech bubble (the greeting above the roaming mascot) —
// owner order 2026-11-09: it must invite visitors to ask what EduPlay
// has, so they know clicking Twinkle shows all the features. The wheel
// section keeps its own separate "Try Spin and Play!" invite.
export const MASCOT_GREETING = 'Ask me what we have! 💭'

// Roaming anchors: the mascot gently wanders the WHOLE screen — top,
// middle and bottom on both edges — so kids see it walking around
// everywhere, not locked in one corner. left/top are explicit (never
// "auto") so the CSS transition animates the drift. The bottom anchors
// sit 6.5rem above the viewport bottom so the fixed mobile play bar
// never covers it; the top anchors sit 4.5rem down so the header never
// covers it. The centre of the screen is deliberately NOT an anchor —
// that is where the game, the Start button and the right panel live,
// and the mascot must never cover them.
// The mascot button is at most 8rem (128px) wide. Right-edge anchors sit
// 9rem in from the viewport's right edge, so the button's right edge is
// always at least 1rem inside the viewport — the mascot itself can never
// be clipped, at any viewport width. The wrapper is exactly the button
// wide (the helper panel / greeting float above it as absolutely
// positioned popups), so nothing else can push the mascot out either.
export const MASCOT_BUTTON_MAX_REM = 8
export const MASCOT_EDGE_INSET_REM = 9

export type MascotAnchor = {
  id: string
  left: string
  top: string
  side: 'left' | 'right'
}

export const MASCOT_ANCHORS: readonly MascotAnchor[] = [
  { id: 'bottom-right', left: `calc(100vw - ${MASCOT_EDGE_INSET_REM}rem)`, top: 'calc(100dvh - 14.5rem)', side: 'right' },
  { id: 'mid-right', left: `calc(100vw - ${MASCOT_EDGE_INSET_REM}rem)`, top: 'calc(50dvh - 4rem)', side: 'right' },
  { id: 'top-right', left: `calc(100vw - ${MASCOT_EDGE_INSET_REM}rem)`, top: '4.5rem', side: 'right' },
  { id: 'top-left', left: '1rem', top: '4.5rem', side: 'left' },
  { id: 'mid-left', left: '1rem', top: 'calc(50dvh - 4rem)', side: 'left' },
  { id: 'bottom-left', left: '1rem', top: 'calc(100dvh - 14.5rem)', side: 'left' },
]

// Where the helper panel / greeting opens relative to the button. The
// popup grows INWARD from the button's edge — on the right side its
// right edge lines up with the button's right edge (1rem inside the
// viewport), so it can never run past the right edge; the left side
// mirrors it. Vertically it opens above the button, except at the top
// anchors where there is no room above — there it opens below.
// (Live check 2026-11-07 19:06: the panel opened from a right-edge
// anchor read truncated — "I am EduPlay's help…", "Find a ga…".)
export type PopupPlacement = { vertical: 'above' | 'below'; horizontal: 'left' | 'right' }

export function popupPlacement(anchor: MascotAnchor): PopupPlacement {
  return {
    vertical: anchor.id.startsWith('top') ? 'below' : 'above',
    horizontal: anchor.side,
  }
}

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

// The helper panel ("What we have") opens when a visitor clicks
// Twinkle — owner order 2026-11-08. The wheel's Twinkle picture is a
// separate small image, not this component, so it asks for the panel
// with a window event instead of shared state.
export const HELPER_OPEN_EVENT = 'eduplay:open-helper'

// The 10 important features the panel lists. Every href was verified
// against src/app/[locale]/... (2026-11-08): each target has a real
// page.tsx. The wheel is a homepage section, so it links to its anchor
// (id="spin-the-wheel" on the SpinWheel section); the chapter box lives
// at the top of /create, so it links there. Paths are locale-relative;
// the panel prefixes `/${locale}`. The only number anywhere is 65 —
// the real game-type count (ACTIVITY_TYPE_META has 65 slugs).
export type HelperFeature = { title: string; line: string; path: string }

export const HELPER_FEATURES: readonly HelperFeature[] = [
  { title: 'Play Games', line: '65 game types to play — pick one and play!', path: '/play-games' },
  { title: 'Spin the Wheel and Play', line: 'Spin the wheel, land on a game, and play it!', path: '/#spin-the-wheel' },
  { title: 'Live Game Rooms', line: 'Play together — host a game or join with a room code.', path: '/live' },
  { title: 'Make a game with a prompt', line: 'Type a topic and AI makes a game for you.', path: '/prompt-to-game' },
  { title: 'Create a game', line: 'Build your own game, step by step.', path: '/create' },
  { title: 'Make a game from a chapter', line: 'Upload a chapter and turn it into a game.', path: '/create' },
  { title: 'Make a game from a video', line: 'Your video becomes a game to play.', path: '/video-to-game' },
  { title: 'Browse games', line: 'Find games by subject and grade.', path: '/browse' },
  { title: 'Join a game', line: "Enter a teacher's room code — no account needed.", path: '/join' },
  { title: 'Dashboard', line: 'Your saved games and room reports live here.', path: '/dashboard' },
]

// True on the play pages (/en/activity/<id>/play and legacy /en/play/<id>).
export function isPlayPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return pathname.split('/').includes('play')
}

// Wander timing: drift to a new spot every 14s, the move itself takes 7s.
export const MASCOT_WANDER_MS = 14_000
export const MASCOT_MOVE_MS = 7_000
