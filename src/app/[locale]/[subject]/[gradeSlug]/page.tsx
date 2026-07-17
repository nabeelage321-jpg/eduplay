import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generatePageMetadata, ALL_LOCALES } from '@/lib/seo/metadata'
import { ACTIVITY_TYPES_SEED, getActivityTypeLabel } from '@/lib/supabase/seed/activity-types'
import { SUBJECTS_SEED, getSubjectName } from '@/lib/supabase/seed/subjects'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { generateWebPageSchema } from '@/lib/seo/schema'

// ─── Static params: 30 subjects × 20 types × 11 locales ──────────────────────

export async function generateStaticParams() {
  const params: { locale: string; subject: string; type: string }[] = []
  for (const locale of ALL_LOCALES) {
    for (const subject of SUBJECTS_SEED) {
      for (const actType of ACTIVITY_TYPES_SEED) {
        params.push({ locale, subject: subject.slug, type: actType.slug })
      }
    }
  }
  return params
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string; subject: string; type: string }
}): Promise<Metadata> {
  const subject = SUBJECTS_SEED.find((s) => s.slug === params.subject)
  const actType = ACTIVITY_TYPES_SEED.find((t) => t.slug === params.type)
  if (!subject || !actType) return {}

  return generatePageMetadata({
    template: 'T2',
    locale: params.locale,
    subject: params.subject,
    subjectLabel: getSubjectName(subject, params.locale),
    type: params.type,
    typeLabel: getActivityTypeLabel(actType, params.locale),
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SubjectTypePage({
  params,
}: {
  params: { locale: string; subject: string; type: string }
}) {
  const subject = SUBJECTS_SEED.find((s) => s.slug === params.subject)
  const actType = ACTIVITY_TYPES_SEED.find((t) => t.slug === params.type)
  if (!subject || !actType) notFound()

  const subjectLabel = getSubjectName(subject, params.locale)
  const typeLabel = getActivityTypeLabel(actType, params.locale)
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay.app'}/${params.locale}/${params.subject}/${params.type}`

  const jsonLd = generateWebPageSchema({
    url: pageUrl,
    name: `${subjectLabel} ${typeLabel} activities for teachers — EduPlay`,
    description: `Free ${subjectLabel} ${typeLabel} activities for every grade level on EduPlay.`,
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
        <Breadcrumb
          items={[
            { label: 'Home', href: `/${params.locale}` },
            { label: subjectLabel, href: `/${params.locale}/activities` },
            { label: typeLabel },
          ]}
        />

        {/* Subject banner */}
        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '2rem',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            marginBottom: '2rem',
            flexWrap: 'wrap',
          }}
          aria-labelledby="page-heading"
        >
          <span style={{ fontSize: '3rem' }} aria-hidden="true">
            {subject.emoji}
          </span>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1
              id="page-heading"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              {subjectLabel} {typeLabel} Activities
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
              Free {subjectLabel.toLowerCase()} {typeLabel.toLowerCase()}s for every grade —
              ready to play in class or assign for homework.
            </p>
          </div>
          <a
            href={`/${params.locale}/create`}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'var(--gradient-btn)',
              color: '#fff',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
            aria-label={`Create a ${subjectLabel} ${typeLabel}`}
          >
            + Create your own
          </a>
        </section>

        {/* Grade filter chips */}
        <section style={{ marginBottom: '1.5rem' }} aria-labelledby="grade-filter-label">
          <h2
            id="grade-filter-label"
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              marginBottom: '0.5rem',
            }}
          >
            Filter by grade
          </h2>
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}
            role="list"
            aria-label="Grade filters"
          >
            {['KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(
              (grade) => (
                <a
                  key={grade}
                  href={`/${params.locale}/${params.subject}/grade-${grade.toLowerCase()}/${params.type}`}
                  role="listitem"
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: 'var(--color-surface-alt)',
                    color: 'var(--color-text-primary)',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    border: '1px solid var(--color-border)',
                    fontWeight: 500,
                  }}
                >
                  Grade {grade}
                </a>
              ),
            )}
          </div>
        </section>

        {/* Activity grid placeholder */}
        <section aria-labelledby="activities-heading">
          <h2
            id="activities-heading"
            style={{
              fontSize: '1.25rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Popular {subjectLabel} {typeLabel}s
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
            aria-label="Activities grid"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-card)',
                  minHeight: '140px',
                }}
                aria-hidden="true"
              >
                <div
                  style={{
                    height: '1rem',
                    background: 'var(--color-border)',
                    borderRadius: '4px',
                    width: '75%',
                    marginBottom: '0.5rem',
                  }}
                />
                <div
                  style={{
                    height: '0.75rem',
                    background: 'var(--color-border)',
                    borderRadius: '4px',
                    width: '55%',
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            marginTop: '3rem',
            padding: '2rem',
            background: 'var(--gradient-hero)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
          }}
          aria-labelledby="cta-heading"
        >
          <h2
            id="cta-heading"
            style={{
              fontSize: '1.5rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '0.75rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Create your own {subjectLabel} {typeLabel}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
            Build a custom {typeLabel.toLowerCase()} in minutes using AI — or from scratch.
          </p>
          <a
            href={`/${params.locale}/create`}
            style={{
              display: 'inline-block',
              padding: '0.875rem 2rem',
              background: 'var(--gradient-btn)',
              color: '#fff',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            Get started — it&apos;s free
          </a>
        </section>

        {/* Related subjects */}
        <section style={{ marginTop: '2.5rem' }} aria-labelledby="related-subjects-heading">
          <h2
            id="related-subjects-heading"
            style={{
              fontSize: '1.125rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '0.75rem',
              color: 'var(--color-text-primary)',
            }}
          >
            More {typeLabel} activities by subject
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }} role="list">
            {SUBJECTS_SEED.filter((s) => s.slug !== params.subject)
              .slice(0, 10)
              .map((s) => (
                <a
                  key={s.slug}
                  href={`/${params.locale}/${s.slug}/${params.type}`}
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
                  <span aria-hidden="true">{s.emoji}</span>
                  {getSubjectName(s, params.locale)}
                </a>
              ))}
          </div>
        </section>
      </main>
    </>
  )
}
