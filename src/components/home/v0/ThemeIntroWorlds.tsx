// Theme-intro storyboards for the 14 Kids worlds other than Astronaut.
// Original hand-written inline SVG only, one consistent flat EduPlay
// style, NO emoji, NO captions, NO raster images, NO video, NO audio
// files, NO copied rival characters. Each world follows the Astronaut
// pattern: a moving thing travels through its own world (scenes 0-1),
// arrives at a door/place (scene 2), a huge screen is seen from far
// away (scene 3), a kid plays on that screen (scene 4), then the
// camera zooms into the screen and the overlay removes itself,
// revealing the real EduPlay page underneath (scene 5).
// Timings and sound are owned by ThemeIntroWorldOverlay; this file
// only supplies the 6 scenes and the per-world sound notes.

import type { ReactNode } from 'react'

export type WorldIntroId =
  | 'space' | 'ocean' | 'jungle' | 'princess' | 'superhero'
  | 'dinosaur' | 'candy' | 'farm' | 'robot' | 'magic'
  | 'garden' | 'mountains' | 'sky' | 'waterfall'

export type ToneSpec = { from: number; to?: number; dur: number; type: OscillatorType; vol: number; delay?: number }

function Scene({ bg, label, children }: { bg: string; label: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 360 300" width="min(88vw, 340px)" role="img" aria-label={label}>
      <rect width="360" height="300" rx="24" fill={bg} />
      {children}
    </svg>
  )
}

function Move({ anim, children }: { anim: string; children: ReactNode }) {
  return <g className={anim}><g transform="translate(180 150) scale(1.25)">{children}</g></g>
}

// ---- Shared final scenes (world-coloured) ----
function ScreenFar({ room, accent }: { room: string; accent: string }) {
  return (
    <Scene bg={room} label="A huge screen seen from far away">
      <rect x="120" y="90" width="120" height="80" rx="10" fill={accent} />
      <rect x="130" y="100" width="100" height="60" rx="6" fill="#ffffff" />
      <circle cx="155" cy="122" r="10" fill="#f59e0b" />
      <rect x="175" y="112" width="40" height="10" rx="5" fill="#38bdf8" />
      <rect x="175" y="130" width="28" height="10" rx="5" fill="#22c55e" />
      <rect x="170" y="170" width="20" height="30" fill="#334155" />
      <rect x="150" y="200" width="60" height="8" rx="4" fill="#334155" />
    </Scene>
  )
}

function KidScene({ shirt, accent }: { shirt: string; accent: string }) {
  return (
    <Scene bg={accent} label="A kid playing a game on a big screen">
      <rect x="60" y="50" width="240" height="130" rx="12" fill="#0f172a" />
      <rect x="72" y="62" width="216" height="106" rx="8" fill="#ffffff" />
      <circle cx="110" cy="105" r="16" fill="#f59e0b" />
      <path d="M 160 90 l 10 22 24 3 -18 16 5 24 -21 -12 -21 12 5 -24 -18 -16 24 -3 Z" fill="#38bdf8" />
      <rect x="235" y="95" width="36" height="36" rx="8" fill="#22c55e" />
      <g aria-hidden="true">
        <circle cx="180" cy="230" r="22" fill="#fcd9b8" />
        <path d="M 158 230 Q 180 208 202 230 L 202 218 Q 180 200 158 218 Z" fill="#1f2937" />
        <circle cx="172" cy="228" r="2" fill="#0f172a" /><circle cx="188" cy="228" r="2" fill="#0f172a" />
        <path d="M 172 238 Q 180 244 188 238" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        <path d="M 150 252 Q 180 240 210 252 L 210 280 L 150 280 Z" fill={shirt} />
        <rect x="120" y="268" width="120" height="12" rx="6" fill="#7c4a2d" />
      </g>
    </Scene>
  )
}

function ZoomScene({ accent }: { accent: string }) {
  return (
    <div className="ti-zoom" style={{ display: 'flex', justifyContent: 'center' }}>
      <svg viewBox="0 0 360 300" width="min(88vw, 340px)" role="img" aria-label="Zooming into the game screen">
        <rect width="360" height="300" rx="24" fill="#0f172a" />
        <rect x="30" y="30" width="300" height="240" rx="16" fill="#ffffff" />
        <circle cx="90" cy="110" r="30" fill="#f59e0b" />
        <path d="M 170 80 l 14 30 32 4 -24 22 7 32 -29 -16 -29 16 7 -32 -24 -22 32 -4 Z" fill={accent} />
        <rect x="250" y="90" width="50" height="50" rx="10" fill="#22c55e" />
        <rect x="60" y="190" width="240" height="16" rx="8" fill="#e2e8f0" />
        <rect x="60" y="218" width="160" height="16" rx="8" fill="#e2e8f0" />
      </svg>
    </div>
  )
}

