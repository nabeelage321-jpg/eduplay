import type { Metadata } from 'next'
import ReportView from '@/components/game/ReportView'

// Public teacher report (Reports v1, master list part 5). A report URL
// carries one session PIN, not a browseable page, so it is kept out
// of search results — exactly like the /challenge view route.
export const metadata: Metadata = {
  title: 'Session report | EduPlay',
  description: 'Per-student results and a class summary for one EduPlay live session.',
  robots: { index: false },
}

interface ReportPageProps {
  params: { locale: string }
  searchParams: Record<string, string | string[] | undefined>
}

export default function ReportPage({ searchParams }: ReportPageProps) {
  const rawPin = searchParams.pin
  const pin = Array.isArray(rawPin) ? rawPin[0] ?? '' : rawPin ?? ''
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }} role="main">
      {pin.trim() ? (
        <ReportView pin={pin} />
      ) : (
        <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1rem' }}>
          <p style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)' }}>
            📊 Teacher report
          </p>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>
            Session report
          </h1>
          <p style={{ marginTop: '1rem', fontWeight: 600 }}>
            This link has no PIN, so no report can be shown. Open a report from a challenge
            view&apos;s &ldquo;View report&rdquo; link.
          </p>
        </div>
      )}
    </div>
  )
}
