import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { generatePageMetadata } from '@/lib/seo/metadata'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import ActivityIdLine from '@/components/activity-types/ActivityIdLine'
import PrintWorksheetButton from '@/components/activities/PrintWorksheetButton'
import ConvertToType from '@/components/activity-types/ConvertToType'
import HostLiveGame from '@/components/game/HostLiveGame'
import ChallengeMaker from '@/components/game/ChallengeMaker'
import ApprovalStatusBox from '@/components/game/ApprovalStatusBox'
import { generateActivitySchema, generateBreadcrumbSchema } from '@/lib/seo/schema'
import { createServerClient } from '@/lib/supabase/server'
import { adaptActivityItems, dbTypeOf, playerTypeKey } from '@/lib/activity-content'
import { FILTER_GRADES, FILTER_SUBJECTS } from '@/lib/filters'
import { curriculumTagLabel, resolveCurriculumTag } from '@/lib/curricula'

// ─── Dynamic: teacher games are user content, not ISR material ───────────────
export const dynamic = 'force-dynamic'
// The old page was a Phase-5 scaffold: getActivity() only knew ONE hardcoded
// mock id, so EVERY real activity (programme or teacher-saved) hit notFound()
// here — which is what the ✕/Back navigation from the play page landed on
// for the teacher-saved Table of 2 (2026-11-02). force-dynamic also keeps
// the build's page-data collection from querying Supabase with placeholder
// env. The page now reads the same live row /api/activities/[id] serves.

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityData {
  id: string
  title: string
  description: string
  locale: string
  subject: string
  subjectEmoji: string
  gradeLabel: string
  gradeMin?: number
  gradeMax?: number
  // Resolved from public.users (migration 004) when the row has a
  // teacher_id; null when unknown — never an invented name or profile.
  teacherName: string | null
  teacherUsername: string | null
  activityType: string
  activityTypeLabel: string
  playCount: number
  // No like_count column exists on activities (migration 001), so a DB
  // row honestly has no like number; the chip is hidden, not shown as 0.
  likeCount?: number
  createdAt: string
  imageUrl?: string
  items: { prompt: string; answer: string }[]
  relatedActivities: { id: string; title: string; type: string }[]
  // Print audience (2026-11-04 print v1): true unless the row's
  // is_public is exactly false — the same rule the play page uses
  // for its private-game gate. The print button uses this, never
  // the row's questions, to decide who may print.
  isPublic: boolean
  // WORLDWIDE CURRICULUM v1 (2026-11-04): the mandatory not-official
  // label for a syllabus-tagged game, resolved from the seed. Null =
  // General (no syllabus claim) — no label is shown at all.
  curriculumLabel: string | null
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function typeLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

const getActivity = cache(async (id: string, locale: string): Promise<ActivityData | null> => {
  // The one scaffold demo id keeps rendering exactly as before.
  const mockActivities: Record<string, ActivityData> = {
    'grade-5-math-fractions-quiz': {
      id: 'grade-5-math-fractions-quiz',
      title: 'Grade 5 Fractions Quiz',
      description: 'Test your knowledge of fractions — adding, subtracting, and simplifying.',
      locale,
      subject: 'Mathematics',
      subjectEmoji: '🔢',
      gradeLabel: 'Grade 5',
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
      curriculumLabel: null,
      isPublic: true,
    },
  }
  if (mockActivities[id]) return mockActivities[id]

  // Real rows: the same live `activities` row /api/activities/[id]
  // returns, read through the SAME shared adapter the play page uses,
  // so detail and play can never disagree about whether a game has
  // items. Every field is guarded: a missing or differently-shaped
  // column yields a blank/default, never a thrown exception.
  try {
    const supabase = createServerClient()
    const { data: row, error } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !row) return null

    const type = dbTypeOf(row as { type?: string; type_id?: string })
    const items = adaptActivityItems(row as { type?: string; type_id?: string; content?: unknown })

    const subjectDb = str((row as Record<string, unknown>).subject)
    const subjectLabel = FILTER_SUBJECTS.find((s) => s.value === subjectDb)?.label ?? subjectDb
    const gradeDb = str((row as Record<string, unknown>).grade)
    const gradeLabel = FILTER_GRADES.find((g) => g.value === gradeDb)?.label ?? gradeDb
    const gradeNum = /^grade-(\d+)$/.exec(gradeDb)?.[1]
    const gradeMin = gradeNum ? parseInt(gradeNum, 10) : undefined

    let teacherName: string | null = null
    const teacherId = str((row as Record<string, unknown>).teacher_id)
    if (teacherId) {
      const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', teacherId)
        .single()
      teacherName = str((user as { name?: unknown } | null)?.name) || null
    }

    // WORLDWIDE CURRICULUM v1 (2026-11-04): the syllabus tag lives in
    // content.curriculum (written by POST /api/activities, validated
    // against the seed). Re-validated here, so a hand-edited row can
    // never display a syllabus label it did not earn. General games
    // carry no tag and show no label at all.
    const content = (row as Record<string, unknown>).content as
      | { curriculum?: { countryCode?: unknown; syllabusSlug?: unknown } }
      | null
      | undefined
    const curriculumLabel = curriculumTagLabel(
      resolveCurriculumTag(content?.curriculum?.countryCode, content?.curriculum?.syllabusSlug)
    )

    return {
      id: str((row as Record<string, unknown>).id) || id,
      title: str((row as Record<string, unknown>).title) || 'Untitled activity',
      description: str((row as Record<string, unknown>).description),
      curriculumLabel,
      locale,
      subject: subjectLabel,
      subjectEmoji: '',
      gradeLabel,
      gradeMin,
      gradeMax: gradeMin,
      teacherName,
      teacherUsername: null,
      activityType: type,
      activityTypeLabel: typeLabel(type),
      playCount: typeof (row as Record<string, unknown>).play_count === 'number'
        ? (row as Record<string, unknown>).play_count as number
        : 0,
      createdAt: str((row as Record<string, unknown>).created_at),
      imageUrl: undefined,
      items,
      relatedActivities: [],
      isPublic: (row as Record<string, unknown>).is_public !== false,
    }
  } catch {
    return null
  }
})

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
    teacherName: activity.teacherName ?? 'an EduPlay teacher',
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

  const activitySchema = activity.teacherUsername
    ? generateActivitySchema({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        locale: params.locale,
        subject: activity.subject,
        gradeMin: activity.gradeMin,
        gradeMax: activity.gradeMax,
        teacherName: activity.teacherName ?? 'EduPlay teacher',
        teacherUsername: activity.teacherUsername,
        activityType: activity.activityType,
        playCount: activity.playCount,
        createdAt: activity.createdAt,
        imageUrl: activity.imageUrl,
      })
    : null

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: `${base}/${params.locale}` },
    { name: activity.subject, url: `${base}/${params.locale}/activities` },
    { name: activity.title, url: pageUrl },
  ])

  const shareUrl = encodeURIComponent(pageUrl)
  const shareTitle = encodeURIComponent(activity.title)

  return (
    <>
      {activitySchema ? <JsonLd data={activitySchema} /> : null}
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
              {activity.gradeLabel ? (
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
                  {activity.gradeLabel}
                </span>
              ) : null}
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

            {/* TEACHER-ID BATCH 2026-11-02: the id was only in the URL.
                Detail page keeps the e6cea592 live-row adapter untouched;
                this only renders the page's own id under the title. */}
            <div style={{ marginBottom: '1rem' }}>
              <ActivityIdLine id={activity.id} />
            </div>

            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              {activity.description}
            </p>

            {activity.curriculumLabel && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                🌍 {activity.curriculumLabel}
              </p>
            )}

            {/* Stats */}
            <div
              style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}
              aria-label="Activity statistics"
            >
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                ▶ {activity.playCount.toLocaleString()} plays
              </span>
              {activity.likeCount !== undefined ? (
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  ❤️ {activity.likeCount.toLocaleString()} likes
                </span>
              ) : null}
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                📋 {activity.items.length} items
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
              {/* PRINT WORKSHEET v1 (2026-11-04): the detail-page
                  print control, beside Play / Copy & Edit. It only
                  renders a button for printable types, and for a
                  private game only for its owner (proven client-side
                  via /api/my-activities, like HostLiveGame); a
                  non-printable type renders a plain note instead.
                  The detail page itself never renders item contents,
                  so this button is the only print path from here. */}
              {/* VERTICAL VIDEO MODE v1 (2026-11-04, section C):
                  a link only — no item data is rendered here. The
                  mode page itself gates private games to their owner
                  and Quiz games only; other types get a plain
                  message there, never a forced video. */}
              {activity.items.length > 0 ? (
                <a
                  href={`/${params.locale}/activity/${activity.id}/video`}
                  style={{
                    padding: '0.875rem 1.25rem',
                    background: 'var(--color-surface-alt)',
                    color: 'var(--color-primary)',
                    borderRadius: 'var(--radius)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    border: '2px solid var(--color-primary)',
                  }}
                  aria-label={`Open ${activity.title} in vertical video mode`}
                >
                  📱 Vertical video
                </a>
              ) : null}
              {activity.items.length > 0 ? (
                <PrintWorksheetButton
                  activity={{
                    id: activity.id,
                    title: activity.title,
                    type_id: playerTypeKey(activity.activityType),
                    locale: params.locale,
                    teacher_id: '',
                    is_public: activity.isPublic,
                    items: activity.items,
                    created_at: activity.createdAt,
                    updated_at: activity.createdAt,
                  }}
                  isPublic={activity.isPublic}
                />
              ) : null}
            </div>
            {activity.items.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', marginTop: '1rem', marginBottom: 0 }}>
                This activity has no items yet.
              </p>
            ) : null}
          </header>

          {/* PLAY AS ANOTHER TYPE (convert, 2026-11-04): links only —
              no item data is rendered here, so this section cannot leak
              a game's questions. Picking a type goes to the play page
              with ?as=<type>, where compatibility is decided and the
              same questions are played in that type's existing player
              (or a plain cannot-play message is shown). A game with
              no items gets no control — there is nothing to convert. */}
          {activity.items.length > 0 ? (
            <ConvertToType
              locale={params.locale}
              activityId={activity.id}
              originalSlug={playerTypeKey(activity.activityType)}
              currentTarget={null}
            />
          ) : null}

          {/* ONE-CLICK HOST 2026-11-03: one click from this page creates
              the live room and shows the code + share + leaderboard on
              this same page. The component itself only renders for the
              signed-in teacher who owns this game (checked against
              /api/my-activities); everyone else sees nothing here. */}
          <HostLiveGame activityId={activity.id} locale={params.locale} activityTitle={activity.title} />

          {/* CHALLENGE MAKER v1 (2026-11-04, link-only): builds a shareable
              challenge link (game + PIN + optional group + deadline) for
              this game. The component itself only renders for the signed-in
              teacher who owns this game; everyone else sees nothing here.
              No server persistence in v1 — see src/lib/challenges.ts. */}
          <ChallengeMaker activityId={activity.id} locale={params.locale} activityTitle={activity.title} />

          {/* KIDS SOCIAL APPROVAL v1 (2026-11-04): owner box (pending
              count + test link, published, removed) for a student-gated
              game, plus the teacher/parent Remove button on a live
              student-gated game. Renders nothing for everyone else —
              teachers/creators see nothing here, and the component
              never decides: the server routes enforce every rule. */}
          <ApprovalStatusBox activityId={activity.id} locale={params.locale} />

          {/* Teacher attribution — only when a real name resolved;
              no invented name, no profile link without a username. */}
          {activity.teacherName ? (
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
              {activity.teacherUsername ? (
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
              ) : null}
            </section>
          ) : null}

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
