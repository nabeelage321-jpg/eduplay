import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import ActivityCreator from '@/components/creator/ActivityCreator'
import CreatePageHeader from '@/components/creator/CreatePageHeader'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { canAddImages } from '@/lib/image-approval'
import type { SupportedLocale } from '@/types'

interface Props {
  params: { locale: SupportedLocale }
  searchParams?: { type?: string | string[]; country?: string | string[]; subject?: string | string[]; edit?: string | string[] }
}

export const metadata: Metadata = {
  title: 'Create Activity — EduPlay',
  description: 'Create interactive learning activities for your students — quizzes, games, worksheets and more.',
  robots: { index: false },
}

export default async function CreatePage({ params, searchParams }: Props) {
  const isRTL = params.locale === 'ur' || params.locale === 'ar'
  // IMAGE APPROVAL (batch 1, 2026-11-07): the server resolves the
  // role — the client never decides who may add pictures. Signed
  // out (or a kid) = no picture UI at all.
  let canAddImagesValue = false
  try {
    const sessionUser = await resolveSessionUser()
    canAddImagesValue = canAddImages(sessionUser?.role ?? null)
  } catch {
    canAddImagesValue = false
  }
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
  // BEAT-PLAN BUILD #3: a subject hub links here with ?subject=<name>
  // (e.g. ?subject=Urdu). Pass the raw value through;
  // ActivityCreator/PromptToGame validate it against the known
  // subject list (invalid = no preselection, never a crash).
  const rawSubject = searchParams?.subject
  const initialSubject = Array.isArray(rawSubject) ? rawSubject[0] : rawSubject
  // GAME NUMBER (batch 1, final list 11–14, 2026-11-07): the maker
  // edits the original game with ?edit=<id>. ActivityCreator
  // verifies ownership and pre-fills; a non-maker gets a plain
  // refusal, never the form filled with someone else's game.
  const rawEdit = searchParams?.edit
  const initialEditId = Array.isArray(rawEdit) ? rawEdit[0] : rawEdit

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <CreatePageHeader />

      {/* Creator wizard */}
      <div style={{ padding: '1.5rem 0.5rem' }}>
        <ActivityCreator locale={params.locale} initialType={initialType} initialCountry={initialCountry} initialSubject={initialSubject} initialEditId={initialEditId} canAddImages={canAddImagesValue} />
      </div>
    </div>
  )
}
