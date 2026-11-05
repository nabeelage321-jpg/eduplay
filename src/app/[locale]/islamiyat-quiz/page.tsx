import type { Metadata } from 'next'
import { generateWebPageSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { fetchIslamiyatSubjectActivities, isIndexable } from '@/lib/seo/programmatic'
import { FILTER_GRADES } from '@/lib/filters'
import { ACTIVITY_TYPES_SEED, getActivityTypeLabel } from '@/lib/supabase/seed/activity-types'

// ─── Beat-plan build #4 — hub "Islamiyat quiz" ─────────────────────────────
// Locked method first (2026-11-05, fresh web search for "Islamiyat quiz"):
//   1. Al-Khalil Institute (alkhalilinstitute.org) — "The Ultimate 2026
//      Guide to Cambridge O Level Islamiyat (2058): Notes, Past Papers,
//      and Revision Strategy" — an exam revision guide with an
//      interactive quiz section. Exam-focused, not a playable games hub.
//   2. Islamhelpline (islamhelpline.net) — "Islamic quiz questions." —
//      a static Q&A list with references. Not playable games.
//   3. Islamic Info Center (islamicinfocenter.com) — "100+ Powerful
//      Islamic quiz with answers" — a static MCQ list for learners of
//      all ages. Not a games hub.
// Also seen: QuizGecko "Chapter 1: Islamiyat Textbook Topics Quiz"
// (one generated 12-question textbook quiz), CodePen "Islamic Quiz for
// Kids" (one single embed). None of them is a free, no-account,
// playable-in-the-browser, teacher-made Islamiyat games hub with many
// game types. Best of the three: lead with the keyword + free playable
// quizzes/games online + no account + teacher-made + 40 game types.
// Headline = keyword + customer-problem solution: Islamiyat revision
// turned into free games. All copy is in English — no Urdu or Arabic
// wording is used anywhere on this page, because no translation was
// verified.
// Overlap check: this hub filters by subject = 'Islamiyat' (DB column,
// any curriculum), distinct from hub #1 (curriculum-country filter,
// Pakistan-tagged games) and hub #3 (subject = 'Urdu'). Not a duplicate.
// LIVE COUNT (verified 2026-11-05 against GET /api/activities?
// subject=Islamiyat, all 342 rows fetched): 342 public games, ALL
// subject=Islamiyat, ALL public — 23 per grade × 14 grades = 322
// programme games + 20 older pre-k games. POPULATED from day one.

export const revalidate = 86400

const HUB_TITLE = 'Islamiyat Quiz — Turn Islamiyat Revision Into Free Games'
const HUB_TITLE_TAG = `${HUB_TITLE} | EduPlay`
const EMPTY_DESCRIPTION =
  'Free Islamiyat quiz games — play quizzes, matching, memory and more to learn Islamiyat. No ads, no account needed to play.'

// ─── Metadata ─────────────────────────────────────────────────────────────────
// Same gate as hub #1, hub #3 and the type hubs: noindex until >=1 real
// saved game exists. This hub holds 342 real games, so the gate flips
// to indexable — verified live by the parent, not assumed here. The
// sitemap is deliberately NOT touched by this batch — this page stays
// out of sitemap.xml until the owner says otherwise.
export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const { activities, count } = await fetchIslamiyatSubjectActivities()
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

export default async function IslamiyatQuizHubPage({
  params,
}: {
  params: { locale: string }
}) {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'}/${params.locale}/islamiyat-quiz`
  const { activities, count } = await fetchIslamiyatSubjectActivities()

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
            { label: 'Islamiyat Quiz' },
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
            🌙
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
            Islamiyat Quiz — Turn Islamiyat Revision Into Free Games
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '640px',
              margin: '0 auto 1rem',
            }}
          >
            Quizzes and games that teach Islamiyat — revise, play and
            remember. Free to play, no ads, and no account needed to play.
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
              href={`/${params.locale}/create?subject=Islamiyat`}
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
              aria-label="Make an Islamiyat game"
            >
              {count === 0 ? '+ Make the first Islamiyat game' : '+ Make an Islamiyat game'}
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
          aria-label="Islamiyat games statistics"
        >
          {[
            { label: 'Islamiyat games saved', value: count.toLocaleString() },
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

        {/* Games list — real Islamiyat-subject games only, newest first. */}
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
            Islamiyat quiz games
          </h2>

          {activities.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}
              aria-label="Islamiyat games grid"
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
                No Islamiyat games saved yet — make the first one
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
                  href={`/${params.locale}/create?subject=Islamiyat`}
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
                  Make the first Islamiyat game
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
            Islamiyat for every grade
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
