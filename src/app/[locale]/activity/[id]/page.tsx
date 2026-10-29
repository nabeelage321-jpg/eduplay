import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generatePageMetadata } from '@/lib/seo/metadata'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { generateActivitySchema, generateBreadcrumbSchema } from '@/lib/seo/schema'

// ─── ISR: revalidate every 24 hours ──────────────────────────────────────────
export const revalidate = 86400

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityData {
  id: string
  title: string
  description: string
  locale: string
  subject: string
  subjectEmoji: string
  gradeMin: number
  gradeMax: number
  teacherName: string
  teacherUsername: string
  activityType: string
  activityTypeLabel: string
  playCount: number
  likeCount: number
  createdAt: string
  imageUrl?: string
  items: { prompt: string; answer: string }[]
  relatedActivities: { id: string; title: string; type: string }[]
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getActivity(id: string, locale: string): Promise<ActivityData | null> {
  // In production this queries Supabase. Returning mock data for Phase 5 scaffold.
  const mockActivities: Record<string, ActivityData> = {
    'grade-5-math-fractions-quiz': {
      id: 'grade-5-math-fractions-quiz',
      title: 'Grade 5 Fractions Quiz',
      description: 'Test your knowledge of fractions — adding, subtracting, and simplifying.',
      locale,
      subject: 'Mathematics',
      subjectEmoji: '🔢',
      gradeMin: 5,
      gradeMax: 5,
      teacherName: 'Miss Ayesha',
      teacherUsername: 'miss-ayesha',
      activityType: 'quiz',
      activityTypeLabel: 'Quiz',
      playCount: 1842,
      likeCount: 247,
      createdAt: '2024-09-01T00:00:00Z',
      imageUrl: undefined,
      items: [
        { prompt: 'What is ½ + ¼?', answer: '¾' },
        { prompt: 'Simplify 4/8', answer: '½' },
      ],
      relatedActivities: [
        { id: 'grade-5-math-decimals-quiz', title: 'Grade 5 Decimals Quiz', type: 'Quiz' },
        { id: 'grade-5-math-fractions-match', title: 'Fractions Match Up', type: 'Match Up' },
      ],
    },
  }

  return mockActivities[id] ?? null
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string; id: string }
}): Promise<Metadata> {
  const activity = await getActivity(params.id, params.locale)
  if (!activity) return {}

  return generatePageMetadata({
    template: 'T4',
    locale: params.locale,
    activityId: activity.id,
    activityTitle: activity.title,
    activityDescription: activity.description,
    subjectLabel: activity.subject,
    teacherName: activity.teacherName,
    imageUrl: activity.imageUrl,
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ActivityPage({
  params,
}: {
  params: { locale: string; id: string }
}) {
  const activity = await getActivity(params.id, params.locale)
  if (!activity) notFound()

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'
  const pageUrl = `${base}/${params.locale}/activity/${activity.id}`

  const activitySchema = generateActivitySchema({
    id: activity.id,
    title: activity.title,
    description: activity.description,
    locale: params.locale,
    subject: activity.subject,
    gradeMin: activity.gradeMin,
    gradeMax: activity.gradeMax,
    teacherName: activity.teacherName,
    teacherUsername: activity.teacherUsername,
    activityType: activity.activityType,
    playCount: activity.playCount,
    createdAt: activity.createdAt,
    imageUrl: activity.imageUrl,
  })

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: `${base}/${params.locale}` },
    { name: activity.subject, url: `${base}/${params.locale}/activities` },
    { name: activity.title, url: pageUrl },
  ])

  const shareUrl = encodeURIComponent(pageUrl)
  const shareTitle = encodeURIComponent(activity.title)

  return (
    <>
      <JsonLd data={activitySchema} />
      <JsonLd data={breadcrumbSchema} />

      <main
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '1.5rem 1rem',
          color: 'var(--color-text-primary)',
        }}
      >
        <Breadcrumb
          items={[
            { label: 'Home', href: `/${params.locale}` },
            { label: activity.subject, href: `/${params.locale}/activities` },
            { label: activity.title },
          ]}
        />

        {/* Activity header */}
        <article aria-labelledby="activity-title">
          <header
            style={{
              padding: '2rem',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.625rem',
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span aria-hidden="true">{activity.subjectEmoji}</span>
                {activity.subject}
              </span>
              <span
                style={{
                  padding: '0.25rem 0.625rem',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                }}
              >
                {activity.activityTypeLabel}
              </span>
              <span
                style={{
                  padding: '0.25rem 0.625rem',
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                Grade {activity.gradeMin}{activity.gradeMin !== activity.gradeMax ? `–${activity.gradeMax}` : ''}
              </span>
            </div>

            <h1
              id="activity-title"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              {activity.title}
            </h1>

            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              {activity.description}
            </p>

            {/* Stats */}
            <div
              style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}
              aria-label="Activity statistics"
            >
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                ▶ {activity.playCount.toLocaleString()} plays
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                ❤️ {activity.likeCount.toLocaleString()} likes
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                📋 {activity.items.length} questions
              </span>
            </div>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a
                href={`/${params.locale}/activity/${activity.id}/play`}
                style={{
                  padding: '0.875rem 1.75rem',
                  background: 'var(--gradient-btn)',
                  color: '#fff',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}
                aria-label={`Play ${activity.title}`}
              >
                ▶ Play Now
              </a>
              <a
                href={`/${params.locale}/create?copy=${activity.id}`}
                style={{
                  padding: '0.875rem 1.25rem',
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-primary)',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  fontWeight: 600,
                  border: '2px solid var(--color-primary)',
                }}
              >
                📋 Copy &amp; Edit
              </a>
            </div>
          </header>

          {/* Teacher attribution */}
          <section
            style={{
              padding: '1rem 1.25rem',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-card)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
            aria-label="Activity creator"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {activity.teacherName.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {activity.teacherName}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Activity creator
                </div>
              </div>
            </div>
            <a
              href={`/${params.locale}/teacher/${activity.teacherUsername}`}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--color-surface-alt)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: '1px solid var(--color-border)',
              }}
            >
              View profile →
            </a>
          </section>

          {/* Social share */}
          <section
            style={{ marginBottom: '2rem' }}
            aria-labelledby="share-heading"
          >
            <h2
              id="share-heading"
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '0.5rem',
              }}
            >
              Share this activity
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                {
                  label: 'Share on Twitter',
                  href: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
                  icon: '𝕏',
                },
                {
                  label: 'Share on WhatsApp',
                  href: `https://wa.me/?text=${shareTitle}%20${shareUrl}`,
                  icon: '💬',
                },
                {
                  label: 'Copy link',
                  href: pageUrl,
                  icon: '🔗',
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
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
                  <span aria-hidden="true">{s.icon}</span>
                  {s.label.replace('Share on ', '')}
                </a>
              ))}
            </div>
          </section>

          {/* More like this */}
          {activity.relatedActivities.length > 0 && (
            <section aria-labelledby="related-heading">
              <h2
                id="related-heading"
                style={{
                  fontSize: '1.25rem',
                  fontFamily: 'var(--font-display)',
                  marginBottom: '1rem',
                  color: 'var(--color-text-primary)',
                }}
              >
                More like this
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '1rem',
                }}
                role="list"
              >
                {activity.relatedActivities.map((rel) => (
                  <a
                    key={rel.id}
                    href={`/${params.locale}/activity/${rel.id}`}
                    role="listitem"
                    style={{
                      display: 'block',
                      padding: '1rem 1.25rem',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius)',
                      textDecoration: 'none',
                      color: 'var(--color-text-primary)',
                      boxShadow: 'var(--shadow-card)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                        marginBottom: '0.25rem',
                      }}
                    >
                      {rel.type}
                    </div>
                    <div style={{ fontWeight: 500 }}>{rel.title}</div>
                  </a>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
    </>
  )
}
