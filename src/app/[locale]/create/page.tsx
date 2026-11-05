import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import ActivityCreator from '@/components/creator/ActivityCreator'
import CreatePageHeader from '@/components/creator/CreatePageHeader'
import type { SupportedLocale } from '@/types'

interface Props {
  params: { locale: SupportedLocale }
  searchParams?: { type?: string | string[]; country?: string | string[] }
}

export const metadata: Metadata = {
  title: 'Create Activity — EduPlay',
  description: 'Create interactive learning activities for your students — quizzes, games, worksheets and more.',
  robots: { index: false },
}

export default function CreatePage({ params, searchParams }: Props) {
  const isRTL = params.locale === 'ur' || params.locale === 'ar'
  // SINGLE-GAME MAKER ENTRY (2026-11-04): a type hub links here with
  // ?type=<slug>. Pass the raw value through; ActivityCreator
  // validates it against the known type list (invalid = no
  // preselection, never a crash).
  const rawType = searchParams?.type
  const initialType = Array.isArray(rawType) ? rawType[0] : rawType
  // BEAT-PLAN BUILD #1: a curriculum hub links here with
  // ?country=<name> (e.g. ?country=Pakistan). Pass the raw value
  // through; ActivityCreator/PromptToGame validate it against the
  // known country list (invalid = General, never a crash).
  const rawCountry = searchParams?.country
  const initialCountry = Array.isArray(rawCountry) ? rawCountry[0] : rawCountry

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <CreatePageHeader />

      {/* Creator wizard */}
      <div style={{ padding: '1.5rem 0.5rem' }}>
        <ActivityCreator locale={params.locale} initialType={initialType} initialCountry={initialCountry} />
      </div>
    </div>
  )
}
