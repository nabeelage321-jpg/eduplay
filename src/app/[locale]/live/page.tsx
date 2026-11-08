import type { Metadata } from 'next'
import LiveSessionRoom from '@/components/game/LiveSessionRoom'
import { parseLiveCode, parseLiveMode } from '@/lib/live-rooms'

export const metadata: Metadata = {
  title: 'Live Game | EduPlay',
  description: 'Host or join a live EduPlay game with a room code. Interim live flow: polling leaderboard, updated every 3 seconds.',
}

// LIVE ROOMS HOMEPAGE LINK (2026-11-08): the homepage section links
// here with ?mode=host|join&code=XXXXXX. These are initial state
// only — no params means exactly the old behaviour (host mode, empty
// code). No session logic changes here.
export default function LivePage({ params, searchParams }: { params: { locale: string }; searchParams?: { mode?: string | string[]; code?: string | string[] } }) {
  const isRTL = params.locale === 'ur' || params.locale === 'ar'
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '1rem', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: 'clamp(1.25rem, 3vw, 1.5rem)', marginBottom: '0.2rem' }}>
          🎮 Live Game
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Host a game or join with a room code
        </p>
      </div>
      <LiveSessionRoom locale={params.locale} initialMode={parseLiveMode(searchParams?.mode)} initialCode={parseLiveCode(searchParams?.code)} />
    </div>
  )
}
