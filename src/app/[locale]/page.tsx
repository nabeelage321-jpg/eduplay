import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import AnimatedHero from '@/components/home/AnimatedHero'
import ShareGameButton from '@/components/home/ShareGameButton'
import JsonLd from '@/components/seo/JsonLd'
import { createServerClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/seo/base-url'
import { DB_SUBJECT_BY_SLUG, DB_TYPE_BY_SLUG } from '@/lib/seo/programmatic'

interface HomePageProps {
  params: { locale: string }
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'seo' })
  const base = getBaseUrl()
  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: `${base}/${params.locale}` },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: `${base}/${params.locale}`,
      siteName: 'EduPlay',
      type: 'website',
    },
  }
}

const SUBJECT_EMOJI: Record<string, string> = {
  mathematics: '➕', science: '🔬', english: '📖', urdu: '🇵🇰',
  islamiat: '🕌', history: '🏺', geography: '🌍', 'computer-science': '💻',
  art: '🎨', 'physical-education': '⚽', biology: '🧬', chemistry: '⚗️',
  physics: '🚀', 'social-studies': '🌍', 'general-knowledge': '🧠',
}

function humanType(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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

// FAQ copy is site copy (own words, not a rival's). Answers lead with the
// direct answer (AEO), then one supporting sentence. Nothing here claims
// a feature that is not live: sharing is link + caption, tester approval
// is described as sharing with friends first, and no selling, rating,
// school count, or testimonial is claimed.
const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is EduPlay?',
    a: 'EduPlay is a place to play and create interactive learning games, quizzes and activities in the browser. Teachers create games, students play them live or on their own, and creators share them with a link.',
  },
  {
    q: 'Do students need an account to play a game?',
    a: 'No. Students join a live game with a code or open a shared play link, without creating an account first. Creating and saving your own games needs a signed-in account.',
  },
  {
    q: 'How do I make a game from a prompt?',
    a: 'Go to Create, type one prompt, and get an editable draft. Edit the draft, preview it, and save it yourself — nothing is published until you save it.',
  },
  {
    q: 'How does a new game get shared and approved?',
    a: 'Share your game with friends first and ask them to play it. Their feedback decides whether it is ready for the public list — the current plan is 12 testers with 3 approvals, and a teacher or parent can still remove a game after it is live.',
  },
  {
    q: 'Which subjects and languages does EduPlay cover?',
    a: '15 subjects, from Math and Science to Urdu and Islamiyat, across pre-k to grade 12, in 11 languages including Urdu and Arabic with right-to-left support. Subjects are tagged by subject, grade and game type, with Pakistan SNC and Islamiyat as first-class subjects.',
  },
  {
    q: 'Can I print a game or play it on a slow connection?',
    a: 'Yes. Printable and low-bandwidth play are first-class modes on EduPlay, so a game can be printed as a worksheet or played in a classroom with a slow connection.',
  },
]

const ROLES: { title: string; benefit: string; href: string; cta: string }[] = [
  { title: '👩🏫 Teachers', benefit: 'Create a game in minutes from a prompt or a template, then play it live, set it as homework, and see which questions students need to practise again.', href: '/create', cta: 'Start creating' },
  { title: '🎓 Students', benefit: 'Play games without an account, join with a code, and make your own game from a chapter — then share it with friends.', href: '/activities', cta: 'Play games' },
  { title: '👨👩👧 Parents', benefit: 'See real games your child can play in the browser, with no download and no console, and share a game link with family.', href: '/browse', cta: 'Browse games' },
  { title: '🎨 Creators', benefit: 'Build a game once, reuse it in many game types, and share it with a link and a ready caption — your own theme on your own page.', href: '/create', cta: 'Create a game' },
]

