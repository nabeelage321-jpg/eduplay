import type { Metadata } from 'next'
import GameNumberClient from './GameNumberClient'
import type { SupportedLocale } from '@/types'

interface Props {
  params: { locale: SupportedLocale }
  searchParams?: { number?: string | string[] }
}

export const metadata: Metadata = {
  title: 'Find a game by number — EduPlay',
  description: 'Type a game number to open that game, edit it if it is yours, or make your own game from it.',
  robots: { index: false },
}

// GAME NUMBER (batch 1, final list 11–14, 2026-11-07): the SPECIAL
// PLACE to enter a game number. Whoever has the number comes here:
// the MAKER edits the original game, a NON-MAKER uses the game and
// makes their own new game from it (remix — the original never
// changes), everyone else plays. A logged-in user can save the
// number here and find the game later in Dashboard "My saved games".
export default function GameNumberPage({ params, searchParams }: Props) {
  const raw = searchParams?.number
  const initialNumber = Array.isArray(raw) ? raw[0] : raw ?? ''
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <div className="container-page" style={{ padding: '2rem 1rem', maxWidth: '640px' }}>
        <GameNumberClient locale={params.locale} initialNumber={initialNumber} />
      </div>
    </div>
  )
}
