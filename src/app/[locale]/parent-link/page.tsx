import type { Metadata } from 'next'
import ParentLinkAccept from '@/components/dashboard/ParentLinkAccept'

// Parent invite acceptance (kids social approval v1). An invite link is
// a shareable URL, not a browseable page, so it is kept out of search
// results — exactly like the /test and /challenge views.
export const metadata: Metadata = {
  title: 'Parent invite | EduPlay',
  description: 'Accept a kid creator\'s parent invite on EduPlay.',
  robots: { index: false },
}

interface ParentLinkPageProps {
  params: { locale: string }
  searchParams: Record<string, string | string[] | undefined>
}

export default function ParentLinkPage({ params, searchParams }: ParentLinkPageProps) {
  const raw = searchParams.code
  const code = typeof raw === 'string' ? raw : ''
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }} role="main">
      <ParentLinkAccept code={code} locale={params.locale} />
    </div>
  )
}