export default async function HomePage({ params }: HomePageProps) {
  const t = await getTranslations({ locale: params.locale, namespace: 'home' })
  const { games, total } = await fetchHomeGames()
  const isRTL = params.locale === 'ur' || params.locale === 'ar'
  const base = getBaseUrl()
  const locale = params.locale

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: 'EduPlay',
        url: base,
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: 'EduPlay',
        inLanguage: locale,
        publisher: { '@id': `${base}/#organization` },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }

  const cardStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem',
  } as const

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <JsonLd data={jsonLd} />
      <Navbar locale={locale as never} />
      <main>
        <AnimatedHero
          locale={locale}
          heroTitle={t('heroTitle')}
          heroSubtitle={t('heroSubtitle')}
          playGames={t('playGames')}
          browseActivities={t('browseActivities')}
          startCreating={t('startCreating')}
          joinLive={t('joinLive')}
          changeThemeNote={t('changeThemeNote')}
        />

        <section className="px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center max-w-4xl mx-auto" aria-label="EduPlay in numbers">
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
                <article key={game.id} style={cardStyle}>
                  <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)', fontSize: '1.05rem' }}>
                    {game.title}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
                    {game.subject} · {game.grade} · {game.type}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link
                      href={`/${locale}/activity/${game.id}/play`}
                      className="px-4 py-2 rounded-lg font-semibold"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'white', minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
                    >
                      {t('playThisGame')}
                    </Link>
                    <ShareGameButton locale={locale} gameId={game.id} gameTitle={game.title} />
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
                href={`/${locale}/browse?subject=${encodeURIComponent(DB_SUBJECT_BY_SLUG[slug])}`}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
              >
                {SUBJECT_EMOJI[slug] ?? '📚'} {DB_SUBJECT_BY_SLUG[slug]}
              </Link>
            ))}
          </div>
          <h3 className="text-xl font-bold mt-10 mb-4 text-center" style={{ color: 'var(--color-text-primary)' }}>
            Browse by game type
          </h3>
          <div className="flex gap-2 justify-center flex-wrap max-w-4xl mx-auto">
            {Object.keys(DB_TYPE_BY_SLUG).map((slug) => (
              <Link
                key={slug}
                href={`/${locale}/activities/${slug}`}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
              >
                {humanType(slug)}
              </Link>
            ))}
          </div>
        </section>

        <section className="px-6 py-12">
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--color-text-primary)' }}>
            How it works — in 3 steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <article style={cardStyle}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>1. Prompt or template</h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>Type one prompt, paste a chapter, or pick a template. You get an editable draft, not a finished page you cannot change.</p>
            </article>
            <article style={cardStyle}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>2. Edit and preview</h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>Fix the questions, switch the game type without retyping, preview it, and save it yourself. Nothing is published until you save it.</p>
            </article>
            <article style={cardStyle}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>3. Play and share</h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>Play it live or on your own, share it with friends to test it, and share the play link with a ready caption.</p>
            </article>
          </div>
        </section>

        <section className="px-6 py-12" style={{ background: 'var(--color-surface-alt)' }}>
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--color-text-primary)' }}>
            For teachers, students, parents and creators
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {ROLES.map((role) => (
              <article key={role.title} style={cardStyle}>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{role.title}</h3>
                <p className="mb-3" style={{ color: 'var(--color-text-secondary)' }}>{role.benefit}</p>
                <Link
                  href={`/${locale}${role.href}`}
                  className="px-4 py-2 rounded-lg font-semibold"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'white', minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
                >
                  {role.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="px-6 py-12">
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--color-text-primary)' }}>
            Ready lessons, curriculum and languages
          </h2>
          <p className="text-center max-w-2xl mx-auto mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Games are organised by subject, grade and game type, so a teacher can find a ready lesson instead of starting from a blank page. Pakistan SNC and Islamiyat are first-class subjects, and the same subject, grade and type tagging is being extended country by country.
          </p>
          <div className="flex gap-2 justify-center flex-wrap max-w-4xl mx-auto">
            {['Pakistan SNC', 'Islamiyat', 'Urdu', 'Roman Urdu', 'Arabic (RTL)', 'English', '11 languages'].map((tag) => (
              <span key={tag} className="px-4 py-2 rounded-lg font-medium" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="px-6 py-12" style={{ background: 'var(--color-surface-alt)' }}>
          <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--color-text-primary)' }}>
            Frequently asked questions
          </h2>
          <div className="max-w-3xl mx-auto" style={{ display: 'grid', gap: '1rem' }}>
            {FAQS.map((f) => (
              <article key={f.q} style={cardStyle}>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{f.q}</h3>
                <p style={{ color: 'var(--color-text-secondary)' }}>{f.a}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="px-6 py-10 text-center" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>📚 EduPlay</p>
          <nav className="flex gap-4 justify-center flex-wrap" aria-label="Footer">
            <Link href={`/${locale}/browse`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Browse games</Link>
            <Link href={`/${locale}/activities`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Activities</Link>
            <Link href={`/${locale}/create`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Create</Link>
            <Link href={`/${locale}/join`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Join a game</Link>
            <Link href={`/${locale}/live`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Live game</Link>
            <Link href={`/${locale}/dashboard`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Dashboard</Link>
          </nav>
        </footer>
      </main>
    </div>
  )
}
