import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generatePageMetadata } from '@/lib/seo/metadata'
import { ACTIVITY_TYPES_SEED, getActivityTypeLabel } from '@/lib/supabase/seed/activity-types'
import { ALL_LOCALES } from '@/lib/seo/metadata'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { generateWebPageSchema } from '@/lib/seo/schema'

// ─── Static params: 20 types × 11 locales ────────────────────────────────────

export async function generateStaticParams() {
  const params: { locale: string; type: string }[] = []
  for (const locale of ALL_LOCALES) {
    for (const actType of ACTIVITY_TYPES_SEED) {
      params.push({ locale, type: actType.slug })
    }
  }
  return params
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string; type: string }
}): Promise<Metadata> {
  const actType = ACTIVITY_TYPES_SEED.find((t) => t.slug === params.type)
  if (!actType) return {}

  const typeLabel = getActivityTypeLabel(actType, params.locale)

  return generatePageMetadata({
    template: 'T1',
    locale: params.locale,
    type: params.type,
    typeLabel,
  })
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
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay.app'}/${params.locale}/activities/${params.type}`

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
            {actType.description_en}. Browse thousands of ready-made {typeLabel.toLowerCase()}s
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
            { label: `${typeLabel}s available`, value: '10,000+' },
            { label: 'Subjects covered', value: '30' },
            { label: 'Grade levels', value: '14' },
            { label: 'Languages', value: '11' },
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

        {/* Activity grid placeholder — populated from DB in production */}
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
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Hand-picked {typeLabel.toLowerCase()}s loved by teachers worldwide.
          </p>

          {/* Skeleton grid — replaced with real ActivityGrid component in Phase 2 integration */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
            aria-label={`${typeLabel} activities grid`}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-card)',
                  minHeight: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
                aria-hidden="true"
              >
                <div
                  style={{
                    height: '1rem',
                    background: 'var(--color-border)',
                    borderRadius: '4px',
                    width: '70%',
                  }}
                />
                <div
                  style={{
                    height: '0.75rem',
                    background: 'var(--color-border)',
                    borderRadius: '4px',
                    width: '50%',
                  }}
                />
                <div style={{ flex: 1 }} />
                <div
                  style={{
                    height: '2rem',
                    background: 'var(--color-primary)',
                    borderRadius: 'var(--radius-sm)',
                    opacity: 0.15,
                  }}
                />
              </div>
            ))}
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
