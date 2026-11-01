import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import {
  Backpack,
  ChevronDown,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Palette,
  PencilLine,
  Printer,
  Send,
  Sparkles,
  Users,
  WifiLow,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import JsonLd from '@/components/seo/JsonLd'
import { createServerClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/seo/base-url'
import { DB_SUBJECT_BY_SLUG, DB_TYPE_BY_SLUG } from '@/lib/seo/programmatic'
import V0Hero from '@/components/home/v0/V0Hero'
import V0GameCard from '@/components/home/v0/V0GameCard'
import V0MobilePlayBar from '@/components/home/v0/V0MobilePlayBar'
import MascotButton from '@/components/home/v0/MascotButton'
import { TILES } from '@/components/home/v0/tiles'

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

const STEPS = [
  { title: 'Prompt or template', body: 'Type one prompt, paste a chapter, or pick a template. You get an editable draft, not a finished page you cannot change.', Icon: Sparkles, tile: TILES[2] },
  { title: 'Edit and preview', body: 'Fix the questions, switch the game type without retyping, preview it, and save it yourself. Nothing is published until you save it.', Icon: PencilLine, tile: TILES[1] },
  { title: 'Play and share', body: 'Play it live or on your own, share it with friends to test it, and share the play link with a ready caption.', Icon: Send, tile: TILES[0] },
] as const

const ROLES = [
  { title: 'Teachers', benefit: 'Create a game in minutes from a prompt or a template, play it live, set it as homework, and see which questions students need again.', href: '/create', cta: 'Start creating', Icon: GraduationCap, tile: TILES[0] },
  { title: 'Students', benefit: 'Play games without an account, join with a code, and make your own game from a chapter — then share it with friends.', href: '/join', cta: 'Join a game', Icon: Backpack, tile: TILES[1] },
  { title: 'Parents', benefit: 'See real games your child can play in the browser, with no download and no console, and share a game link with family.', href: '/browse', cta: 'Browse games', Icon: HeartHandshake, tile: TILES[3] },
  { title: 'Creators', benefit: 'Build a game once, reuse it in many game types, and share it with a link and a ready caption — your own theme on your own page.', href: '/create', cta: 'Create a game', Icon: Palette, tile: TILES[4] },
] as const

const CURRICULUM_EXTRAS = [
  { title: 'Print it', body: 'Printable worksheets from the same game.', Icon: Printer, tile: TILES[3] },
  { title: 'Slow connection', body: 'Low-bandwidth play as a first-class mode.', Icon: WifiLow, tile: TILES[5] },
  { title: 'Right-to-left', body: 'Urdu and Arabic read and play right to left.', Icon: Globe2, tile: TILES[4] },
] as const

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

  const sectionStyle = { margin: '0 auto', maxWidth: '80rem', padding: '4rem 1rem' } as const
  const h2Style = { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' } as const
  const eyebrowStyle = { fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--color-primary)' } as const
  const subStyle = { marginTop: '0.75rem', fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.6, color: 'var(--color-text-secondary)' } as const

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <JsonLd data={jsonLd} />
      <Navbar locale={locale as never} />
      <main>
        <V0Hero
          locale={locale}
          heroTitle={t('heroTitle')}
          heroSubtitle={t('heroSubtitle')}
          playGames={t('playGames')}
          browseActivities={t('browseActivities')}
          startCreating={t('startCreating')}
          joinLive={t('joinLive')}
          changeThemeNote={t('changeThemeNote')}
        />

        {/* Stats — V0 coloured tiles, real numbers only. */}
        <section aria-label="EduPlay in numbers" style={{ padding: '0 1rem' }}>
          <div style={{ margin: '0 auto', maxWidth: '80rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px', overflow: 'hidden', borderRadius: '1.5rem', border: '2px solid var(--color-text-primary)', background: 'var(--color-text-primary)' }} className="md:grid-cols-4">
            {[
              { value: total > 0 ? total.toLocaleString() : '—', label: t('statsActivities'), tile: TILES[2] },
              { value: '15', label: t('statsSubjects'), tile: TILES[1] },
              { value: '23', label: t('statsTypes'), tile: TILES[0] },
              { value: '11', label: t('statsLanguages'), tile: TILES[3] },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '1.5rem 1rem', background: s.tile }}>
                <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#26264A' }}>{s.value}</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#26264A' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Popular activities — REAL DB games only, real play links. */}
        <section aria-labelledby="popular-title" style={sectionStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="md:flex-row md:items-end md:justify-between">
            <div style={{ maxWidth: '42rem' }}>
              <p style={eyebrowStyle}>Play now</p>
              <h2 id="popular-title" style={{ marginTop: '0.5rem', ...h2Style }}>{t('featuredTitle')}</h2>
              <p style={subStyle}>Real games from the library. Tap Play — no account needed.</p>
            </div>
            <Link
              href={`/${locale}/activities`}
              style={{ display: 'inline-flex', minHeight: '48px', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-primary)' }}
            >
              See all {total > 0 ? total.toLocaleString() : ''} activities →
            </Link>
          </div>
          {games.length === 0 ? (
            <p style={{ marginTop: '2.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              {t('featuredSubtitle')}
            </p>
          ) : (
            <ul style={{ marginTop: '2.5rem', display: 'grid', gap: '1.5rem', listStyle: 'none', padding: 0 }} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {games.map((game, i) => (
                <li key={game.id}>
                  <V0GameCard game={game} locale={locale} index={i} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Browse by subject + by game type — real DB mappings, real routes. */}
        <section aria-labelledby="subjects-title" style={sectionStyle}>
          <p style={eyebrowStyle}>15 subjects</p>
          <h2 id="subjects-title" style={{ marginTop: '0.5rem', ...h2Style }}>{t('popularSubjects')}</h2>
          <p style={subStyle}>From Math to Islamiyat — find games for the lesson you are teaching this week.</p>
          <ul style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', listStyle: 'none', padding: 0 }} aria-label="Subjects">
            {Object.keys(DB_SUBJECT_BY_SLUG).map((slug, i) => (
              <li key={slug}>
                <Link
                  href={`/${locale}/browse?subject=${encodeURIComponent(DB_SUBJECT_BY_SLUG[slug])}`}
                  style={{ display: 'inline-flex', minHeight: '48px', alignItems: 'center', gap: '0.5rem', borderRadius: '9999px', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '0 1.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}
                >
                  <span aria-hidden="true" style={{ width: '0.75rem', height: '0.75rem', borderRadius: '9999px', background: TILES[i % TILES.length] }} />
                  {SUBJECT_EMOJI[slug] ?? '📚'} {DB_SUBJECT_BY_SLUG[slug]}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="types-title" style={{ ...sectionStyle, background: 'var(--color-surface-alt)' }}>
          <p style={eyebrowStyle}>23 game types</p>
          <h2 id="types-title" style={{ marginTop: '0.5rem', ...h2Style }}>Browse by game type</h2>
          <p style={subStyle}>Write your questions once, then play them as a Quiz, a Match Up, a Spin Wheel — or any of the others.</p>
          <ul style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', listStyle: 'none', padding: 0 }} aria-label="Game types">
            {Object.keys(DB_TYPE_BY_SLUG).map((slug, i) => (
              <li key={slug}>
                <Link
                  href={`/${locale}/activities/${slug}`}
                  style={{ display: 'inline-flex', minHeight: '48px', alignItems: 'center', gap: '0.5rem', borderRadius: '9999px', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '0 1.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}
                >
                  <span aria-hidden="true" style={{ width: '0.75rem', height: '0.75rem', borderRadius: '9999px', background: TILES[i % TILES.length] }} />
                  {humanType(slug)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works — V0 3 steps + friends-first callout. */}
        <section aria-labelledby="how-title" style={sectionStyle}>
          <div style={{ textAlign: 'center', maxWidth: '42rem', margin: '0 auto' }}>
            <p style={eyebrowStyle}>1 · 2 · 3</p>
            <h2 id="how-title" style={{ marginTop: '0.5rem', ...h2Style }}>How it works — in 3 steps</h2>
            <p style={subStyle}>One prompt becomes an editable draft, and an editable draft becomes a game your class can play.</p>
          </div>
          <ol style={{ marginTop: '3rem', display: 'grid', gap: '1.5rem', listStyle: 'none', padding: 0 }} className="md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', borderRadius: '1.5rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '1.5rem', boxShadow: '0 6px 0 0 var(--color-border)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span aria-hidden="true" style={{ display: 'flex', width: '3rem', height: '3rem', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', background: 'var(--color-text-primary)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-surface)' }}>
                    {i + 1}
                  </span>
                  <span style={{ display: 'flex', width: '3rem', height: '3rem', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', background: step.tile }} aria-hidden="true">
                    <step.Icon style={{ width: '1.5rem', height: '1.5rem', color: '#26264A' }} />
                  </span>
                </div>
                <h3 style={{ marginTop: '1.25rem', fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  <span style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>{`Step ${i + 1}: `}</span>
                  {step.title}
                </h3>
                <p style={{ marginTop: '0.5rem', fontSize: '1.125rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{step.body}</p>
              </li>
            ))}
          </ol>
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderRadius: '1.5rem', border: '2px dashed var(--color-primary)', padding: '1.5rem' }} className="md:flex-row md:items-center">
            <span style={{ display: 'flex', width: '3rem', height: '3rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', background: 'var(--color-primary)', color: 'white' }} aria-hidden="true">
              <Users style={{ width: '1.5rem', height: '1.5rem' }} />
            </span>
            <p style={{ fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
              <strong>Share with friends first.</strong> Send your new game to 12 friends to test it — if 3 approve, it is ready for the public list. That sharing is how EduPlay spreads.
            </p>
          </div>
        </section>

        {/* Roles — V0 layout, EduPlay theme surfaces (not V0's dark block). */}
        <section aria-labelledby="roles-title" style={{ ...sectionStyle, background: 'var(--color-surface-alt)' }}>
          <p style={eyebrowStyle}>Made for everyone in the room</p>
          <h2 id="roles-title" style={{ marginTop: '0.5rem', ...h2Style }}>For teachers, students, parents and creators</h2>
          <ul style={{ marginTop: '2.5rem', display: 'grid', gap: '1.5rem', listStyle: 'none', padding: 0 }} className="sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => (
              <li key={role.title} style={{ display: 'flex', flexDirection: 'column', borderRadius: '1.5rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '1.5rem' }}>
                <span style={{ display: 'flex', width: '3.5rem', height: '3.5rem', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', background: role.tile }} aria-hidden="true">
                  <role.Icon style={{ width: '1.75rem', height: '1.75rem', color: '#26264A' }} />
                </span>
                <h3 style={{ marginTop: '1.25rem', fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{role.title}</h3>
                <p style={{ marginTop: '0.5rem', flex: 1, fontSize: '1.125rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{role.benefit}</p>
                <Link
                  href={`/${locale}${role.href}`}
                  style={{ marginTop: '1.5rem', display: 'inline-flex', minHeight: '48px', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', background: 'var(--color-primary)', padding: '0 1.25rem', fontSize: '1rem', fontWeight: 800, color: 'white' }}
                >
                  {role.cta} →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Curriculum — V0 layout; tags are spans, NOT links, because
            EduPlay has no /curriculum/<tag> pages for these tags. */}
        <section aria-labelledby="curriculum-title" style={sectionStyle}>
          <div style={{ display: 'grid', gap: '2.5rem', alignItems: 'center' }} className="lg:grid-cols-2">
            <div>
              <p style={eyebrowStyle}>Ready lessons</p>
              <h2 id="curriculum-title" style={{ marginTop: '0.5rem', ...h2Style }}>Ready lessons, curriculum and languages</h2>
              <p style={subStyle}>Games are organised by subject, grade and type, so you can find a ready lesson instead of starting from a blank page.</p>
              <ul style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', listStyle: 'none', padding: 0 }} aria-label="Curriculum and language tags">
                {['Pakistan SNC', 'Islamiyat', 'Urdu', 'Roman Urdu', 'Arabic (RTL)', 'English', '11 languages'].map((tag) => (
                  <li key={tag}>
                    <span style={{ display: 'inline-flex', minHeight: '48px', alignItems: 'center', gap: '0.5rem', borderRadius: '9999px', background: 'var(--color-text-primary)', padding: '0 1.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-surface)' }}>
                      📖 {tag}
                    </span>
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: '1.5rem', borderRadius: '1rem', background: 'var(--color-surface-alt)', padding: '0.75rem 1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Pakistan SNC and Islamiyat are first-class today. Curriculum tagging is being extended country by country.
              </p>
            </div>
            <ul style={{ display: 'grid', gap: '1rem', listStyle: 'none', padding: 0 }} className="sm:grid-cols-3 lg:grid-cols-1">
              {CURRICULUM_EXTRAS.map((extra) => (
                <li key={extra.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', borderRadius: '1.5rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '1.25rem' }}>
                  <span style={{ display: 'flex', width: '3rem', height: '3rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', background: extra.tile }} aria-hidden="true">
                    <extra.Icon style={{ width: '1.5rem', height: '1.5rem', color: '#26264A' }} />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{extra.title}</span>
                    <span style={{ display: 'block', marginTop: '0.25rem', color: 'var(--color-text-secondary)' }}>{extra.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ — V0 collapsible style, same copy + same JsonLd graph above
            (no second FAQPage script, to avoid duplicate structured data). */}
        <section aria-labelledby="faq-title" style={{ ...sectionStyle, background: 'var(--color-surface-alt)' }}>
          <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={eyebrowStyle}>Straight answers</p>
              <h2 id="faq-title" style={{ marginTop: '0.5rem', ...h2Style }}>Frequently asked questions</h2>
            </div>
            <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {FAQS.map((f, i) => (
                <details key={f.q} open={i === 0} style={{ borderRadius: '1rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)' }}>
                  <summary style={{ display: 'flex', minHeight: '56px', cursor: 'pointer', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', listStyle: 'none' }}>
                    <h3 style={{ flex: 1, fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{f.q}</h3>
                    <ChevronDown style={{ width: '1.5rem', height: '1.5rem', flexShrink: 0, color: 'var(--color-primary)' }} aria-hidden="true" />
                  </summary>
                  <div style={{ padding: '0 1.25rem 1.25rem', fontSize: '1.125rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                    <p style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>{f.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <footer style={{ borderTop: '1px solid var(--color-border)', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <p style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>📚 EduPlay</p>
          <nav style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }} aria-label="Footer">
            <Link href={`/${locale}/browse`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Browse games</Link>
            <Link href={`/${locale}/activities`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Activities</Link>
            <Link href={`/${locale}/create`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Create</Link>
            <Link href={`/${locale}/join`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Join a game</Link>
            <Link href={`/${locale}/live`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Live game</Link>
            <Link href={`/${locale}/dashboard`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Dashboard</Link>
          </nav>
        </footer>
        {/* Spacer so the fixed mobile play bar never covers the footer. */}
        <div aria-hidden="true" style={{ height: '6rem' }} className="lg:hidden" />
      </main>
      <V0MobilePlayBar locale={locale} />
      <MascotButton />
    </div>
  )
}
