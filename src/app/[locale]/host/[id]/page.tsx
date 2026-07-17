// src/app/[locale]/host/[id]/page.tsx

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import GameTeacherScreen from '@/components/game/GameTeacherScreen'
import type { Activity } from '@/types'

interface HostPageProps {
  params: {
    locale: string
    id: string
  }
}

export const metadata: Metadata = {
  title: 'Host Game | EduPlay',
  description: 'Host and manage interactive learning game',
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

export default function HostPage({ params }: HostPageProps): JSX.Element {
  const { id, locale } = params

  // Validate activity ID format
  if (!id || id.length === 0) {
    notFound()
  }

  // Generate a random room code
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-background)' }}
      role="main"
    >
      <GameTeacherScreen activity={mockActivity} roomCode={roomCode} locale={locale} />
    </div>
  )
}

export async function generateStaticParams({
  params,
}: {
  params: { locale: string }
}): Promise<Array<{ locale: string; id: string }>> {
  // Generate static pages for popular activities
  // In production, use ISR (revalidate) instead
  return []
}
