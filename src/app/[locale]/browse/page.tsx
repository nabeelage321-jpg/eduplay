import { Suspense } from 'react'
import { BrowseClient } from './BrowseClient'

export const metadata = {
  title: 'Browse Educational Games | EduPlay',
  description: 'Browse and play interactive educational games for all grades',
}

export default function BrowsePage({ params }: { params: { locale: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading games…</div>}>
      <BrowseClient locale={params.locale} />
    </Suspense>
  )
}
