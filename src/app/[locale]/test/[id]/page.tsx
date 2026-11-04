import type { Metadata } from 'next'
import TestGameView from '@/components/game/TestGameView'
import type { SupportedLocale } from '@/types'

// Public test view (kids social approval v1). A test link is a shareable
// URL, not a browseable page, so it is kept out of search results —
// exactly like the /challenge view. Pending games never appear in
// browse (browse lists is_public rows only); this page is reached only
// through the test link itself.
export const metadata: Metadata = {
  title: 'Test a game | EduPlay',
  description: 'Test a kid-made EduPlay game and approve it if it is good.',
  robots: { index: false },
}

interface TestPageProps {
  params: { locale: string; id: string }
}

export default function TestPage({ params }: TestPageProps) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }} role="main">
      <TestGameView gameId={params.id} locale={params.locale as SupportedLocale} />
    </div>
  )
}
