import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generatePageMetadata, ALL_LOCALES } from '@/lib/seo/metadata'
import { TOPICS_SEED } from '@/lib/supabase/seed/topics'
import { ACTIVITY_TYPES_SEED, getActivityTypeLabel } from '@/lib/supabase/seed/activity-types'
import { SUBJECTS_SEED, getSubjectName } from '@/lib/supabase/seed/subjects'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { generateWebPageSchema } from '@/lib/seo/schema'

// ─── Static params: 500 topics × 11 locales ──────────────────────────────────

export async function generateStaticParams() {
  const locale = 'en'
  return TOPICS_SEED.slice(0, 20).map((topic) => ({
    locale,
    topic: topic.slug,
  }))
}

export const dynamicParams = true
export const revalidate = 86400

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string; topic: string }
}): Promise<Metadata> {
  const topic = TOPICS_SEED.find((t) => t.slug === params.topic)
  if (!topic) return {}

  const subject = SUBJECTS_SEED.find((s) => s.slug === topic.subject_slug)
  const topicLabel =
    params.locale === 'ur'
      ? topic.name_ur
      : params.locale === 'ar'
        ? topic.name_ar
        : topic.name_en

  return generatePageMetadata({
    template: 'T5',
    locale: params.locale,
    topic: params.topic,
    topicLabel,
    subjectLabel: subject ? getSubjectName(subject, params.locale) : undefined,
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TopicPage({
  params,
}: {
  params: { locale: string; topic: string }
}) {
  const topic = TOPICS_SEED.find((t) => t.slug === params.topic)
  if (!topic) notFound()

  const subject = SUBJECTS_SEED.find((s) => s.slug === topic.subject_slug)
  const subjectLabel = subject ? getSubjectName(subject, params.locale) : ''

  const topicLabel =
    params.locale === 'ur'
      ? topic.name_ur
      : params.locale === 'ar'
        ? topic.name_ar
        : topic.name_en

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'
  const pageUrl = `${base}/${params.locale}/topics/${params.topic}`

  // Related topics from same subject
  const relatedTopics = TOPICS_SEED.filter(
    (t) => t.subject_slug === topic.subject_slug && t.slug !== params.topic,
  ).slice(0, 8)

  const jsonLd = generateWebPageSchema({
    url: pageUrl,
    name: `${topicLabel} activities and games for teachers — EduPlay`,
    description: `Interactive activities, quizzes and games on ${topicLabel}. All free for teachers on EduPlay.`,
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
            ...(subject
              ? [{ label: subjectLabel, href: `/${params.locale}/activities` }]
              : []),
            { label: topicLabel },
          ]}
        />

        {/* Topic hero */}
        <section
          style={{
            padding: '2.5rem 2rem',
            background: 'var(--gradient-hero)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2rem',
          }}
          aria-labelledby="topic-heading"
        >
          {subject && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.25rem 0.625rem',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span aria-hidden="true">{subject.emoji}</span>
                {subjectLabel}
              </span>
            </div>
          )}
          <h1
            id="topic-heading"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              marginBottom: '0.75rem',
            }}
          >
            {topicLabel} Activities &amp; Games
          </h1>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              maxWidth: '600px',
              marginBottom: '1.5rem',
            }}
          >
            Interactive quizzes, games, and activities on {topicLabel} — all free for teachers.
            Play in class, assign as homework, or create your own.
          </p>
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
            + Create {topicLabel} activity
          </a>
        </section>

        {/* Activity types available for this topic */}
        <section style={{ marginBottom: '2rem' }} aria-labelledby="types-heading">
          <h2
            id="types-heading"
            style={{
              fontSize: '1.25rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Activity types for {topicLabel}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '0.75rem',
            }}
            role="list"
            aria-label={`Activity types for ${topicLabel}`}
          >
            {ACTIVITY_TYPES_SEED.slice(0, 8).map((t) => (
              <a
                key={t.slug}
                href={`/${params.locale}/topics/${params.topic}#${t.slug}`}
                role="listitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem 1rem',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>
                  {t.icon}
                </span>
                {getActivityTypeLabel(t, params.locale)}
              </a>
            ))}
          </div>
        </section>

        {/* Popular activities for topic */}
        <section style={{ marginBottom: '2rem' }} aria-labelledby="popular-heading">
          <h2
            id="popular-heading"
            style={{
              fontSize: '1.25rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Popular {topicLabel} Activities
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
            aria-label={`Popular ${topicLabel} activities`}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-card)',
                  minHeight: '130px',
                }}
                aria-hidden="true"
              >
                <div
                  style={{
                    height: '1rem',
                    background: 'var(--color-border)',
                    borderRadius: '4px',
                    width: '70%',
                    marginBottom: '0.5rem',
                  }}
                />
                <div
                  style={{
                    height: '0.75rem',
                    background: 'var(--color-border)',
                    borderRadius: '4px',
                    width: '45%',
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Related topics */}
        {relatedTopics.length > 0 && (
          <section aria-labelledby="related-topics-heading">
            <h2
              id="related-topics-heading"
              style={{
                fontSize: '1.125rem',
                fontFamily: 'var(--font-display)',
                marginBottom: '0.75rem',
                color: 'var(--color-text-primary)',
              }}
            >
              Related {subjectLabel} topics
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }} role="list">
              {relatedTopics.map((t) => {
                const label =
                  params.locale === 'ur'
                    ? t.name_ur
                    : params.locale === 'ar'
                      ? t.name_ar
                      : t.name_en
                return (
                  <a
                    key={t.slug}
                    href={`/${params.locale}/topics/${t.slug}`}
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
                    {label}
                  </a>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
