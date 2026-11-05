import type { Metadata } from 'next'
import { generateWebPageSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import {
  fetchFreeEducationalGamesActivities,
  isIndexable,
  PROGRAMMATIC_SUBJECT_SLUGS,
  DB_SUBJECT_BY_SLUG,
} from '@/lib/seo/programmatic'
import { FILTER_GRADES } from '@/lib/filters'
import { ACTIVITY_TYPES_SEED, getActivityTypeLabel } from '@/lib/supabase/seed/activity-types'

// ─── Beat-plan build #6 — hub "Free educational games for kids" ────────────
// Locked method first (2026-11-05, fresh web search):
//   "free educational games for kids"
//   1. virtual-addiction.com — "Free Educational Games for Kids" — a
//      list article (Khan Academy Kids, PBS KIDS Games, ScratchJr,
//      NASA Space Place, Code.org). A curated list, not a playable hub.
//   2. kidsaitools.com — "Best Free Educational Games for Kids 2026 —
//      No Ads, No IAP" — a list of 12 games. A list, not a hub.
//   3. seunogunmola.com.ng GameLabs — 6 free browser games, no
//      account. A small playable hub (6 games).
//      Also seen: Kiloo (10 free kids learning games, browser,
//      no account), pragmaticmom.com (70+ free games — a link list).
//   "ad-free games for kids"
//   1. androidhire.com — "Games With No Ads (2026): 24 Checked" —
//      mostly paid apps. A list, not a playable hub.
//   2. lilachbullock.com — "Ad Free Games for Kids: Apps I Trust" —
//      an app list (PBS KIDS, Khan Academy Kids, CBeebies).
//   3. jupo.world — "The 10 best ad-free games for kids" — an app
//      list. Also seen: Tiny Hands Play (free, no ads, no sign-up,
//      toddler web games).
//   None of them is a free, no-account, playable-in-the-browser,
//   teacher-made hub with thousands of games across many game types.
//   Best of the three: lead with the keyword + free + no ads + no
//   account + teacher-made + 40 game types. Headline = keyword +
//   customer-problem solution: parents search "free" because most
//   "free" games mean ads, paywalls or chat with strangers — this
//   page answers that worry first. Route: the broader keyword wins
//   ("free educational games for kids"); ad-free is a core promise
//   section on the page, not a second page.
// Overlap check (read, not asserted): /en/browse is a filterable
//   catalogue tool (BrowseClient: subject/grade/type filters, sort,
//   500 per page) with no keyword targeting and no promise or FAQ
//   copy. This page is a value-proposition LANDING page: the free +
//   safe promise, real stats, a capped start-here list (12 newest
//   games only, no filters, no sort), subject/type entry points and
//   a FAQ that answers "is it really free and safe?". It never
//   re-lists the full catalogue, so it is a distinct page type for
//   a distinct intent — not a duplicate of browse.
// LIVE COUNT (verified 2026-11-05 against GET /api/activities?
//   sort=newest — pagination.total): 5,112 public games (5,110
//   programme + 2 saved since). POPULATED from day one. Every public
//   game is free to play, so the count label "Free games saved" is
//   honest. All copy is in English. No official-status claims.
//   Promise wording is grounded in live rules only: "No fullscreen
//   ad before a kid's game, ever" is the live homepage headline
//   (V0Hero); playing needs no account (checkers play signed-out);
//   there is no open messaging between children (no messaging
//   feature exists — teacher announcements only is the stated
//   phase-2 model, never open user-to-user chat).

export const revalidate = 86400

const HUB_TITLE = 'Free Educational Games for Kids — Play, Learn, No Ads'
const HUB_TITLE_TAG = `${HUB_TITLE} | EduPlay`
const EMPTY_DESCRIPTION =
  'Free educational games for kids — play quizzes, matching, memory and more. No ads, no account needed to play.'

const PROMISES: Array<{ icon: string; title: string; body: string }> = [
  {
    icon: '🆓',
    title: 'Free to play',
    body: 'Playing a game costs nothing. There is no paywall before a game and no subscription needed to play.',
  },
  {
    icon: '🛡️',
    title: 'No ads before play',
    body: 'No fullscreen ad before a kid’s game, ever. That is a rule of the site, not a setting.',
  },
  {
    icon: '👤',
    title: 'No account needed to play',
    body: 'Children play without signing in. An account is only needed to save a game, host a live game, or teach.',
  },
  {
    icon: '🔒',
    title: 'No chat with strangers',
    body: 'EduPlay has no open messaging between children. Kids play games — they never chat with strangers here.',
  },
]

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Is EduPlay really free?',
    a: 'Yes — playing games on EduPlay is free. There is no paywall before a game and no subscription needed to play.',
  },
  {
    q: 'Are there ads?',
    a: 'No fullscreen ad before a kid’s game, ever. That is a rule of the site, not a setting.',
  },
  {
    q: 'Does my child need an account to play?',
    a: 'No. Children play without signing in. An account is only needed to save a game, host a live game, or teach.',
  },
  {
    q: 'Who makes the games?',
    a: 'Teachers, parents and creators — or with AI from a prompt. Games here are made by teachers or with AI. A teacher should review a game before class.',
  },
]

