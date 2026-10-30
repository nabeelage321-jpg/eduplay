import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generatePageMetadata } from '@/lib/seo/metadata'
import { ACTIVITY_TYPES_SEED, getActivityTypeLabel } from '@/lib/supabase/seed/activity-types'
import { ALL_LOCALES } from '@/lib/seo/metadata'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import EmptyActivitiesCTA from '@/components/activities/EmptyActivitiesCTA'
import { generateWebPageSchema } from '@/lib/seo/schema'
import { fetchProgrammaticActivities, isIndexable } from '@/lib/seo/programmatic'

// ─── Static params: 20 types × 11 locales ────────────────────────────────────

export async function generateStaticParams() {
  const locale = 'en'
  return ACTIVITY_TYPES_SEED.map((actType) => ({
    locale,
    type: actType.slug,
  }))
}

export const dynamicParams = true
export const revalidate = 86400

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string; type: string }
}): Promise<Metadata> {
  const actType = ACTIVITY_TYPES_SEED.find((t) => t.slug === params.type)
  if (!actType) return {}

  const typeLabel = getActivityTypeLabel(actType, params.locale)

  // SEO batch 2026-10-30: index only when real games of this type exist;
  // description comes from real games, never invented copy.
  const { activities, count } = await fetchProgrammaticActivities({
    typeSlug: params.type,
    limit: 100,
  })
  const base = generatePageMetadata({
    template: 'T1',
    locale: params.locale,
    type: params.type,
    typeLabel,
  })
  if (!isIndexable(count)) {
    return { ...base, robots: { index: false, follow: true } }
  }
  const realDescription = activities
    .slice(0, 3)
    .map((a) => (a.description ? `${a.title}: ${a.description}` : a.title))
    .join(' ')
  return {
    ...base,
    description: realDescription,
    openGraph: { ...base.openGraph, description: realDescription },
    twitter: { ...base.twitter, description: realDescription },
    robots: { index: true, follow: true },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ActivityTypeHubPage({
  params,
}: {
  params: { locale: string; type: string }
}) {
  const actType = ACTIVITY_TYPES_SEED.find((t) => t.slug === params.type)
  if (!actType) notFound()

  const typeLabel = getActivityTypeLabel(actType, params.locale)
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'}/${params.locale}/activities/${params.type}`
  const { activities, count } = await fetchProgrammaticActivities({
    typeSlug: params.type,
    limit: 100,
  })

  const jsonLd = generateWebPageSchema({
    url: pageUrl,
    name: `Free ${typeLabel} maker for teachers | EduPlay`,
    description: `Create and play free ${typeLabel} activities for any subject or grade on EduPlay.`,
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
            { label: 'Activities', href: `/${params.locale}/activities` },
            { label: typeLabel },
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
            {actType.icon}
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
            Free {typeLabel} Activities for Teachers
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '600px',
              margin: '0 auto 1.5rem',
            }}
          >
            {actType.description_en}. Browse the {typeLabel.toLowerCase()}s below
            or create your own in minutes — completely free.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`/${params.locale}/create`}
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
              aria-label={`Create a ${typeLabel}`}
            >
              + Create a {typeLabel}
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

        {/* Stats bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
          role="list"
          aria-label="Activity statistics"
        >
          {[
            { label: `${typeLabel}s available`, value: count.toLocaleString() },
            { label: 'Subjects with this type', value: '15' },
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
            Featured {typeLabel}s
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
            aria-label={`${typeLabel} activities grid`}
          >
            {activities.length > 0 ? (
              activities.map((activity) => (
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
              ))
            ) : (
              <EmptyActivitiesCTA locale={params.locale} />
            )}
          </div>
        </section>

        {/* Related activity types */}
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
            {ACTIVITY_TYPES_SEED.filter((t) => t.slug !== params.type)
              .slice(0, 8)
              .map((t) => (
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
