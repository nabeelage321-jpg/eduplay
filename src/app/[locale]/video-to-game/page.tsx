import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import type { SupportedLocale } from '@/types'

// Lazy-loaded like /create does: the video box only loads when this
// page opens, so the first paint stays light.
const VideoToGameClient = dynamic(() => import('@/components/creator/VideoToGameClient'), { ssr: false })

interface Props {
  params: { locale: SupportedLocale }
}

export const metadata: Metadata = {
  title: 'Make a Game from Your Video — EduPlay',
  description: 'Paste the link of your own public YouTube video and get an editable game draft about what it teaches. Nothing is published until you save it yourself.',
  robots: { index: false },
}

/**
 * VIDEO-TO-GAME PAGE v1 (owner order 2026-11-07).
 * A creator pastes the link of THEIR OWN public YouTube video;
 * Gemini reads it and makes an editable Quiz draft. The video is
 * link-only — never downloaded, stored, or re-uploaded — and the
 * game links back to it. It renders the VideoToGameClient (same
 * editable draft + approve flow as prompt-to-game: approval hands
 * the draft to /create through the sessionStorage key that
 * ActivityCreator reads once on mount).
 * Tool page: noindex (like /make, /create, and /prompt-to-game),
 * NOT in sitemap.xml.
 */
export default function VideoToGamePage({ params }: Props) {
  const isRTL = params.locale === 'ur' || params.locale === 'ar'
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <div style={{ padding: '1.5rem 0.5rem' }}>
        <VideoToGameClient locale={params.locale} />
      </div>
    </div>
  )
}
