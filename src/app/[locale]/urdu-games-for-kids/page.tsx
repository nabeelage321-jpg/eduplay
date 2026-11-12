import type { Metadata } from 'next'
import { generateWebPageSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { fetchUrduSubjectActivities, isIndexable } from '@/lib/seo/programmatic'
import { FILTER_GRADES } from '@/lib/filters'
import { ACTIVITY_TYPES_SEED, getActivityTypeLabel } from '@/lib/supabase/seed/activity-types'

// ─── Beat-plan build #3 — hub "Urdu games for kids" ─────────────────────────
// Locked method first (2026-11-05, fresh web search, not copied from the
// #2 builder's note — the same three results came back, verified live):
//   1. Kahani Korner (kahanikorner.com) — "20 Bilingual Games for
//      Everyday Family Life" — a PDF download of 20 offline bilingual
//      home games (breakfast, laundry, car rides...). Not a platform,
//      nothing playable online.
//   2. UUrdu (uurdu.com) — "5 Engaging Urdu Educational Games for
//      Children" (posted 2023-10-30) — a blog list of five game ideas
//      (word puzzles, alphabet bingo, story time, flashcards, quiz
//      show). Ideas to run offline, not playable games.
//   3. Urdu Phonics Fun (Apple App Store) — a paid app, ages 4+,
//      Urdu letters, sounds and blending through games and pictures.
//      An installable app, not a free web hub.
// Also seen: LearnWithQazi (free games/quizzes/stories page, several
// sections still "coming soon"), Ling / Dinolingo (paid apps,
// $14.95–16.99/mo), Urdu Qaida (Google Play app), Urdu Hoops
// (itch.io, one single conversation game). None of them is a free,
// no-account, playable-in-the-browser, teacher-made Urdu games hub.
// Best of the three: lead with the keyword + playable-free-online +
// no app to install + teacher-made + 40 game types. Headline =
// keyword + customer-problem solution: Urdu learning turned into
// free games. All copy is in English — no Urdu wording is used
// anywhere on this page, because no Urdu translation was verified.

export const revalidate = 604800

const HUB_TITLE = 'Urdu Games for Kids — Turn Urdu Learning Into Free Games'
const HUB_TITLE_TAG = `${HUB_TITLE} | EduPlay`
const EMPTY_DESCRIPTION =
  'Free Urdu games for kids — play quizzes, matching, spelling and more to learn Urdu. No ads, no account needed to play.'

// ─── Metadata ─────────────────────────────────────────────────────────────────
// Same gate as hub #1 and the type hubs: noindex until >=1 real saved
// game exists. The sitemap is deliberately NOT touched by this batch —
// even once games exist, this page stays out of sitemap.xml until the
// owner says otherwise.
export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const { activities, count } = await fetchUrduSubjectActivities()
  const openGraph = {
    title: HUB_TITLE_TAG,
    description: EMPTY_DESCRIPTION,
  }
  if (!isIndexable(count)) {
    return {
      title: HUB_TITLE_TAG,
      description: EMPTY_DESCRIPTION,
      openGraph,
      twitter: { card: 'summary', title: HUB_TITLE_TAG, description: EMPTY_DESCRIPTION },
      robots: { index: false, follow: true },
    }
  }
  const realDescription = activities
    .slice(0, 3)
    .map((a) => (a.description ? `${a.title}: ${a.description}` : a.title))
    .join(' ')
  return {
    title: HUB_TITLE_TAG,
    description: realDescription,
    openGraph: { ...openGraph, description: realDescription },
    twitter: { card: 'summary', title: HUB_TITLE_TAG, description: realDescription },
    robots: { index: true, follow: true },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UrduGamesForKidsHubPage({
  params,
}: {
  params: { locale: string }
}) {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'}/${params.locale}/urdu-games-for-kids`
  const { activities, count } = await fetchUrduSubjectActivities()

  const jsonLd = generateWebPageSchema({
    url: pageUrl,
    name: HUB_TITLE,
    description: EMPTY_DESCRIPTION,
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
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: `/${params.locale}` },
            { label: 'Urdu Games for Kids' },
          ]}
        />

        {/* Hero */}
        <section
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            background: 'var(--gradient-hero)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2rem',
          }}
          aria-labelledby="hero-heading"
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }} aria-hidden="true">
            📖
          </div>
          <h1
            id="hero-heading"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              marginBottom: '1rem',
            }}
          >
            Urdu Games for Kids — Turn Urdu Learning Into Free Games
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '640px',
              margin: '0 auto 1rem',
            }}
          >
            Games that teach Urdu — words for animals, colours, family and
            more. Free to play, no ads, and no account needed to play.
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              maxWidth: '640px',
              margin: '0 auto 1.5rem',
            }}
          >
            Games here are made by teachers or with AI. A teacher should
            review a game before class.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`/${params.locale}/create?subject=Urdu`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--gradient-btn)',
                color: '#fff',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
              aria-label="Make an Urdu game"
            >
              {count === 0 ? '+ Make the first Urdu game' : '+ Make an Urdu game'}
            </a>
            <a
              href={`/${params.locale}/activities`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                background: 'var(--color-surface)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontWeight: 600,
                border: '2px solid var(--color-primary)',
              }}
            >
              Browse all activities
            </a>
          </div>
        </section>

        {/* Stats bar — real numbers only: count from the DB, type count
            from the seed, grade levels from the programme spine. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
          role="list"
          aria-label="Urdu games statistics"
        >
          {[
            { label: 'Urdu games saved', value: count.toLocaleString() },
            { label: 'Game types', value: String(ACTIVITY_TYPES_SEED.length) },
            { label: 'Grade levels', value: String(FILTER_GRADES.length) },
            { label: 'Shown on this page', value: String(activities.length) },
          ].map((stat) => (
            <div
              key={stat.label}
              role="listitem"
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem',
                textAlign: 'center',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Games list — real Urdu-subject games only, newest first. */}
        <section aria-labelledby="activities-heading">
          <h2
            id="activities-heading"
            style={{
              fontSize: '1.5rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Urdu games for kids
          </h2>

          {activities.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}
              aria-label="Urdu games grid"
            >
              {activities.map((activity) => (
                <a
                  key={activity.id}
                  href={`/${params.locale}/activity/${activity.id}`}
                  style={{
                    display: 'block',
                    padding: '1rem',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius)',
                    textDecoration: 'none',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{activity.title}</h3>
                  {activity.description ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                      {activity.description}
                    </p>
                  ) : null}
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {activity.grade} · {activity.type}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  marginBottom: '1.25rem',
                  fontSize: '1rem',
                }}
              >
                No Urdu games saved yet — make the first one
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  justifyContent: 'center',
                }}
              >
                <a
                  href={`/${params.locale}/create?subject=Urdu`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '48px',
                    padding: '0.75rem 1.5rem',
                    background: 'var(--gradient-btn)',
                    color: '#fff',
                    borderRadius: 'var(--radius)',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Make the first Urdu game
                </a>
                <a
                  href={`/${params.locale}/browse`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '48px',
                    padding: '0.75rem 1.5rem',
                    background: 'var(--color-surface)',
                    color: 'var(--color-primary)',
                    borderRadius: 'var(--radius)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    border: '2px solid var(--color-primary)',
                  }}
                >
                  Browse all activities
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Grades this page covers — labels straight from the filter
            spine (Pre-K through Grade 12), never invented. */}
        <section style={{ marginTop: '3rem' }} aria-labelledby="grades-heading">
          <h2
            id="grades-heading"
            style={{
              fontSize: '1.25rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Urdu for every grade
          </h2>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
            role="list"
            aria-label="Grade levels"
          >
            {FILTER_GRADES.map((g) => (
              <span
                key={g.value}
                role="listitem"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.5rem 0.875rem',
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.875rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                {g.label}
              </span>
            ))}
          </div>
        </section>

        {/* Related activity types — same pattern as the type hubs. */}
        <section
          style={{ marginTop: '3rem' }}
          aria-labelledby="related-types-heading"
        >
          <h2
            id="related-types-heading"
            style={{
              fontSize: '1.25rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Other activity types you might like
          </h2>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
            role="list"
          >
            {ACTIVITY_TYPES_SEED.slice(0, 8).map((t) => (
              <a
                key={t.slug}
                href={`/${params.locale}/activities/${t.slug}`}
                role="listitem"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 0.875rem',
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span aria-hidden="true">{t.icon}</span>
                {getActivityTypeLabel(t, params.locale)}
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
