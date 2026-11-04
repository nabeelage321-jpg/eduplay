import type { Metadata } from 'next'
import VideoModeClient from './VideoModeClient'

// VERTICAL VIDEO MODE (2026-11-04, master-list section C): a mode
// variant of a game's play page, not a new game and not a new
// indexed page — noindex, so the mode variant never competes with
// the game's own page in search. The original game is never mutated.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function VideoModePage({ params }: { params: { locale: string; id: string } }) {
  return <VideoModeClient locale={params.locale} id={params.id} />
}
