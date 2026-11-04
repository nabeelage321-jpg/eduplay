import type { Metadata } from 'next'
import ChallengeView from '@/components/game/ChallengeView'
import { parseChallengeParams } from '@/lib/challenges'

// Public challenge view (Challenges v1, link-only). A challenge link is
// a shareable URL, not a browseable page, so it is kept out of search
// results — exactly like the /make funnel entry page.
export const metadata: Metadata = {
  title: 'Challenge | EduPlay',
  description: 'Join an EduPlay challenge with its PIN before the deadline.',
  robots: { index: false },
}

interface ChallengePageProps {
  params: { locale: string }
  searchParams: Record<string, string | string[] | undefined>
}

export default function ChallengePage({ params, searchParams }: ChallengePageProps) {
  const challenge = parseChallengeParams(searchParams)
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }} role="main">
      <ChallengeView
        locale={params.locale}
        gameId={challenge.gameId}
        pin={challenge.pin}
        group={challenge.group}
        deadline={challenge.deadline}
      />
    </div>
  )
}
