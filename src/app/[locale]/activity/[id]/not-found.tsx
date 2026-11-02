'use client'

// Segment not-found for /[locale]/activity/[id].
// Before this file existed, a real-but-unmocked id (i.e. every live
// activity) hit notFound() in the detail page with no not-found boundary
// anywhere in the app, and Back/✕ navigation from the play page surfaced
// as "Application error: a client-side exception has occurred" instead of
// a page. Existing rows now render via the detail page itself; this only
// covers genuinely missing ids, with a plain message and a way back.
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function ActivityNotFound() {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'

  return (
    <main
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '3rem 1rem',
        textAlign: 'center',
        color: 'var(--color-text-primary)',
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>😕</div>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
        Activity Not Found
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
        This game could not be found. Check the link and try again.
      </p>
      <Link
        href={`/${locale}/activities`}
        style={{
          padding: '0.875rem 1.75rem',
          background: 'var(--gradient-btn)',
          color: '#fff',
          borderRadius: 'var(--radius)',
          textDecoration: 'none',
          fontWeight: 700,
        }}
      >
        ← Browse Activities
      </Link>
    </main>
  )
}
