import OnboardingGate from '@/components/onboarding/OnboardingGate'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

interface HomePageProps {
  params: { locale: string }
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'seo' })
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function HomePage({ params }: HomePageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'home' })

 return (
    <OnboardingGate locale={params.locale}>
    <main className="min-h-screen">
      <section className="px-6 py-20 text-center" style={{ backgroundColor: 'var(--color-surface)' }}>
        <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          {t('heroTitle')}
        </h1>
        <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
          {t('heroSubtitle')}
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href={`/${params.locale}/create`}
            className="px-6 py-3 rounded-lg font-semibold"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            {t('startCreating')}
          </Link>
          <Link
            href={`/${params.locale}/activities`}
            className="px-6 py-3 rounded-lg font-semibold border"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
          >
            {t('browseActivities')}
          </Link>
        </div>
      </section>

      <section className="px-6 py-12 grid grid-cols-3 gap-8 text-center max-w-3xl mx-auto">
        <div>
          <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>—</div>
          <div style={{ color: 'var(--color-text-secondary)' }}>{t('statsTeachers')}</div>
        </div>
        <div>
          <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>—</div>
          <div style={{ color: 'var(--color-text-secondary)' }}>{t('statsActivities')}</div>
        </div>
        <div>
          <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>—</div>
          <div style={{ color: 'var(--color-text-secondary)' }}>{t('statsPlays')}</div>
        </div>
      </section>

      <section className="px-6 py-12 text-center">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {t('featuredTitle')}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t('featuredSubtitle')}</p>
      </section>
    </main>
    </OnboardingGate>
  )
}