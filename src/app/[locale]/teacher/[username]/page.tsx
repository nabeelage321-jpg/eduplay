import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { generatePageMetadata } from '@/lib/seo/metadata'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { generateTeacherSchema } from '@/lib/seo/schema'

// ─── ISR: revalidate every 1 hour ────────────────────────────────────────────
export const revalidate = 3600

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeacherProfile {
  username: string
  name: string
  bio: string
  country: string
  countryFlag: string
  totalActivities: number
  totalPlays: number
  joinedAt: string
  avatarUrl?: string
  subjects: string[]
  publicActivities: {
    id: string
    title: string
    type: string
    typeIcon: string
    subject: string
    playCount: number
    likeCount: number
  }[]
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getTeacherProfile(username: string): Promise<TeacherProfile | null> {
  // In production, query Supabase for real teacher data via ISR.
  const mock: Record<string, TeacherProfile> = {
    'miss-ayesha': {
      username: 'miss-ayesha',
      name: 'Miss Ayesha',
      bio: 'Primary school teacher from Lahore. Creating fun, interactive activities for Grades 3–6.',
      country: 'Pakistan',
      countryFlag: '🇵🇰',
      totalActivities: 47,
      totalPlays: 12_430,
      joinedAt: '2024-08-01T00:00:00Z',
      subjects: ['Mathematics', 'Science', 'Urdu'],
      publicActivities: [
        {
          id: 'grade-5-math-fractions-quiz',
          title: 'Grade 5 Fractions Quiz',
          type: 'Quiz',
          typeIcon: '❓',
          subject: 'Mathematics',
          playCount: 1842,
          likeCount: 247,
        },
        {
          id: 'grade-4-science-animals-match',
          title: 'Grade 4 Animals Match Up',
          type: 'Match Up',
          typeIcon: '🔗',
          subject: 'Science',
          playCount: 956,
          likeCount: 134,
        },
        {
          id: 'urdu-alphabet-flashcards',
          title: 'Urdu Alphabet Flashcards',
          type: 'Flashcards',
          typeIcon: '🃏',
          subject: 'Urdu',
          playCount: 2_103,
          likeCount: 389,
        },
      ],
    },
  }

  return mock[username] ?? null
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { locale: string; username: string }
}): Promise<Metadata> {
  const teacher = await getTeacherProfile(params.username)
  if (!teacher) return {}

  return generatePageMetadata({
    template: 'T7',
    locale: params.locale,
    username: teacher.username,
    teacherName: teacher.name,
    activityCount: teacher.totalActivities,
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TeacherProfilePage({
  params,
}: {
  params: { locale: string; username: string }
}) {
  const teacher = await getTeacherProfile(params.username)
  if (!teacher) notFound()

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay.app'

  const teacherSchema = generateTeacherSchema({
    username: teacher.username,
    name: teacher.name,
    locale: params.locale,
    activityCount: teacher.totalActivities,
    totalPlays: teacher.totalPlays,
    country: teacher.country,
    avatarUrl: teacher.avatarUrl,
  })

  return (
    <>
      <JsonLd data={teacherSchema} />

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
            { label: 'Teachers', href: `/${params.locale}/activities` },
            { label: teacher.name },
          ]}
        />

        {/* Profile header */}
        <section
          style={{
            padding: '2rem',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            marginBottom: '2rem',
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
          aria-labelledby="teacher-name"
        >
          {/* Avatar */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--gradient-btn)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: '2rem',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {teacher.name.charAt(0)}
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1
              id="teacher-name"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text-primary)',
                marginBottom: '0.25rem',
              }}
            >
              {teacher.name}
            </h1>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                <span aria-hidden="true">{teacher.countryFlag}</span> {teacher.country}
              </span>
              <span style={{ color: 'var(--color-border)' }} aria-hidden="true">·</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Member since {new Date(teacher.joinedAt).getFullYear()}
              </span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              {teacher.bio}
            </p>

            {/* Subjects */}
            <div
              style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}
              aria-label="Subjects taught"
            >
              {teacher.subjects.map((sub) => (
                <span
                  key={sub}
                  style={{
                    padding: '0.25rem 0.625rem',
                    background: 'var(--color-surface-alt)',
                    color: 'var(--color-text-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {sub}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
          role="list"
          aria-label="Teacher statistics"
        >
          {[
            { label: 'Activities created', value: teacher.totalActivities.toLocaleString() },
            { label: 'Total plays', value: teacher.totalPlays.toLocaleString() },
            { label: 'Subjects', value: teacher.subjects.length },
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
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Public activities */}
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
            {teacher.name}&apos;s Activities
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
            role="list"
            aria-label={`Activities by ${teacher.name}`}
          >
            {teacher.publicActivities.map((activity) => (
              <a
                key={activity.id}
                href={`/${params.locale}/activity/${activity.id}`}
                role="listitem"
                style={{
                  display: 'block',
                  padding: '1.25rem',
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span aria-hidden="true">{activity.typeIcon}</span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                    }}
                  >
                    {activity.type}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginInlineStart: 'auto',
                    }}
                  >
                    {activity.subject}
                  </span>
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: '0.75rem',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {activity.title}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span>▶ {activity.playCount.toLocaleString()}</span>
                  <span>❤️ {activity.likeCount.toLocaleString()}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