// ─── Metadata ─────────────────────────────────────────────────────────────────
// Same gate as hubs #1, #3 and #4: noindex until >=1 real saved game
// exists. This hub holds 5,112 real games, so the gate flips to
// indexable — verified live by the parent, not assumed here. The
// sitemap is deliberately NOT touched by this batch — this page stays
// out of sitemap.xml until the owner says otherwise.
export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const { activities, count } = await fetchFreeEducationalGamesActivities()
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

export default async function FreeEducationalGamesHubPage({
  params,
}: {
  params: { locale: string }
}) {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'}/${params.locale}/free-educational-games-for-kids`
  const { activities, count } = await fetchFreeEducationalGamesActivities()

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
            { label: 'Free Educational Games for Kids' },
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
            🎮
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
            Free Educational Games for Kids — Play, Learn, No Ads
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '640px',
              margin: '0 auto 1rem',
            }}
          >
            Thousands of free games made by teachers — quizzes, matching,
            memory and more, for every grade. Free to play, no fullscreen
            ad before a kid’s game, and no account needed to play.
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
              href={`/${params.locale}/browse`}
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
              aria-label="Browse free games"
            >
              Browse free games
            </a>
            <a
              href={`/${params.locale}/create`}
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
              Make a game
            </a>
          </div>
        </section>

        {/* Promise — free means free here. Every line is a live rule,
            never a marketing invention (see the header comment). */}
        <section style={{ marginBottom: '2rem' }} aria-labelledby="promise-heading">
          <h2
            id="promise-heading"
            style={{
              fontSize: '1.5rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Free means free here
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
            }}
            role="list"
            aria-label="What free and safe means on EduPlay"
          >
            {PROMISES.map((p) => (
              <div
                key={p.title}
                role="listitem"
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }} aria-hidden="true">
                  {p.icon}
                </div>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{p.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats bar — real numbers only: count from the DB, type count
            from the seed, grade levels from the programme spine,
            subjects from the real DB subject map. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
          role="list"
          aria-label="Free games statistics"
        >
          {[
            { label: 'Free games saved', value: count.toLocaleString() },
            { label: 'Game types', value: String(ACTIVITY_TYPES_SEED.length) },
            { label: 'Grade levels', value: String(FILTER_GRADES.length) },
            { label: 'Subjects', value: String(PROGRAMMATIC_SUBJECT_SLUGS.length) },
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

        {/* Start playing — a CAPPED list (12 newest), never the full
            catalogue: the full catalogue lives on /en/browse. */}
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
            Start playing — newest free games
          </h2>

          {activities.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}
              aria-label="Newest free games grid"
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
                    {activity.subject} · {activity.grade} · {activity.type}
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
                No free games saved yet — make the first one
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
                  href={`/${params.locale}/create`}
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
                  Make the first free game
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
                    border: '2px solid var(--color-primary)',
                    textDecoration: 'none',
                  }}
                >
                  Browse all activities
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Browse by subject — same destinations as the homepage
            (/browse?subject=<DB subject>), entry points only. */}
        <section style={{ marginTop: '3rem' }} aria-labelledby="subjects-heading">
          <h2
            id="subjects-heading"
            style={{
              fontSize: '1.25rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Free games by subject
          </h2>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
            role="list"
            aria-label="Subjects"
          >
            {PROGRAMMATIC_SUBJECT_SLUGS.map((slug) => (
              <a
                key={slug}
                href={`/${params.locale}/browse?subject=${encodeURIComponent(DB_SUBJECT_BY_SLUG[slug])}`}
                role="listitem"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.5rem 0.875rem',
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                {DB_SUBJECT_BY_SLUG[slug]}
              </a>
            ))}
          </div>
        </section>

        {/* Related activity types — same pattern as the subject hubs. */}
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

        {/* FAQ — answers only what is live and verified (see header). */}
        <section style={{ marginTop: '3rem' }} aria-labelledby="faq-heading">
          <h2
            id="faq-heading"
            style={{
              fontSize: '1.25rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Parents ask
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {FAQ.map((item) => (
              <div
                key={item.q}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  padding: '1.25rem',
                }}
              >
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{item.q}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
