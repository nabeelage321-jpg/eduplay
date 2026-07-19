import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generatePageMetadata, ALL_LOCALES } from '@/lib/seo/metadata'
import { CURRICULA_SEED } from '@/lib/supabase/seed/curricula'
import { GRADES_SEED, getGradeLabel } from '@/lib/supabase/seed/grades'
import { SUBJECTS_SEED, getSubjectName } from '@/lib/supabase/seed/subjects'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { generateWebPageSchema } from '@/lib/seo/schema'

// ─── Static params: curricula × their grades × 11 locales ────────────────────

export async function generateStaticParams() {
  const locale = 'en'
  const params: { locale: string; board: string; grade: string }[] = []

  for (const curriculum of CURRICULA_SEED.slice(0, 20)) {
    const gradeSlug = curriculum.grades[0]
    if (gradeSlug) {
      params.push({ locale, board: curriculum.slug, grade: gradeSlug })
    }
  }

  return params
}

export const dynamicParams = true
export const revalidate = 86400

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string; board: string; grade: string }
}): Promise<Metadata> {
  const curriculum = CURRICULA_SEED.find((c) => c.slug === params.board)
  const grade = GRADES_SEED.find((g) => g.slug === params.grade)
  if (!curriculum || !grade) return {}

  return generatePageMetadata({
    template: 'T6',
    locale: params.locale,
    board: params.board,
    boardLabel: curriculum.board_name,
    grade: params.grade,
    gradeLabel: getGradeLabel(grade, params.locale),
    country: curriculum.country,
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CurriculumPage({
  params,
}: {
  params: { locale: string; board: string; grade: string }
}) {
  const curriculum = CURRICULA_SEED.find((c) => c.slug === params.board)
  const grade = GRADES_SEED.find((g) => g.slug === params.grade)
  if (!curriculum || !grade) notFound()

  const gradeLabel = getGradeLabel(grade, params.locale)
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay.app'
  const pageUrl = `${base}/${params.locale}/curriculum/${params.board}/${params.grade}`

  // Other grades for this curriculum
  const otherGrades = GRADES_SEED.filter((g) =>
    curriculum.grades.includes(g.slug) && g.slug !== params.grade,
  )

  // Same-grade other boards (for cross-linking)
  const otherBoards = CURRICULA_SEED.filter(
    (c) => c.slug !== params.board && c.grades.includes(params.grade),
  ).slice(0, 5)

  const jsonLd = generateWebPageSchema({
    url: pageUrl,
    name: `${curriculum.board_name} ${gradeLabel} interactive activities — EduPlay`,
    description: `Curriculum-aligned interactive activities for ${curriculum.board_name} ${gradeLabel}. Mapped to your syllabus — free for teachers.`,
    locale: params.locale,
  })

  // Core subjects to display for this grade
  const coreSubjects = SUBJECTS_SEED.slice(0, 12)

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
            { label: curriculum.board_name, href: `/${params.locale}/curriculum/${params.board}/${GRADES_SEED[2].slug}` },
            { label: gradeLabel },
          ]}
        />

        {/* Header */}
        <section
          style={{
            padding: '2.5rem 2rem',
            background: 'var(--gradient-hero)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2rem',
          }}
          aria-labelledby="curriculum-heading"
        >
          <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '0.25rem 0.75rem',
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              📋 {curriculum.board_name}
            </span>
            <span
              style={{
                padding: '0.25rem 0.75rem',
                background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                border: '1px solid var(--color-border)',
              }}
            >
              🌍 {curriculum.country}
            </span>
          </div>

          <h1
            id="curriculum-heading"
            style={{
              fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              marginBottom: '0.75rem',
            }}
          >
            {curriculum.board_name} {gradeLabel} Interactive Activities
          </h1>

          <p
            style={{
              color: 'var(--color-text-secondary)',
              maxWidth: '640px',
              marginBottom: '1.5rem',
            }}
          >
            Curriculum-aligned quizzes, games, and interactive activities specifically
            designed for {curriculum.board_name} {gradeLabel} students. All free for teachers.
          </p>

          {curriculum.board_name_local && (
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                direction: params.locale === 'ur' || params.locale === 'ar' ? 'rtl' : 'ltr',
              }}
            >
              {curriculum.board_name_local}
            </p>
          )}

          <a
            href={`/${params.locale}/create`}
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: 'var(--gradient-btn)',
              color: '#fff',
              borderRadius: 'var(--radius)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            + Create activity for {gradeLabel}
          </a>
        </section>

        {/* Subjects grid */}
        <section style={{ marginBottom: '2.5rem' }} aria-labelledby="subjects-heading">
          <h2
            id="subjects-heading"
            style={{
              fontSize: '1.25rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            {gradeLabel} subjects on {curriculum.board_name}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.75rem',
            }}
            role="list"
            aria-label={`Subjects for ${curriculum.board_name} ${gradeLabel}`}
          >
            {coreSubjects.map((subject) => (
              <a
                key={subject.slug}
                href={`/${params.locale}/${subject.slug}/${params.grade}/quiz`}
                role="listitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '1rem',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontSize: '1.5rem' }} aria-hidden="true">
                  {subject.emoji}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                    {getSubjectName(subject, params.locale)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    View activities
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Grade navigation for this board */}
        <section style={{ marginBottom: '2rem' }} aria-labelledby="grade-nav-heading">
          <h2
            id="grade-nav-heading"
            style={{
              fontSize: '1.125rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '0.75rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Other grades on {curriculum.board_name}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }} role="list">
            {otherGrades.map((g) => (
              <a
                key={g.slug}
                href={`/${params.locale}/curriculum/${params.board}/${g.slug}`}
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
                {getGradeLabel(g, params.locale)}
              </a>
            ))}
          </div>
        </section>

        {/* Other boards for same grade */}
        {otherBoards.length > 0 && (
          <section aria-labelledby="other-boards-heading">
            <h2
              id="other-boards-heading"
              style={{
                fontSize: '1.125rem',
                fontFamily: 'var(--font-display)',
                marginBottom: '0.75rem',
                color: 'var(--color-text-primary)',
              }}
            >
              Other curricula for {gradeLabel}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }} role="list">
              {otherBoards.map((b) => (
                <a
                  key={b.slug}
                  href={`/${params.locale}/curriculum/${b.slug}/${params.grade}`}
                  role="listitem"
                  style={{
                    padding: '0.5rem 0.875rem',
                    background: 'var(--color-surface-alt)',
                    color: 'var(--color-text-primary)',
                    borderRadius: 'var(--radius)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {b.board_name}
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
