import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generatePageMetadata, ALL_LOCALES } from '@/lib/seo/metadata'
import { ACTIVITY_TYPES_SEED, getActivityTypeLabel } from '@/lib/supabase/seed/activity-types'
import { SUBJECTS_SEED, getSubjectName } from '@/lib/supabase/seed/subjects'
import { GRADES_SEED, getGradeLabel } from '@/lib/supabase/seed/grades'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { generateWebPageSchema, generateBreadcrumbSchema } from '@/lib/seo/schema'

export async function generateStaticParams() {
  const params: { locale: string; subject: string; gradeSlug: string; typeSlug: string }[] = []
  for (const locale of ALL_LOCALES) {
    for (const subject of SUBJECTS_SEED) {
      for (const grade of GRADES_SEED) {
        for (const actType of ACTIVITY_TYPES_SEED) {
          params.push({
            locale,
            subject: subject.slug,
            gradeSlug: grade.slug,
            typeSlug: actType.slug,
          })
        }
      }
    }
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; subject: string; gradeSlug: string; typeSlug: string }
}): Promise<Metadata> {
  const subject = SUBJECTS_SEED.find((s) => s.slug === params.subject)
  const grade = GRADES_SEED.find((g) => g.slug === params.gradeSlug)
  const actType = ACTIVITY_TYPES_SEED.find((t) => t.slug === params.typeSlug)
  if (!subject || !grade || !actType) return {}

  return generatePageMetadata({
    template: 'T3',
    locale: params.locale,
    subject: params.subject,
    subjectLabel: getSubjectName(subject, params.locale),
    grade: params.gradeSlug,
    gradeLabel: getGradeLabel(grade, params.locale),
    type: params.typeSlug,
    typeLabel: getActivityTypeLabel(actType, params.locale),
  })
}