// ---- Travellers (drawn around the origin, reused in scenes 0-2) ----
function Saucer() {
  return <g aria-hidden="true"><ellipse cx="0" cy="6" rx="38" ry="12" fill="#cbd5e1" /><circle cx="0" cy="-8" r="18" fill="#7dd3fc" /><circle cx="-20" cy="6" r="3" fill="#f59e0b" /><circle cx="0" cy="8" r="3" fill="#22c55e" /><circle cx="20" cy="6" r="3" fill="#ef4444" /></g>
}
function Dolphin() {
  return <g aria-hidden="true"><path d="M -38 0 Q -10 -28 28 -14 Q 40 -8 38 2 Q 10 14 -20 12 Q -38 10 -38 0 Z" fill="#38bdf8" /><path d="M 20 -12 Q 30 -24 38 -20 Q 32 -8 20 -12 Z" fill="#0ea5e9" /><circle cx="26" cy="-6" r="2.5" fill="#0f172a" /><path d="M -30 8 Q -38 18 -28 20 Q -24 12 -30 8 Z" fill="#0ea5e9" /></g>
}
function Monkey() {
  return <g aria-hidden="true"><circle cx="-24" cy="-14" r="9" fill="#92400e" /><circle cx="24" cy="-14" r="9" fill="#92400e" /><circle cx="0" cy="-10" r="20" fill="#b45309" /><circle cx="0" cy="-6" r="12" fill="#fcd9b8" /><circle cx="-7" cy="-10" r="2" fill="#0f172a" /><circle cx="7" cy="-10" r="2" fill="#0f172a" /><ellipse cx="0" cy="26" rx="18" ry="16" fill="#b45309" /><path d="M 18 20 Q 38 10 34 -8" fill="none" stroke="#92400e" strokeWidth="5" strokeLinecap="round" /></g>
}
function Coach() {
  return <g aria-hidden="true"><rect x="-34" y="-22" width="56" height="34" rx="10" fill="#f472b6" /><path d="M -10 -22 L -4 -34 L 2 -22 Z" fill="#facc15" /><circle cx="0" cy="-28" r="4" fill="#facc15" /><circle cx="-22" cy="20" r="11" fill="#334155" /><circle cx="22" cy="20" r="11" fill="#334155" /><rect x="-6" y="-14" width="20" height="14" rx="3" fill="#fdf2f8" /></g>
}
function Hero() {
  return <g aria-hidden="true"><path d="M -6 -20 Q -44 -8 -48 18 Q -20 6 -6 10 Z" fill="#ef4444" /><circle cx="8" cy="-14" r="16" fill="#fcd9b8" /><path d="M -6 -18 L 22 -16 L 22 -10 L -6 -12 Z" fill="#1e293b" /><circle cx="14" cy="-14" r="2" fill="#0f172a" /><ellipse cx="6" cy="18" rx="16" ry="20" fill="#2563eb" /></g>
}
function Dino() {
  return <g aria-hidden="true"><ellipse cx="0" cy="14" rx="30" ry="18" fill="#22c55e" /><path d="M 24 6 Q 40 -16 46 -26 Q 52 -16 40 8 Z" fill="#22c55e" /><circle cx="42" cy="-22" r="2.5" fill="#0f172a" /><path d="M -28 10 Q -44 2 -48 -10 Q -34 -2 -26 -6 Z" fill="#16a34a" /><path d="M -12 -2 L -4 -14 L 4 -2 Z M 6 -2 L 14 -14 L 22 -2 Z" fill="#facc15" /><circle cx="-18" cy="24" r="7" fill="#16a34a" /><circle cx="18" cy="24" r="7" fill="#16a34a" /></g>
}
function CandyBalloon() {
  return <g aria-hidden="true"><ellipse cx="0" cy="-18" rx="26" ry="30" fill="#f472b6" /><path d="M -26 -18 Q 0 -40 26 -18 Q 0 4 -26 -18 Z" fill="#fbcfe8" opacity="0.6" /><circle cx="0" cy="-18" r="14" fill="#ffffff" /><circle cx="0" cy="-18" r="7" fill="#ef4444" /><rect x="-2" y="12" width="4" height="22" fill="#92400e" /><circle cx="0" cy="38" r="8" fill="#facc15" /></g>
}
function Tractor() {
  return <g aria-hidden="true"><rect x="-34" y="-2" width="58" height="20" rx="6" fill="#ef4444" /><rect x="6" y="-26" width="22" height="26" rx="4" fill="#fca5a5" /><rect x="10" y="-22" width="14" height="12" fill="#dbeafe" /><circle cx="-20" cy="22" r="13" fill="#1f2937" /><circle cx="24" cy="22" r="13" fill="#1f2937" /><circle cx="-20" cy="22" r="5" fill="#94a3b8" /><circle cx="24" cy="22" r="5" fill="#94a3b8" /></g>
}
function Robot() {
  return <g aria-hidden="true"><rect x="-20" y="-30" width="40" height="26" rx="8" fill="#94a3b8" /><circle cx="-10" cy="-17" r="4" fill="#22d3ee" /><circle cx="10" cy="-17" r="4" fill="#22d3ee" /><rect x="-2" y="-42" width="4" height="12" fill="#64748b" /><circle cx="0" cy="-44" r="4" fill="#ef4444" /><rect x="-24" y="0" width="48" height="28" rx="8" fill="#cbd5e1" /><circle cx="-16" cy="36" r="8" fill="#334155" /><circle cx="16" cy="36" r="8" fill="#334155" /></g>
}
function Wand() {
  return <g aria-hidden="true"><rect x="-3" y="-6" width="34" height="5" rx="2.5" fill="#7c3aed" transform="rotate(-24 0 0)" /><path d="M 34 -22 l 5 12 13 2 -10 8 3 13 -11 -7 -11 7 3 -13 -10 -8 13 -2 Z" fill="#facc15" /><path d="M -18 -30 l 2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z M -30 10 l 2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#fde68a" /></g>
}
function Butterfly() {
  return <g aria-hidden="true"><ellipse cx="-20" cy="-10" rx="20" ry="14" fill="#f472b6" transform="rotate(-24 -20 -10)" /><ellipse cx="20" cy="-10" rx="20" ry="14" fill="#f472b6" transform="rotate(24 20 -10)" /><ellipse cx="-18" cy="14" rx="14" ry="10" fill="#f9a8d4" transform="rotate(24 -18 14)" /><ellipse cx="18" cy="14" rx="14" ry="10" fill="#f9a8d4" transform="rotate(-24 18 14)" /><ellipse cx="0" cy="0" rx="6" ry="20" fill="#7c2d12" /><circle cx="0" cy="-24" r="7" fill="#7c2d12" /></g>
}
function CableCar() {
  return <g aria-hidden="true"><rect x="-30" y="-28" width="60" height="34" rx="8" fill="#ef4444" /><rect x="-20" y="-20" width="40" height="18" rx="4" fill="#dbeafe" /><rect x="-2" y="-38" width="4" height="10" fill="#334155" /><rect x="-28" y="12" width="56" height="6" rx="3" fill="#334155" /><circle cx="-18" cy="30" r="4" fill="#334155" /><circle cx="18" cy="30" r="4" fill="#334155" /></g>
}
function HotBalloon() {
  return <g aria-hidden="true"><ellipse cx="0" cy="-18" rx="30" ry="34" fill="#f97316" /><path d="M 0 -52 Q -18 -40 -16 -10 Q -8 8 0 16 Q 8 8 16 -10 Q 18 -40 0 -52 Z" fill="#fbbf24" opacity="0.7" /><rect x="-14" y="22" width="28" height="18" rx="4" fill="#92400e" /><rect x="-2" y="8" width="4" height="14" fill="#92400e" /></g>
}
function Boat() {
  return <g aria-hidden="true"><path d="M -36 8 L 36 8 L 26 30 L -26 30 Z" fill="#7c4a2d" /><rect x="-2" y="-32" width="4" height="40" fill="#92400e" /><path d="M 4 -30 L 34 -2 L 4 -2 Z" fill="#ffffff" /><path d="M -6 -26 L -30 -2 L -6 -2 Z" fill="#38bdf8" /></g>
}

