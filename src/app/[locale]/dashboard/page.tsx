import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { createServerClient } from '@/lib/supabase/server'
import type { SupportedLocale } from '@/types'

interface Props {
  params: { locale: SupportedLocale }
}

export const metadata: Metadata = {
  title: 'Dashboard — EduPlay',
  description: 'Your EduPlay dashboard: the activities you created, with links to create and play.',
  robots: { index: false },
}

interface MyActivity {
  id: string
  title: string
  type: string | null
  subject: string | null
  grade: string | null
  is_public: boolean | null
  created_at: string | null
}

// DASHBOARD BATCH 2026-10-30. The Navbar has linked to /[locale]/dashboard
// since the UI batch, but no route existed, so the link 404'd. This is the
// minimal functional version: signed-in user's own activities only.
// Honesty rules for this page:
//   * No invented stats — the only number shown is the real count of the
//     signed-in user's activities returned by the database query below.
//   * The activities query needs migration 005 (activities.teacher_id).
//     Until the owner runs it, the query errors and the page says so
//     plainly instead of showing an empty list as if the user had created
//     nothing. Same for a missing public.users row (migration 004).
//   * Programme games (teacher_id NULL) never appear here: they belong to
//     no user, and the PUT/DELETE ownership check protects them.
export default async function DashboardPage({ params }: Props) {
  const locale = params.locale
  const sessionUser = await resolveSessionUser()
  if (!sessionUser) {
    redirect(`/${locale}/login`)
  }

  let activities: MyActivity[] = []
  let myCount: number | null = null
  let listUnavailable = false

  if (!sessionUser.userId) {
    listUnavailable = true
  } else {
    const supabase = createServerClient()
    const { data, error, count } = await supabase
      .from('activities')
      .select('id, title, type, subject, grade, is_public, created_at', { count: 'exact' })
      .eq('teacher_id', sessionUser.userId)
      .order('created_at', { ascending: false })
      .range(0, 49)
    if (error) {
      listUnavailable = true
    } else {
      activities = (data ?? []) as MyActivity[]
      myCount = count ?? activities.length
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <div className="container-page" style={{ padding: '2rem 1rem' }}>
        <h1 className="heading-display" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Signed in as {sessionUser.email}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <Link href={`/${locale}/create`} className="btn-primary" style={{ padding: '0.6rem 1.2rem' }}>
            Create a game
          </Link>
          <Link href={`/${locale}/browse`} className="btn-ghost" style={{ padding: '0.6rem 1.2rem' }}>
            Browse games
          </Link>
        </div>

        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          My activities{myCount !== null ? ` (${myCount})` : ''}
        </h2>

        {listUnavailable ? (
          <p style={{ color: 'var(--color-text-muted)' }}>
            Your activities list is not available yet. It needs the owner-run
            database setup (migrations 004 and 005) before your created games
            can be listed here. Creating and browsing still work from the
            links above once sign-in is configured.
          </p>
        ) : activities.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>
            You have not created any games yet. Use &ldquo;Create a game&rdquo;
            above to make your first one.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
            {activities.map((activity) => (
              <li
                key={activity.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                }}
              >
                <Link
                  href={`/${locale}/play/${activity.id}`}
                  style={{ fontWeight: 700, textDecoration: 'none', color: 'var(--color-primary)' }}
                >
                  {activity.title}
                </Link>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                  {[activity.type, activity.subject, activity.grade].filter(Boolean).join(' · ')}
                  {activity.is_public === false ? ' · Private' : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
