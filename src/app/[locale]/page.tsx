import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import ShareGameButton from '@/components/home/ShareGameButton'
import { createServerClient } from '@/lib/supabase/server'
import { DB_SUBJECT_BY_SLUG } from '@/lib/seo/programmatic'

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

const SUBJECT_EMOJI: Record<string, string> = {
  mathematics: '➕', science: '🔬', english: '📖', urdu: '🇵🇰',
  islamiat: '🕌', history: '🏺', geography: '🌍', 'computer-science': '💻',
  art: '🎨', 'physical-education': '⚽', biology: '🧬', chemistry: '⚗️',
  physics: '🚀', 'social-studies': '🌍', 'general-knowledge': '🧠',
}

interface HomeGame {
  id: string
  title: string
  subject: string
  grade: string
  type: string
}

async function fetchHomeGames(): Promise<{ games: HomeGame[]; total: number }> {
  try {
    const supabase = createServerClient()
    const { count } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('is_public', true)
    const { data } = await supabase
      .from('activities')
      .select('id, title, subject, grade, type')
      .eq('is_public', true)
      .order('play_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12)
    return { games: (data ?? []) as HomeGame[], total: count ?? 0 }
  } catch {
    // Never invent games on a DB error: render the honest empty state.
    return { games: [], total: 0 }
  }
}

export default async function HomePage({ params }: HomePageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'home' })
  const { games, total } = await fetchHomeGames()
  const isRTL = params.locale === 'ur' || params.locale === 'ar'

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <Navbar locale={params.locale as never} />
      <main>
        <section className="px-6 py-12 md:py-20 text-center" style={{ backgroundColor: 'var(--color-surface)' }}>
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            {t('heroTitle')}
          </h1>
          <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
            {t('heroSubtitle')}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href={`/${params.locale}/activities`}
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white', minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
            >
              {t('playGames')}
            </Link>
            <Link
              href={`/${params.locale}/browse`}
              className="px-6 py-3 rounded-lg font-semibold border"
              style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
            >
              {t('browseActivities')}
            </Link>
            <Link
              href={`/${params.locale}/create`}
              className="px-6 py-3 rounded-lg font-semibold border"
              style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
            >
              {t('startCreating')}
            </Link>
            <Link
              href={`/${params.locale}/live`}
              className="px-6 py-3 rounded-lg font-semibold border"
              style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
            >
              {t('joinLive')}
            </Link>
          </div>
          <p className="mt-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('changeThemeNote')}
          </p>
        </section>

        <section className="px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center max-w-4xl mx-auto">
          <div>
            <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              {total > 0 ? total.toLocaleString() : '—'}
            </div>
            <div style={{ color: 'var(--color-text-secondary)' }}>{t('statsActivities')}</div>
          </div>
          <div>
            <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>15</div>
            <div style={{ color: 'var(--color-text-secondary)' }}>{t('statsSubjects')}</div>
          </div>
          <div>
            <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>23</div>
            <div style={{ color: 'var(--color-text-secondary)' }}>{t('statsTypes')}</div>
          </div>
          <div>
            <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>11</div>
            <div style={{ color: 'var(--color-text-secondary)' }}>{t('statsLanguages')}</div>
          </div>
        </section>

        <section className="px-6 py-12">
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--color-text-primary)' }}>
            {t('featuredTitle')}
          </h2>
          {games.length === 0 ? (
            <p className="text-center" style={{ color: 'var(--color-text-secondary)' }}>
              {t('featuredSubtitle')}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {games.map((game) => (
                <article
                  key={game.id}
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}
                >
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)', fontSize: '1.05rem' }}>
                    {game.title}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    {game.subject} · {game.grade} · {game.type}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link
                      href={`/${params.locale}/activity/${game.id}/play`}
                      className="px-4 py-2 rounded-lg font-semibold"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'white', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
                    >
                      {t('playThisGame')}
                    </Link>
                    <ShareGameButton locale={params.locale} gameId={game.id} gameTitle={game.title} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="px-6 py-12" style={{ background: 'var(--color-surface-alt)' }}>
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--color-text-primary)' }}>
            {t('popularSubjects')}
          </h2>
          <div className="flex gap-2 justify-center flex-wrap max-w-4xl mx-auto">
            {Object.keys(DB_SUBJECT_BY_SLUG).map((slug) => (
              <Link
                key={slug}
                href={`/${params.locale}/browse?subject=${encodeURIComponent(DB_SUBJECT_BY_SLUG[slug])}`}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
              >
                {SUBJECT_EMOJI[slug] ?? '📚'} {DB_SUBJECT_BY_SLUG[slug]}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
