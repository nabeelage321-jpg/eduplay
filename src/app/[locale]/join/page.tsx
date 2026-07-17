// src/app/[locale]/join/page.tsx

import type { Metadata } from 'next'
import JoinGameScreen from '@/components/game/JoinGameScreen'

interface JoinPageProps {
  params: {
    locale: string
  }
}

export const metadata: Metadata = {
  title: 'Join Game | EduPlay',
  description: 'Join an EduPlay game with a room code',
}

export default function JoinPage({ params }: JoinPageProps): JSX.Element {
  const { locale } = params

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-background)' }}
      role="main"
    >
      <JoinGameScreen locale={locale} />
    </div>
  )
}