// One travel scene: background + ground + decor + moving traveller.
function Travel({ bg, ground, decor, anim, label, children }: { bg: string; ground?: string; decor?: ReactNode; anim: string; label: string; children: ReactNode }) {
  return (
    <Scene bg={bg} label={label}>
      {decor}
      {ground ? <ellipse cx="180" cy="288" rx="170" ry="22" fill={ground} /> : null}
      <Move anim={anim}>{children}</Move>
    </Scene>
  )
}

function Stars({ n }: { n?: number }) {
  return <g aria-hidden="true" fill="#e2e8f0">{[24, 70, 150, 300, 330, 50, 310, 180, 250].slice(0, n ?? 9).map((x, i) => <circle key={i} cx={x} cy={[30, 70, 24, 40, 110, 170, 200, 90, 150][i]} r="2" />)}</g>
}

type Scenes = [() => ReactNode, () => ReactNode, () => ReactNode, () => ReactNode, () => ReactNode, () => ReactNode]
function world(travel0: () => ReactNode, travel1: () => ReactNode, arrival: () => ReactNode, room: string, accent: string, shirt: string): Scenes {
  return [travel0, travel1, arrival, () => <ScreenFar room={room} accent={accent} />, () => <KidScene shirt={shirt} accent={accent} />, () => <ZoomScene accent={accent} />]
}

