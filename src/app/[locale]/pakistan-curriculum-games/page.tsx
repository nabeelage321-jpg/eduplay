import type { Metadata } from 'next'
import { generateWebPageSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { fetchPakistanCurriculumActivities, isIndexable } from '@/lib/seo/programmatic'
import {
  CURRICULUM_KIND_LABELS,
  curriculumTagLabel,
  getCurriculumCountry,
} from '@/lib/curricula'
import { ACTIVITY_TYPES_SEED, getActivityTypeLabel } from '@/lib/supabase/seed/activity-types'

// ─── Beat-plan build #1 — Tier-1 hub "Pakistan curriculum games" ────────────
// Locked method first (2026-11-05): top-3 titles/metas for the keyword:
//   1. Chiragh (chiraghpk.com) — "Chiragh - Pakistan's Game-Based
//      Learning Platform | Classes 1–10" / "Game-Based Learning for
//      Pakistan's Curriculum. Your child becomes the hero." Chapter-
//      to-game, every subject/chapter/class, Federal/Punjab/KPK
//      boards, no ads, offline — 7-day free trial, then subscription.
//   2. PomPak (State Bank of Pakistan) — a single-topic financial
//      literacy game app, not a curriculum platform.
//   3. AKU Learning Through Play — downloadable board/card games per
//      science topic, not a platform.
// Best of the three: lead with the keyword + Chiragh's chapter-to-
// game + no-ads pattern, and beat it on EduPlay's honest edges —
// free (no trial-then-subscription), no account needed to play,
// teacher-made, 40 game types. Headline = keyword + customer-
// problem solution: school lessons turned into free games.
// No strong direct rival targets this exact keyword — the page is
// winnable, and its games list is real-or-empty, never invented.

export const revalidate = 604800

const HUB_TITLE = 'Pakistan Curriculum Games — Turn School Lessons Into Free Games'
const HUB_TITLE_TAG = `${HUB_TITLE} | EduPlay`
const EMPTY_DESCRIPTION =
  'Free Pakistan curriculum games for teachers and students — made for the National Curriculum of Pakistan (2022), BISE/FBISE and more. No ads, no account needed to play.'

// ─── Metadata ─────────────────────────────────────────────────────────────────
// Same gate as the type hubs: noindex until >=1 real saved game exists.
// The sitemap is deliberately NOT touched by this batch — even once
// games exist, this page stays out of sitemap.xml until the owner
// says otherwise.
export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const { activities, count } = await fetchPakistanCurriculumActivities()
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

export default async function PakistanCurriculumGamesHubPage({
  params,
}: {
  params: { locale: string }
}) {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'}/${params.locale}/pakistan-curriculum-games`
  const { activities, count } = await fetchPakistanCurriculumActivities()
  const pakistanCountry = getCurriculumCountry('PK')
  const pakistanSyllabuses = pakistanCountry?.syllabuses ?? []

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
            { label: 'Pakistan Curriculum Games' },
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
            🇵🇰
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
            Pakistan Curriculum Games — Turn School Lessons Into Free Games
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '640px',
              margin: '0 auto 1rem',
            }}
          >
            Games made for Pakistan&apos;s curriculum — the National Curriculum of
            Pakistan (2022), BISE / FBISE Board Syllabuses, AKU-EB, Cambridge
            International and IB. Free to play, no ads, and no account needed
            to play.
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              maxWidth: '640px',
              margin: '0 auto 1.5rem',
            }}
          >
            Every game here is made with AI for a Pakistan syllabus topic. A
            teacher should review it before class — it is not official board
            material.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`/${params.locale}/create?country=Pakistan`}
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
              aria-label="Make a Pakistan curriculum game"
            >
              {count === 0 ? '+ Make the first Pakistan curriculum game' : '+ Make a Pakistan curriculum game'}
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

        {/* Stats bar — real numbers only: count from the DB, syllabus
            count from the seed, grade levels from the programme spine. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
          role="list"
          aria-label="Pakistan curriculum games statistics"
        >
          {[
            { label: 'Pakistan games saved', value: count.toLocaleString() },
            { label: 'Syllabuses listed', value: String(pakistanSyllabuses.length) },
            { label: 'Grade levels', value: '14' },
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

        {/* Games list — real tagged games only, newest first. */}
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
            Pakistan curriculum games
          </h2>

          {activities.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}
              aria-label="Pakistan curriculum games grid"
            >
              {activities.map((activity) => {
                const syllabusLabel = curriculumTagLabel(activity.curriculum)
                return (
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
                    {syllabusLabel ? (
                      <span style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        {syllabusLabel}
                      </span>
                    ) : null}
                  </a>
                )
              })}
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
                No Pakistan-curriculum games saved yet — make the first one
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
                  href={`/${params.locale}/create?country=Pakistan`}
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
                  Make the first Pakistan curriculum game
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

        {/* Syllabuses this page covers — names straight from the seed,
            never invented. The Pakistan label is the seed default
            ("National Curriculum of Pakistan (2022)") — the owner
            has not decided SNC vs NCP 2022 naming yet. */}
        {pakistanSyllabuses.length > 0 && (
          <section style={{ marginTop: '3rem' }} aria-labelledby="syllabuses-heading">
            <h2
              id="syllabuses-heading"
              style={{
                fontSize: '1.25rem',
                fontFamily: 'var(--font-display)',
                marginBottom: '1rem',
                color: 'var(--color-text-primary)',
              }}
            >
              Syllabuses this page covers
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '0.75rem',
              }}
              role="list"
              aria-label="Pakistan syllabuses"
            >
              {pakistanSyllabuses.map((s) => (
                <div
                  key={s.slug}
                  role="listitem"
                  style={{
                    padding: '1rem',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {CURRICULUM_KIND_LABELS[s.kind]}
                    {s.scope ? ` · ${s.scope}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
