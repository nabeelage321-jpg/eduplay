import type { Metadata } from 'next'
import { Suspense } from 'react'
import { generateWebPageSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { fetchFreeEducationalGamesActivities, isIndexable } from '@/lib/seo/programmatic'
import { PlayGamesClient } from './PlayGamesClient'

export const revalidate = 604800

// ─── 40-TYPE PLAY GRID (owner order 2026-11-07 07:27 PKT, launch day) ────────
// When a kid clicks Play Games he must reach ALL the game types as
// tiles — exactly like the Create page "Choose Activity Type" grid —
// and ONE click on a tile opens a game of that type IMMEDIATELY on
// the NEW play page /activity/<id>/play. No detail page in between.
// Per-tile game rule: the NEWEST public game of that type matching
// the sidebar pick (subject + class), served by ONE batched request
// (GET /api/activities/by-type — 40 separate calls would burn the
// /api/activities 60-requests-per-minute rate limit). A type with
// zero public games for the pick shows the honest "No game yet —
// make the first one" state. The right-side selection panel holds
// class + subject — the only other filter dimensions filters.ts
// offers that change which game a tile opens (type IS the grid).
// The old 100-newest list is REPLACED by this grid; the pickers
// moved into the right-side panel. The homepage hero Play Games
// button now points here (was /{locale}/activities).
// LIVE COUNT (verified 2026-11-07 against GET /api/activities):
// 5,112 public games; 23 types have games, 17 have none yet.
// POPULATED from day one for 23 types. All copy is in English. No
// official-status claims, no ratings, no invented counts.

const PAGE_TITLE = 'Play Games — Pick Your Game and Play'
const PAGE_TITLE_TAG = `${PAGE_TITLE} | EduPlay`
const PAGE_DESCRIPTION =
  'All 40 game types as tiles — tap one and play right away. Pick a class and a subject on the side and every tile opens a game for that pick. Free educational games for kids, no account needed to play.'

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
          padding: '0.75rem 1rem',
          color: 'var(--color-text-primary)',
        }}
      >
        <Breadcrumb items={[{ label: 'Home', href: `/${params.locale}` }, { label: 'Play Games' }]} />

        {/* HERO — shrunk (owner order 2026-11-07, build-list item 2):
            the hero was too tall and the kid was "received by empty
            space" before any game was visible. Headline text and all
            wording UNCHANGED — only sizes/padding shrunk so the 40
            tiles start visible at once on a normal desktop viewport.
            Before: section 2rem/1rem, emoji 3rem, h1 up to 2.5rem,
            intro 1.125rem. After: section 0.5rem/0.75rem, emoji
            1.75rem, h1 up to 1.75rem, intro 1rem. */}
        <section
          style={{ textAlign: 'center', padding: '0.5rem 1rem 0.75rem' }}
          aria-labelledby="hero-heading"
        >
          <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }} aria-hidden="true">
            🎮
          </div>
          <h1
            id="hero-heading"
            style={{
              fontSize: 'clamp(1.375rem, 3vw, 1.75rem)',
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            Play Games — Pick Your Game and Play
          </h1>
          <p
            style={{
              fontSize: '1rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '640px',
              margin: '0 auto',
            }}
          >
            Pick a game type below — tap it and play right away.
            Pick a class and a subject on the side and every tile opens
            a game for that pick. Free to play, no account needed to play.
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              maxWidth: '640px',
              margin: '0.5rem auto 0',
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
