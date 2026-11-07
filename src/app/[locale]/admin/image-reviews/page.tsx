import { Metadata } from 'next'
import { resolveSessionUser } from '@/lib/auth/session-user'
import { isImageReviewer } from '@/lib/image-approval'
import ImageReviewQueue from '@/components/admin/ImageReviewQueue'
import type { SupportedLocale } from '@/types'

// IMAGE REVIEW QUEUE (owner order 2026-11-07 13:19 PKT): the owner
// personally approves or rejects every picture. Only role 'admin'
// (set once in the DB — see migration 012) may open this page.

export const metadata: Metadata = {
  title: 'Review pictures — EduPlay',
  robots: { index: false },
}

export default async function ImageReviewsPage({ params }: { params: { locale: SupportedLocale } }) {
  const isRTL = params.locale === 'ur' || params.locale === 'ar'
  let allowed = false
  try {
    const sessionUser = await resolveSessionUser()
    allowed = isImageReviewer(sessionUser?.role ?? null)
  } catch {
    allowed = false
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)', padding: '1.5rem 0.5rem' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', margin: '0 0 0.25rem' }}>
          🖼️ Review pictures
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
          Every picture a teacher adds waits here until you approve or reject it. No picture goes
          public without your approval — a game with a pending picture stays private.
        </p>
        {allowed ? (
          <ImageReviewQueue locale={params.locale} />
        ) : (
          <p style={{ color: 'var(--color-text-muted)' }}>
            Only the EduPlay owner can review pictures. If this is your account, set your role to
            “admin” in the database (see migration 012) and come back.
          </p>
        )}
      </div>
    </div>
  )
}
