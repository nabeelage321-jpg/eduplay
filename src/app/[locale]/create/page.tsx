import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import ActivityCreator from '@/components/creator/ActivityCreator'
import type { SupportedLocale } from '@/types'

interface Props {
  params: { locale: SupportedLocale }
}

export const metadata: Metadata = {
  title: 'Create Activity — EduPlay',
  description: 'Create interactive learning activities for your students — quizzes, games, worksheets and more.',
  robots: { index: false },
}

export default function CreatePage({ params }: Props) {
  const isRTL = params.locale === 'ur' || params.locale === 'ar'

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* Page header */}
      <div style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '1rem',
        textAlign: 'center',
      }}>
        <h1 style={{
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
          marginBottom: '0.2rem',
        }}>
          ✨ Create Activity
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Build an interactive learning experience in minutes
        </p>
      </div>

      {/* Creator wizard */}
      <div style={{ padding: '1.5rem 0.5rem' }}>
        <ActivityCreator locale={params.locale} />
      </div>
    </div>
  )
}
