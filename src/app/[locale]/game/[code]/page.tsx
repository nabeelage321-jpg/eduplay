// src/app/[locale]/game/[code]/page.tsx

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import GamePlayerScreen from '@/components/game/GamePlayerScreen'
import type { Activity } from '@/types'

interface GamePageProps {
  params: {
    locale: string
    code: string
  }
}

export const metadata: Metadata = {
  title: 'Play Game | EduPlay',
  description: 'Join and play interactive learning game',
}

// Mock activity for demo
const mockActivity: Activity = {
  id: '1',
  title: 'Sample Quiz',
  type_id: 'quiz',
  locale: 'en',
  teacher_id: '1',
  is_public: true,
  items: [
    { prompt: 'What is 2+2?', answer: '4', answers: ['4', '5', '3', '6'] },
    { prompt: 'What is the capital of France?', answer: 'Paris', answers: ['Paris', 'London', 'Berlin', 'Rome'] },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export default function GamePage({ params }: GamePageProps): JSX.Element {
  const { code, locale } = params

  // Validate room code format
  if (!code || code.length === 0) {
    notFound()
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-background)' }}
      role="main"
    >
      <GamePlayerScreen roomCode={code} activity={mockActivity} locale={locale} />
    </div>
  )
}

export async function generateStaticParams({
  params,
}: {
  params: { locale: string }
}): Promise<Array<{ locale: string; code: string }>> {
  // Generate static pages for common room codes
  // In production, use ISR (revalidate) instead
  return []
}
