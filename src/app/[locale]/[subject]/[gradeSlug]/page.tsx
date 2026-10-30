import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generatePageMetadata } from '@/lib/seo/metadata'
import { ACTIVITY_TYPES_SEED, getActivityTypeLabel } from '@/lib/supabase/seed/activity-types'
import { SUBJECTS_SEED, getSubjectName } from '@/lib/supabase/seed/subjects'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import EmptyActivitiesCTA from '@/components/activities/EmptyActivitiesCTA'
import { generateWebPageSchema } from '@/lib/seo/schema'
import { fetchProgrammaticActivities, isIndexable } from '@/lib/seo/programmatic'

// ─── Static params ────────────────────────────────────────────────────────────
// NOTE: this route is /[locale]/[subject]/[gradeSlug] where the second
// segment actually carries the TYPE slug (URLs are /{subject}/{type}).
// The previous generateStaticParams returned a `type` key that never
// matched this route. Pages render on demand (revalidated daily) instead.
export async function generateStaticParams() {
  return []
}

export const dynamicParams = true
// force-dynamic: with generateStaticParams() returning [], Next 14.2
// otherwise tries to prerender this route statically and throws
// DYNAMIC_SERVER_USAGE on the Supabase fetch (live 500 before this fix).
// T2 pages therefore render on demand, always with fresh DB data.
export const dynamic = 'force-dynamic'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string; subject: string; gradeSlug: string }
}): Promise<Metadata> {
  const typeSlug = params.gradeSlug
  const subject = SUBJECTS_SEED.find((s) => s.slug === params.subject)
  const actType = ACTIVITY_TYPES_SEED.find((t) => t.slug === typeSlug)
  if (!subject || !actType) return {}

  // SEO batch 2026-10-30: index ONLY when real games exist for this
  // subject/type combination; description comes from real games.
  const { activities, count } = await fetchProgrammaticActivities({
    subjectSlug: params.subject,
    typeSlug,
    limit: 100,
  })
  const base = generatePageMetadata({
    template: 'T2',
    locale: params.locale,
    subject: params.subject,
    subjectLabel: getSubjectName(subject, params.locale),
    type: typeSlug,
    typeLabel: getActivityTypeLabel(actType, params.locale),
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

export default async function SubjectTypePage({
  params,
}: {
  params: { locale: string; subject: string; gradeSlug: string }
}) {
  const typeSlug = params.gradeSlug
  const subject = SUBJECTS_SEED.find((s) => s.slug === params.subject)
  const actType = ACTIVITY_TYPES_SEED.find((t) => t.slug === typeSlug)
  if (!subject || !actType) notFound()

  const subjectLabel = getSubjectName(subject, params.locale)
  const typeLabel = getActivityTypeLabel(actType, params.locale)
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'}/${params.locale}/${params.subject}/${typeSlug}`
  const { activities } = await fetchProgrammaticActivities({
    subjectSlug: params.subject,
    typeSlug,
    limit: 100,
  })

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
                  href={`/${params.locale}/${params.subject}/grade-${grade.toLowerCase()}/${typeSlug}`}
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
                  href={`/${params.locale}/${s.slug}/${typeSlug}`}
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