const PLANET = <g aria-hidden="true"><circle cx="300" cy="70" r="26" fill="#a78bfa" /><ellipse cx="300" cy="70" rx="40" ry="10" fill="#c4b5fd" transform="rotate(-18 300 70)" /><circle cx="60" cy="220" r="18" fill="#fb923c" /><circle cx="52" cy="214" r="4" fill="#ea580c" /><circle cx="68" cy="226" r="3" fill="#ea580c" /></g>

export const WORLD_SCENES: Record<WorldIntroId, Scenes> = {
  space: world(
    () => <Travel bg="#0a0e2a" anim="ti-fly" label="A flying saucer crossing space" decor={<><Stars /><circle cx="52" cy="52" r="24" fill="#fbbf24" />{PLANET}</>}><Saucer /></Travel>,
    () => <Travel bg="#0a0e2a" anim="ti-fly" label="A flying saucer dodging asteroids" decor={<><Stars /><g fill="#94a3b8"><circle cx="60" cy="80" r="12" /><circle cx="300" cy="180" r="16" /><circle cx="180" cy="240" r="9" /></g></>}><Saucer /></Travel>,
    () => <Travel bg="#312e81" ground="#475569" anim="ti-rise" label="A flying saucer beside a moon base door" decor={<><rect x="230" y="150" width="80" height="90" rx="12" fill="#e2e8f0" /><rect x="255" y="180" width="30" height="60" rx="6" fill="#f97316" /><circle cx="270" cy="150" r="5" fill="#ef4444" /></>}><Saucer /></Travel>,
    '#1e1b4b', '#7c3aed', '#7c3aed',
  ),
  ocean: world(
    () => <Travel bg="#0ea5e9" anim="ti-fly" label="A dolphin swimming over coral" decor={<><g fill="#f472b6"><circle cx="60" cy="240" r="14" /><circle cx="300" cy="250" r="12" /></g><g fill="#22c55e"><path d="M 40 260 Q 50 220 60 260 Z M 290 260 Q 300 225 310 260 Z" /></g><circle className="ti-twinkle" cx="120" cy="80" r="5" fill="#ffffff" /><circle cx="240" cy="60" r="4" fill="#ffffff" /></>}><Dolphin /></Travel>,
    () => <Travel bg="#0284c7" anim="ti-fly" label="A dolphin swimming through bubbles" decor={<><g fill="#ffffff" opacity="0.7"><circle cx="80" cy="200" r="8" /><circle cx="280" cy="120" r="10" /><circle cx="180" cy="60" r="6" /></g><g fill="#16a34a"><path d="M 30 280 Q 45 200 60 280 Z M 300 280 Q 315 210 330 280 Z" /></g></>}><Dolphin /></Travel>,
    () => <Travel bg="#075985" ground="#0c4a6e" anim="ti-rise" label="A dolphin beside an underwater palace door" decor={<><path d="M 240 120 Q 270 100 300 120 L 300 240 L 240 240 Z" fill="#fbcfe8" /><path d="M 255 160 Q 270 140 285 160 L 285 240 L 255 240 Z" fill="#f97316" /><circle cx="270" cy="130" r="6" fill="#facc15" /></>}><Dolphin /></Travel>,
    '#082f49', '#0284c7', '#0284c7',
  ),
  jungle: world(
    () => <Travel bg="#166534" anim="ti-fly" label="A monkey swinging through the jungle" decor={<><g fill="#15803d"><ellipse cx="60" cy="60" rx="50" ry="24" /><ellipse cx="300" cy="50" rx="50" ry="24" /></g><path d="M 60 80 Q 180 130 300 80" fill="none" stroke="#92400e" strokeWidth="5" /></>}><Monkey /></Travel>,
    () => <Travel bg="#15803d" anim="ti-fly" label="A monkey swinging over a river" decor={<><rect y="240" width="360" height="60" fill="#38bdf8" /><path d="M 40 240 Q 180 200 320 240" fill="none" stroke="#92400e" strokeWidth="5" /></>}><Monkey /></Travel>,
    () => <Travel bg="#14532d" ground="#365314" anim="ti-rise" label="A monkey beside a treehouse door" decor={<><rect x="240" y="110" width="90" height="120" rx="12" fill="#92400e" /><path d="M 230 110 L 285 80 L 340 110 Z" fill="#16a34a" /><rect x="268" y="170" width="34" height="60" rx="6" fill="#f97316" /></>}><Monkey /></Travel>,
    '#052e16', '#16a34a', '#16a34a',
  ),
  princess: world(
    () => <Travel bg="#fdf2f8" ground="#fbcfe8" anim="ti-fly" label="A royal coach travelling through a garden" decor={<><g fill="#f472b6"><circle cx="70" cy="220" r="12" /><circle cx="300" cy="210" r="12" /></g><g fill="#22c55e"><ellipse cx="80" cy="250" rx="30" ry="10" /><ellipse cx="290" cy="250" rx="30" ry="10" /></g></>}><Coach /></Travel>,
    () => <Travel bg="#fce7f3" ground="#fbcfe8" anim="ti-fly" label="A royal coach passing castle towers" decor={<><rect x="50" y="90" width="40" height="130" fill="#e2e8f0" /><path d="M 45 90 L 70 60 L 95 90 Z" fill="#f472b6" /><rect x="270" y="110" width="40" height="110" fill="#e2e8f0" /><path d="M 265 110 L 290 80 L 315 110 Z" fill="#f472b6" /></>}><Coach /></Travel>,
    () => <Travel bg="#fbcfe8" ground="#f9a8d4" anim="ti-rise" label="A royal coach beside a castle door" decor={<><path d="M 230 80 L 230 240 L 330 240 L 330 80 Q 280 50 230 80 Z" fill="#ffffff" /><path d="M 258 150 Q 280 130 302 150 L 302 240 L 258 240 Z" fill="#f472b6" /><circle cx="280" cy="100" r="8" fill="#facc15" /></>}><Coach /></Travel>,
    '#500724', '#ec4899', '#ec4899',
  ),
  superhero: world(
    () => <Travel bg="#1d4ed8" anim="ti-fly" label="A superhero flying through the sky" decor={<><g fill="#ffffff" opacity="0.85"><ellipse cx="70" cy="70" rx="34" ry="14" /><ellipse cx="290" cy="60" rx="30" ry="12" /><ellipse cx="180" cy="230" rx="36" ry="14" /></g></>}><Hero /></Travel>,
    () => <Travel bg="#2563eb" anim="ti-fly" label="A superhero flying over a city" decor={<><g fill="#1e293b"><rect x="40" y="150" width="50" height="110" /><rect x="120" y="180" width="40" height="80" /><rect x="260" y="140" width="60" height="120" /></g><g fill="#facc15"><rect x="55" y="170" width="10" height="10" /><rect x="275" y="160" width="10" height="10" /></g></>}><Hero /></Travel>,
    () => <Travel bg="#1e3a8a" ground="#334155" anim="ti-rise" label="A superhero beside a hero headquarters door" decor={<><rect x="230" y="100" width="90" height="140" rx="10" fill="#e2e8f0" /><path d="M 258 160 L 280 140 L 302 160 L 302 240 L 258 240 Z" fill="#ef4444" /><circle cx="280" cy="120" r="10" fill="#facc15" /></>}><Hero /></Travel>,
    '#172554', '#dc2626', '#dc2626',
  ),
  dinosaur: world(
    () => <Travel bg="#bbf7d0" ground="#86efac" anim="ti-fly" label="A dinosaur walking through a valley" decor={<><g fill="#22c55e"><ellipse cx="70" cy="250" rx="40" ry="12" /><ellipse cx="300" cy="250" rx="40" ry="12" /></g><circle cx="300" cy="60" r="22" fill="#fbbf24" /></>}><Dino /></Travel>,
    () => <Travel bg="#a7f3d0" ground="#86efac" anim="ti-fly" label="A dinosaur walking near a volcano" decor={<><path d="M 240 240 L 280 120 L 320 240 Z" fill="#475569" /><path d="M 268 150 L 280 120 L 292 150 Z" fill="#ef4444" /><circle cx="280" cy="100" r="8" fill="#f97316" /></>}><Dino /></Travel>,
    () => <Travel bg="#365314" ground="#3f6212" anim="ti-rise" label="A dinosaur beside a cave door" decor={<><path d="M 220 240 Q 220 120 280 120 Q 340 120 340 240 Z" fill="#57534e" /><path d="M 258 180 Q 280 155 302 180 L 302 240 L 258 240 Z" fill="#f97316" /></>}><Dino /></Travel>,
    '#1a2e05', '#65a30d', '#65a30d',
  ),
  candy: world(
    () => <Travel bg="#fdf2f8" anim="ti-fly" label="A candy balloon floating over candy land" decor={<><g><circle cx="70" cy="220" r="14" fill="#ef4444" /><circle cx="300" cy="210" r="14" fill="#22c55e" /><rect x="66" y="234" width="8" height="20" fill="#92400e" /><rect x="296" y="224" width="8" height="20" fill="#92400e" /></g></>}><CandyBalloon /></Travel>,
    () => <Travel bg="#fce7f3" anim="ti-fly" label="A candy balloon floating over a candy river" decor={<><rect y="240" width="360" height="60" fill="#f9a8d4" /><g fill="#ffffff"><circle cx="80" cy="250" r="10" /><circle cx="280" cy="255" r="10" /></g></>}><CandyBalloon /></Travel>,
    () => <Travel bg="#fbcfe8" ground="#f9a8d4" anim="ti-rise" label="A candy balloon beside a gingerbread house door" decor={<><rect x="235" y="140" width="90" height="100" rx="10" fill="#d97706" /><path d="M 225 140 L 280 105 L 335 140 Z" fill="#ffffff" /><rect x="265" y="180" width="30" height="60" rx="6" fill="#7c2d12" /><circle cx="280" cy="160" r="6" fill="#ef4444" /></>}><CandyBalloon /></Travel>,
    '#500724', '#db2777', '#db2777',
  ),
  farm: world(
    () => <Travel bg="#fef9c3" ground="#a3e635" anim="ti-fly" label="A tractor driving through fields" decor={<><circle cx="300" cy="55" r="22" fill="#fbbf24" /><g fill="#65a30d"><ellipse cx="70" cy="250" rx="34" ry="10" /><ellipse cx="290" cy="250" rx="34" ry="10" /></g></>}><Tractor /></Travel>,
    () => <Travel bg="#fefce8" ground="#a3e635" anim="ti-fly" label="A tractor driving through wheat" decor={<><g stroke="#eab308" strokeWidth="4" strokeLinecap="round"><line x1="60" y1="260" x2="60" y2="220" /><line x1="90" y1="260" x2="90" y2="220" /><line x1="280" y1="260" x2="280" y2="220" /><line x1="310" y1="260" x2="310" y2="220" /></g></>}><Tractor /></Travel>,
    () => <Travel bg="#fde68a" ground="#a3e635" anim="ti-rise" label="A tractor beside a barn door" decor={<><rect x="230" y="120" width="100" height="120" rx="8" fill="#dc2626" /><path d="M 220 120 L 280 85 L 340 120 Z" fill="#7f1d1d" /><path d="M 258 160 L 280 140 L 302 160 L 302 240 L 258 240 Z" fill="#f97316" /></>}><Tractor /></Travel>,
    '#422006', '#dc2626', '#dc2626',
  ),
  robot: world(
    () => <Travel bg="#e2e8f0" ground="#cbd5e1" anim="ti-fly" label="A robot rolling through a circuit city" decor={<><g fill="#94a3b8"><rect x="50" y="150" width="44" height="100" /><rect x="270" y="160" width="44" height="90" /></g><g stroke="#22d3ee" strokeWidth="3"><line x1="50" y1="180" x2="94" y2="180" /><line x1="270" y1="190" x2="314" y2="190" /></g></>}><Robot /></Travel>,
    () => <Travel bg="#dbeafe" ground="#cbd5e1" anim="ti-fly" label="A robot rolling past glowing panels" decor={<><g fill="#22d3ee"><rect x="60" y="200" width="40" height="40" rx="6" /><rect x="260" y="190" width="40" height="40" rx="6" /></g></>}><Robot /></Travel>,
    () => <Travel bg="#cbd5e1" ground="#94a3b8" anim="ti-rise" label="A robot beside a laboratory door" decor={<><rect x="230" y="110" width="90" height="130" rx="10" fill="#f1f5f9" /><rect x="258" y="150" width="34" height="90" rx="6" fill="#22d3ee" /><circle cx="275" cy="130" r="7" fill="#ef4444" /></>}><Robot /></Travel>,
    '#0f172a', '#0891b2', '#0891b2',
  ),
  magic: world(
    () => <Travel bg="#2e1065" anim="ti-fly" label="A magic wand flying with sparkles" decor={<><Stars /><circle cx="300" cy="60" r="18" fill="#fde68a" /></>}><Wand /></Travel>,
    () => <Travel bg="#4c1d95" anim="ti-fly" label="A magic wand flying over a starry castle" decor={<><Stars /><rect x="60" y="170" width="44" height="80" fill="#e2e8f0" /><path d="M 55 170 L 82 140 L 109 170 Z" fill="#facc15" /></>}><Wand /></Travel>,
    () => <Travel bg="#3b0764" ground="#581c87" anim="ti-rise" label="A magic wand beside a magic tower door" decor={<><rect x="245" y="90" width="70" height="150" rx="10" fill="#7e22ce" /><path d="M 240 90 L 280 60 L 320 90 Z" fill="#facc15" /><path d="M 262 160 Q 280 140 298 160 L 298 240 L 262 240 Z" fill="#f97316" /></>}><Wand /></Travel>,
    '#1e1b4b', '#9333ea', '#9333ea',
  ),
  garden: world(
    () => <Travel bg="#dcfce7" anim="ti-fly" label="A butterfly flying over flowers" decor={<><g><circle cx="70" cy="230" r="14" fill="#f472b6" /><circle cx="300" cy="220" r="14" fill="#facc15" /><circle cx="70" cy="230" r="5" fill="#facc15" /><circle cx="300" cy="220" r="5" fill="#ef4444" /></g><g fill="#22c55e"><ellipse cx="80" cy="260" rx="30" ry="8" /><ellipse cx="290" cy="260" rx="30" ry="8" /></g></>}><Butterfly /></Travel>,
    () => <Travel bg="#bbf7d0" anim="ti-fly" label="A butterfly flying between flower beds" decor={<><g fill="#f472b6"><circle cx="60" cy="240" r="12" /><circle cx="180" cy="250" r="12" /><circle cx="300" cy="240" r="12" /></g></>}><Butterfly /></Travel>,
    () => <Travel bg="#86efac" ground="#22c55e" anim="ti-rise" label="A butterfly beside a flower house door" decor={<><rect x="240" y="130" width="85" height="110" rx="12" fill="#fef3c7" /><path d="M 230 130 Q 282 95 335 130 Z" fill="#f472b6" /><rect x="268" y="175" width="30" height="65" rx="6" fill="#16a34a" /></>}><Butterfly /></Travel>,
    '#052e16', '#16a34a', '#16a34a',
  ),
  mountains: world(
    () => <Travel bg="#dbeafe" anim="ti-fly" label="A cable car travelling over snowy peaks" decor={<><path d="M 0 240 L 90 140 L 180 240 Z M 180 240 L 280 120 L 360 240 Z" fill="#e2e8f0" /><path d="M 70 165 L 90 140 L 110 165 Z M 260 145 L 280 120 L 300 145 Z" fill="#ffffff" /><line x1="0" y1="60" x2="360" y2="60" stroke="#334155" strokeWidth="3" /></>}><CableCar /></Travel>,
    () => <Travel bg="#bfdbfe" anim="ti-fly" label="A cable car gliding between mountain peaks" decor={<><path d="M 0 250 L 120 130 L 240 250 Z M 200 250 L 310 150 L 360 250 Z" fill="#94a3b8" /><path d="M 100 155 L 120 130 L 140 155 Z M 290 175 L 310 150 L 330 175 Z" fill="#ffffff" /><line x1="0" y1="70" x2="360" y2="70" stroke="#334155" strokeWidth="3" /></>}><CableCar /></Travel>,
    () => <Travel bg="#93c5fd" ground="#e2e8f0" anim="ti-rise" label="A cable car beside a mountain lodge door" decor={<><rect x="235" y="140" width="90" height="100" rx="10" fill="#92400e" /><path d="M 225 140 L 280 105 L 335 140 Z" fill="#ffffff" /><rect x="265" y="180" width="30" height="60" rx="6" fill="#f97316" /></>}><CableCar /></Travel>,
    '#1e3a5f', '#2563eb', '#2563eb',
  ),
  sky: world(
    () => <Travel bg="#bae6fd" anim="ti-fly" label="A hot-air balloon drifting among clouds" decor={<><g fill="#ffffff" opacity="0.9"><ellipse cx="70" cy="70" rx="34" ry="14" /><ellipse cx="290" cy="60" rx="30" ry="12" /><ellipse cx="180" cy="230" rx="36" ry="14" /></g><path d="M 120 180 Q 140 160 160 180 Q 180 160 200 180" fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" /></>}><HotBalloon /></Travel>,
    () => <Travel bg="#7dd3fc" anim="ti-fly" label="A hot-air balloon drifting past birds" decor={<><g fill="#ffffff" opacity="0.9"><ellipse cx="80" cy="80" rx="32" ry="13" /><ellipse cx="280" cy="200" rx="32" ry="13" /></g><path d="M 100 120 Q 115 105 130 120 M 220 90 Q 235 75 250 90" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" /></>}><HotBalloon /></Travel>,
    () => <Travel bg="#38bdf8" ground="#e0f2fe" anim="ti-rise" label="A hot-air balloon beside a cloud castle door" decor={<><g fill="#ffffff"><ellipse cx="280" cy="130" rx="60" ry="26" /><ellipse cx="250" cy="170" rx="40" ry="20" /><ellipse cx="310" cy="170" rx="40" ry="20" /></g><rect x="265" y="180" width="30" height="60" rx="6" fill="#f97316" /></>}><HotBalloon /></Travel>,
    '#0c4a6e', '#0284c7', '#0284c7',
  ),
  waterfall: world(
    () => <Travel bg="#a5f3fc" anim="ti-fly" label="A boat sailing down a river" decor={<><rect y="240" width="360" height="60" fill="#38bdf8" /><g fill="#22c55e"><ellipse cx="70" cy="240" rx="34" ry="10" /><ellipse cx="300" cy="240" rx="34" ry="10" /></g></>}><Boat /></Travel>,
    () => <Travel bg="#67e8f9" anim="ti-fly" label="A boat riding river rapids" decor={<><rect y="230" width="360" height="70" fill="#0ea5e9" /><g fill="#ffffff" opacity="0.8"><circle cx="80" cy="250" r="10" /><circle cx="280" cy="260" r="12" /><circle cx="180" cy="245" r="8" /></g></>}><Boat /></Travel>,
    () => <Travel bg="#06b6d4" ground="#155e75" anim="ti-rise" label="A boat beside a cave behind a waterfall" decor={<><rect x="240" y="60" width="60" height="180" fill="#a5f3fc" opacity="0.85" /><path d="M 200 240 Q 200 120 280 120 Q 340 120 340 240 Z" fill="#475569" /><path d="M 258 180 Q 280 155 302 180 L 302 240 L 258 240 Z" fill="#f97316" /></>}><Boat /></Travel>,
    '#083344', '#0891b2', '#0891b2',
  ),
}

// Per-world sound notes (scene 1 arpeggio + scene 4 blips vary by world;
// other cues follow the Astronaut v3 shapes). No audio files.
export const WORLD_NOTES: Record<WorldIntroId, { arp: number[]; blips: number[] }> = {
  space: { arp: [880, 1174, 1318, 1568], blips: [523, 659, 784, 659] },
  ocean: { arp: [523, 659, 784, 1046], blips: [440, 554, 659, 554] },
  jungle: { arp: [659, 784, 880, 1046], blips: [523, 587, 659, 784] },
  princess: { arp: [784, 880, 1046, 1174], blips: [659, 784, 880, 1046] },
  superhero: { arp: [392, 523, 659, 784], blips: [523, 659, 784, 1046] },
  dinosaur: { arp: [330, 392, 523, 659], blips: [392, 523, 587, 659] },
  candy: { arp: [1046, 1174, 1318, 1568], blips: [784, 880, 1046, 1174] },
  farm: { arp: [440, 523, 659, 784], blips: [523, 659, 784, 880] },
  robot: { arp: [440, 554, 659, 880], blips: [440, 523, 659, 523] },
  magic: { arp: [880, 1046, 1318, 1568], blips: [659, 880, 1046, 880] },
  garden: { arp: [659, 784, 1046, 1318], blips: [523, 659, 880, 659] },
  mountains: { arp: [523, 659, 784, 1046], blips: [440, 523, 659, 784] },
  sky: { arp: [784, 1046, 1174, 1568], blips: [659, 784, 1046, 784] },
  waterfall: { arp: [523, 784, 1046, 1318], blips: [440, 659, 784, 659] },
}

export function getWorldScenes(id: WorldIntroId): Scenes {
  return WORLD_SCENES[id]
}
