import type { Metadata } from 'next'
import { Suspense } from 'react'
import { generateWebPageSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { fetchFreeEducationalGamesActivities, isIndexable } from '@/lib/seo/programmatic'
import { PlayGamesClient } from './PlayGamesClient'

export const revalidate = 86400

// ─── Separate play listing (owner order 2026-11-06 22:14 PKT) ───────────────
// Owner's ask, in his words: a SEPARATE listing where you click to play
// a game and pick the game, the class and everything yourself.
// Overlap check (read, not asserted):
//   /en/browse is a filterable CATALOGUE tool (BrowseClient: subject /
//   grade / type filters + search + sort + "New games" section). Its
//   Play buttons go to the LEGACY player —
//   router.push(`/${locale}/play/${activity.id}`) — the route the
//   owner himself flagged (/en/play decision still pending; legacy
//   QuizGame "Lets Play" did not advance; new types show "Game Type
//   Not Found" there).
//   The hubs (T1 type hubs, free / Urdu / Islamiyat / Pakistan hubs)
//   link game cards to the DETAIL page /activity/<id> — one more click
//   before playing.
//   NOTHING exists that is a play-first listing: big pickers on top
//   (game type, class, subject), minimal text, and ONE click straight
//   to the NEW play page /activity/<id>/play. That single-click
//   destination is the genuine difference — not a presentation tweak.
//   So this page is built: pickers + list only, no search, no sort,
//   no New-games section, no descriptions, no play counts. Play goes
//   to the new play page, NEVER to the legacy /play/<id> route.
//   /en/browse is NOT touched by this batch.
// LIVE COUNT (verified 2026-11-05 against GET /api/activities?
//   sort=newest — pagination.total): 5,112 public games. POPULATED
//   from day one. All copy is in English. No official-status claims,
//   no ratings, no invented counts.

const PAGE_TITLE = 'Play Games — Pick Your Game and Play'
const PAGE_TITLE_TAG = `${PAGE_TITLE} | EduPlay`
const PAGE_DESCRIPTION =
  'Pick a game type, your class and a subject — then play. Free educational games for kids, no account needed to play.'

// ─── Metadata ─────────────────────────────────────────────────────────────────
// Same gate as the hubs: noindex until >=1 real saved game exists.
// The unfiltered public count is 5,112 real games, so the gate flips
// to indexable — verified live by the parent, not assumed here. The
// sitemap is deliberately NOT touched by this batch — this page stays
// out of sitemap.xml until the owner says otherwise.
export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const { activities, count } = await fetchFreeEducationalGamesActivities()
  const openGraph = {
    title: PAGE_TITLE_TAG,
    description: PAGE_DESCRIPTION,
  }
  if (!isIndexable(count)) {
    return {
      title: PAGE_TITLE_TAG,
      description: PAGE_DESCRIPTION,
      openGraph,
      twitter: { card: 'summary', title: PAGE_TITLE_TAG, description: PAGE_DESCRIPTION },
      robots: { index: false, follow: true },
    }
  }
  const realDescription = activities
    .slice(0, 3)
    .map((a) => (a.description ? `${a.title}: ${a.description}` : a.title))
    .join(' ')
  return {
    title: PAGE_TITLE_TAG,
    description: realDescription,
    openGraph: { ...openGraph, description: realDescription },
    twitter: { card: 'summary', title: PAGE_TITLE_TAG, description: realDescription },
    robots: { index: true, follow: true },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlayGamesPage({ params }: { params: { locale: string } }) {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'}/${params.locale}/play-games`

  const jsonLd = generateWebPageSchema({
    url: pageUrl,
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    locale: params.locale,
  })

  return (
    <>
      <JsonLd data={jsonLd} />

      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1.5rem 1rem',
          color: 'var(--color-text-primary)',
        }}
      >
        <Breadcrumb items={[{ label: 'Home', href: `/${params.locale}` }, { label: 'Play Games' }]} />

        <section
          style={{ textAlign: 'center', padding: '2rem 1rem 1rem' }}
          aria-labelledby="hero-heading"
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }} aria-hidden="true">
            🎮
          </div>
          <h1
            id="hero-heading"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              marginBottom: '0.75rem',
            }}
          >
            Play Games — Pick Your Game and Play
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '640px',
              margin: '0 auto',
            }}
          >
            Pick a game type, your class and a subject below — then tap Play.
            Free to play, no account needed to play.
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              maxWidth: '640px',
              margin: '0.75rem auto 0',
            }}
          >
            Games here are made by teachers or with AI. A teacher should review a game before class.
          </p>
        </section>

        <Suspense
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading games…</div>
          }
        >
          <PlayGamesClient locale={params.locale} />
        </Suspense>
      </main>
    </>
  )
}