export default async function SubjectGradeTypePage({
  params,
}: {
  params: { locale: string; subject: string; gradeSlug: string; typeSlug: string }
}) {
  const subject = SUBJECTS_SEED.find((s) => s.slug === params.subject)
  const grade = GRADES_SEED.find((g) => g.slug === params.gradeSlug)
  const actType = ACTIVITY_TYPES_SEED.find((t) => t.slug === params.typeSlug)
  if (!subject || !grade || !actType) notFound()

  const subjectLabel = getSubjectName(subject, params.locale)
  const gradeLabel = getGradeLabel(grade, params.locale)
  const typeLabel = getActivityTypeLabel(actType, params.locale)
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay.app'
  const pageUrl = `${base}/${params.locale}/${params.subject}/${params.gradeSlug}/${params.typeSlug}`

  const gradeIndex = GRADES_SEED.findIndex((g) => g.slug === params.gradeSlug)
  const prevGrade = gradeIndex > 0 ? GRADES_SEED[gradeIndex - 1] : null
  const nextGrade = gradeIndex < GRADES_SEED.length - 1 ? GRADES_SEED[gradeIndex + 1] : null

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: `${base}/${params.locale}` },
    { name: subjectLabel, url: `${base}/${params.locale}/${params.subject}/${params.typeSlug}` },
    { name: gradeLabel, url: pageUrl },
    { name: typeLabel, url: pageUrl },
  ])

  const webPageSchema = generateWebPageSchema({
    url: pageUrl,
    name: `${gradeLabel} ${subjectLabel} ${typeLabel} — free for teachers | EduPlay`,
    description: `Free ${gradeLabel} ${subjectLabel} ${typeLabel} activities. Curriculum-aligned and ready to play.`,
    locale: params.locale,
  })

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={webPageSchema} />

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
            { label: subjectLabel, href: `/${params.locale}/${params.subject}/${params.typeSlug}` },
            { label: gradeLabel, href: `/${params.locale}/${params.subject}/${params.gradeSlug}/${params.typeSlug}` },
            { label: typeLabel },
          ]}
        />

        <section
          style={{
            padding: '2.5rem 2rem',
            background: 'var(--gradient-hero)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2rem',
          }}
          aria-labelledby="t3-heading"
        >
          <div style={{ marginBottom: '0.75rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.25rem 0.75rem',
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              📚 {gradeLabel}
            </span>
          </div>

          <h1
            id="t3-heading"
            style={{
              fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              marginBottom: '0.75rem',
            }}
          >
            {gradeLabel} {subjectLabel} {typeLabel}
          </h1>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '1rem',
              maxWidth: '640px',
              marginBottom: '1.5rem',
            }}
          >
            Free, curriculum-aligned {subjectLabel.toLowerCase()} {typeLabel.toLowerCase()} activities for {gradeLabel} students.
          </p>

          <a
            href={`/${params.locale}/create`}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--gradient-btn)',
              color: '#fff',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            + Create {gradeLabel} {typeLabel}
          </a>
        </section>

        <nav
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
          aria-label="Adjacent grade navigation"
        >
          {prevGrade ? (
            <a
              href={`/${params.locale}/${params.subject}/${prevGrade.slug}/${params.typeSlug}`}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--color-surface)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                border: '1px solid var(--color-border)',
                fontSize: '0.875rem',
              }}
            >
              ← {getGradeLabel(prevGrade, params.locale)}
            </a>
          ) : (
            <span />
          )}

          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {subjectLabel} · {typeLabel}
          </span>

          {nextGrade ? (
            <a
              href={`/${params.locale}/${params.subject}/${nextGrade.slug}/${params.typeSlug}`}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--color-surface)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                border: '1px solid var(--color-border)',
                fontSize: '0.875rem',
              }}
            >
              {getGradeLabel(nextGrade, params.locale)} →
            </a>
          ) : (
            <span />
          )}
        </nav>

        <section aria-labelledby="t3-activities-heading">
          <h2
            id="t3-activities-heading"
            style={{
              fontSize: '1.25rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            {gradeLabel} {subjectLabel} {typeLabel}s
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <article
                key={i}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-card)',
                  minHeight: '160px',
                }}
              >
                <div style={{ height: '1rem', background: 'var(--color-border)', borderRadius: '4px', width: '75%', marginBottom: '0.5rem' }} />
                <div style={{ height: '0.75rem', background: 'var(--color-border)', borderRadius: '4px', width: '50%', marginBottom: '1rem' }} />
                <div style={{ height: '0.75rem', background: 'var(--color-border)', borderRadius: '4px', width: '90%', marginBottom: '0.375rem' }} />
                <div style={{ height: '0.75rem', background: 'var(--color-border)', borderRadius: '4px', width: '65%' }} />
              </article>
            ))}
          </div>
        </section>

        <section style={{ marginTop: '3rem' }} aria-labelledby="related-grades-heading">
          <h2
            id="related-grades-heading"
            style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}
          >
            {subjectLabel} {typeLabel}s by grade
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {GRADES_SEED.filter((g) => g.slug !== params.gradeSlug).map((g) => (
              <a
                key={g.slug}
                href={`/${params.locale}/${params.subject}/${g.slug}/${params.typeSlug}`}
                style={{
                  padding: '0.375rem 0.75rem',
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                {getGradeLabel(g, params.locale)}
              </a>
            ))}
          </div>
        </section>

        <section style={{ marginTop: '2rem' }} aria-labelledby="other-types-heading">
          <h2
            id="other-types-heading"
            style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}
          >
            Other activity types for {gradeLabel} {subjectLabel}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {ACTIVITY_TYPES_SEED.filter((t) => t.slug !== params.typeSlug)
              .slice(0, 8)
              .map((t) => (
                <a
                  key={t.slug}
                  href={`/${params.locale}/${params.subject}/${params.gradeSlug}/${t.slug}`}
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
                  <span>{t.icon}</span>
                  {getActivityTypeLabel(t, params.locale)}
                </a>
              ))}
          </div>
        </section>
      </main>
    </>
  )
}
